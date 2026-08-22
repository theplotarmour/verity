"use server";

import prisma from "@/lib/prisma";
import { phoneKey } from "@/lib/phone";
import { publish } from "@/platform/events/publish";
import { freeSlots, isSlotFree, istWallClock, normaliseSlotRules } from "@/lib/slots";
import { resolvePortalTenant } from "@/server/internal/portal";
import { ingestExternalOrder } from "@/server/internal/orderIngest";
import { hasModule } from "@/platform/modules/entitlements";
import { LIVE_APPOINTMENT_STATUSES } from "@/lib/booking";

/**
 * The public portal's endpoints.
 *
 * Everything here runs without a session, which changes what "guarded" means.
 * The rules, in every function below:
 *
 *  - the tenant comes from the slug in the URL and nowhere else. No caller ever
 *    supplies a `factoryId`;
 *  - `resolvePortalTenant` re-checks the module entitlement on every call, not
 *    just when the page rendered. Turning `booking` off in HQ has to close the
 *    write path, not only hide the link;
 *  - the item and the staff member are re-read from the database and re-priced
 *    server-side. A price or a service name posted from a form is a suggestion,
 *    never the record;
 *  - availability is re-checked against the same `freeSlots` rule the grid was
 *    drawn from, because between rendering a grid and submitting it somebody
 *    else may have taken the slot.
 */

type PortalResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { error: string };

export interface PortalStaff {
  id: string;
  name: string;
}

/** Staff a customer may pick, for the tenant behind `slug`. */
export async function getPortalStaff(slug: string): Promise<PortalStaff[]> {
  const tenant = await resolvePortalTenant(slug, "booking");
  if (!tenant) return [];

  /*
   * Everyone active in the workspace, matching the owner-side picker. A salon
   * where the owner also cuts hair is the normal case, so filtering to a
   * "worker" role would hide the one person a customer wants to book.
   */
  return prisma.user.findMany({
    where: { factoryId: tenant.factoryId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * The free slot starts for one staff member on one IST day.
 *
 * The working window comes from the roster: the shifts that person is scheduled
 * on that date. No schedule means no slots, which is the honest answer — a
 * portal that offers times nobody is rostered for books customers in to an
 * empty shop.
 */
export async function getPortalSlots(
  slug: string,
  staffId: string,
  dayKey: string,
): Promise<string[]> {
  const tenant = await resolvePortalTenant(slug, "booking");
  if (!tenant) return [];

  const staff = await prisma.user.findFirst({
    where: { id: staffId, factoryId: tenant.factoryId, isActive: true },
    select: { id: true },
  });
  if (!staff) return [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return [];
  const [y, m, d] = dayKey.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(y, m - 1, d));

  const factory = await prisma.factory.findUnique({
    where: { id: tenant.factoryId },
    select: { settings: true },
  });
  const rules = normaliseSlotRules((factory?.settings as { booking?: unknown } | null)?.booking);

  const [schedules, booked] = await Promise.all([
    prisma.shiftSchedule.findMany({
      where: {
        factoryId: tenant.factoryId,
        userId: staff.id,
        date: calendarDate,
        status: { not: "CANCELLED" },
      },
      select: { shift: { select: { startTime: true, endTime: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        factoryId: tenant.factoryId,
        staffId: staff.id,
        status: { in: LIVE_APPOINTMENT_STATUSES },
        // A whole IST day either side, so a shift running past midnight and the
        // bookings inside it are both in range.
        startTime: {
          gte: new Date(calendarDate.getTime() - 24 * 3600_000),
          lt: new Date(calendarDate.getTime() + 48 * 3600_000),
        },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const ranges = booked.map((b) => ({ start: b.startTime, end: b.endTime }));

  const starts = schedules.flatMap((s) => {
    const from = istWallClock(dayKey, s.shift.startTime);
    let to = istWallClock(dayKey, s.shift.endTime);
    if (!from || !to) return [];
    // A shift that ends before it starts crosses midnight; carry it to the
    // next day rather than producing an empty window.
    if (to <= from) to = new Date(to.getTime() + 24 * 3600_000);
    return freeSlots(from, to, ranges, rules);
  });

  // Two shifts in a day can overlap at the join; one slot start, once.
  return [...new Set(starts.map((s) => s.toISOString()))].sort();
}

export interface PortalBookingInput {
  slug: string;
  serviceId: string;
  staffId: string;
  /** ISO instant, taken from `getPortalSlots`. */
  startTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}

/** Book an appointment from the public portal. */
export async function createPortalBooking(
  input: PortalBookingInput,
): Promise<PortalResult<{ id: string }>> {
  const tenant = await resolvePortalTenant(input.slug, "booking");
  if (!tenant) return { error: "This booking page is not available." };

  const customerName = input.customerName?.trim();
  const phone = input.customerPhone?.trim();
  if (!customerName) return { error: "Please enter your name." };
  if (!phone || phoneKey(phone).length < 8) {
    return { error: "Please enter a phone number we can reach you on." };
  }

  // The service is re-read and re-priced here. What the form posted is which
  // row was picked, not what it costs.
  const service = await prisma.product.findFirst({
    where: {
      id: input.serviceId,
      factoryId: tenant.factoryId,
      isPublished: true,
      status: "ACTIVE",
      itemType: "SERVICE",
    },
    select: { id: true, name: true, pricePaise: true },
  });
  if (!service) return { error: "That service is no longer available." };

  const staff = await prisma.user.findFirst({
    where: { id: input.staffId, factoryId: tenant.factoryId, isActive: true },
    select: { id: true },
  });
  if (!staff) return { error: "That team member is no longer taking bookings." };

  const start = new Date(input.startTime);
  if (Number.isNaN(start.getTime())) return { error: "Pick a time to book." };
  if (start.getTime() < Date.now()) return { error: "That time has already passed." };

  const factory = await prisma.factory.findUnique({
    where: { id: tenant.factoryId },
    select: { settings: true },
  });
  const rules = normaliseSlotRules((factory?.settings as { booking?: unknown } | null)?.booking);
  const end = new Date(start.getTime() + rules.slotMinutes * 60_000);

  /*
   * Re-check availability against the same rule the grid used. This is a
   * last-write-wins check, not a lock: two customers submitting the same slot
   * inside the same millisecond can both pass. That is a deliberate trade —
   * a row lock on every public request is a denial-of-service surface, and a
   * rare double booking is a phone call, which is how salons already resolve
   * them. Revisit if a tenant ever reports one.
   */
  const clashes = await prisma.appointment.findMany({
    where: {
      factoryId: tenant.factoryId,
      staffId: staff.id,
      status: { in: LIVE_APPOINTMENT_STATUSES },
      startTime: { gte: new Date(start.getTime() - 24 * 3600_000), lt: end },
    },
    select: { startTime: true, endTime: true },
  });
  const free = isSlotFree(
    start,
    end,
    clashes.map((c) => ({ start: c.startTime, end: c.endTime })),
    rules,
  );
  if (!free) return { error: "Sorry — that slot was just taken. Please pick another." };

  const created = await prisma.appointment.create({
    data: {
      factoryId: tenant.factoryId,
      customerName,
      customerPhone: phone,
      customerEmail: input.customerEmail?.trim() || null,
      serviceName: service.name,
      pricePaise: service.pricePaise,
      staffId: staff.id,
      startTime: start,
      endTime: end,
      status: "CONFIRMED",
      notes: input.notes?.trim() || null,
    },
    select: { id: true },
  });

  /*
   * CONFIRMED, not PENDING: a customer who picked a slot on a public page has
   * booked, and leaving it pending means the shop has to confirm every walk-up
   * by hand. The owner can still cancel from the book.
   */
  await publish("appointment.confirmed", {
    factoryId: tenant.factoryId,
    appointmentId: created.id,
    customerName,
  });

  return { success: true, id: created.id };
}

export interface PortalCartLine {
  itemId: string;
  quantity: number;
}

export interface PortalOrderInput {
  slug: string;
  customerName: string;
  customerPhone: string;
  /** Table number, pickup name, seat — whatever the shop identifies an order by. */
  reference?: string;
  lines: PortalCartLine[];
}

/**
 * Place an order from the public menu portal.
 *
 * Routed through `ingestExternalOrder`, which is the platform's one way for an
 * order to arrive from outside: it books a DRAFT SalesOrder and enqueues the
 * ORDER_RECEIVED webhook in the same transaction. A customer tapping "order" on
 * a menu is exactly the case that path exists for, and a second write path
 * would mean an order from the portal behaving differently from the same order
 * from a storefront integration.
 *
 * DRAFT is the point. A public page may propose work; somebody in the shop
 * decides it happens.
 */
export async function createPortalOrder(
  input: PortalOrderInput,
): Promise<PortalResult<{ soNumber: string }>> {
  const tenant = await resolvePortalTenant(input.slug, "catalog");
  if (!tenant) return { error: "This menu is not available." };
  // Reading a menu needs `catalog`; recording an order needs the module that
  // owns SalesOrder.
  if (!(await hasModule(tenant.organizationId, "sales"))) {
    return { error: "This shop is not taking online orders." };
  }

  const customerName = input.customerName?.trim();
  const phone = input.customerPhone?.trim();
  if (!customerName) return { error: "Please enter your name." };
  if (!phone || phoneKey(phone).length < 8) {
    return { error: "Please enter a phone number we can reach you on." };
  }

  const wanted = new Map<string, number>();
  for (const line of input.lines ?? []) {
    const qty = Math.floor(Number(line.quantity));
    if (!line.itemId || !Number.isFinite(qty) || qty <= 0) continue;
    // Cap per line so a tampered payload cannot book ten thousand coffees.
    wanted.set(line.itemId, Math.min((wanted.get(line.itemId) ?? 0) + qty, 99));
  }
  if (wanted.size === 0) return { error: "Your order is empty." };

  // Prices come from the catalogue, never from the cart. The client sends which
  // rows and how many; what they cost is ours to say.
  const items = await prisma.product.findMany({
    where: {
      id: { in: [...wanted.keys()] },
      factoryId: tenant.factoryId,
      isPublished: true,
      status: "ACTIVE",
      itemType: "FINISHED_PRODUCT",
    },
    select: { id: true, pricePaise: true },
  });
  if (items.length === 0) return { error: "Those items are no longer available." };

  const result = await ingestExternalOrder(tenant.factoryId, {
    customer: { name: customerName, phone },
    orderType: "RETAIL",
    remarks: input.reference?.trim() ? `Portal order · ${input.reference.trim()}` : "Portal order",
    lines: items.map((item) => ({
      itemId: item.id,
      quantity: wanted.get(item.id) ?? 1,
      // SalesOrderItem.unitPrice is a rupee float, the sales module's existing
      // convention. The catalogue stores paise, so the conversion happens here,
      // once, at the boundary between the two.
      unitPrice: item.pricePaise / 100,
    })),
  });

  return { success: true, soNumber: result.soNumber };
}
