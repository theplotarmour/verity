import "server-only";

import prisma from "@/lib/prisma";
import { phoneKey } from "@/lib/phone";
import { emitEvent, ownerRecipients } from "@/lib/server/events";
import { draftServiceInvoice } from "@/platform/billing/service-invoice";
import { hasModule } from "@/platform/modules/entitlements";
import type { ModuleKey } from "@/platform/modules/registry";
import { on, type EventListener, type EventPayload } from "./bus";

/**
 * Where modules wire their reactions to other modules' events.
 *
 * This is the one file that knows about both sides of a composition, on purpose:
 * the publisher (`helpdesk`) and the reactor (`billing`) stay ignorant of each
 * other, and the edge between them lives here where a whole workflow can be read
 * top to bottom. Adding a step is a registration, not an import in someone else's
 * action.
 *
 * ## What a reaction may assume
 *
 * That the milestone happened, and that `payload.factoryId` is a fact. Nothing
 * else. A reaction has no session — it runs behind work that was already
 * authorised — so it must:
 *
 *  1. scope **every** query by `factoryId`, exactly as an action would;
 *  2. check the entitlement of the module it is about to write into, because the
 *     publisher's pack and the reactor's pack are not the same pack. A facility
 *     tenant without `billing` must not find invoices appearing;
 *  3. be safe to run twice. Emits are best-effort, not exactly-once, so every
 *     reaction that writes a row checks for its own previous write first.
 *
 * Idempotent registration: `registerReactions` is safe to call from every
 * publish, so no workflow depends on which module imported first.
 */

let registered = false;

export function registerReactions(): void {
  if (registered) return;
  registered = true;

  // --- Flow 1: the service / lifestyle day ----------------------------------
  // booking → billing → crm → notifications. The booking action publishes and
  // imports none of the three.
  on("appointment.confirmed", auditAppointment("confirmed"), "core.audit_appointment");
  on("appointment.cancelled", auditAppointment("cancelled"), "core.audit_appointment");
  on("appointment.completed", auditAppointment("completed"), "core.audit_appointment");
  on("appointment.completed", billAppointment, "billing.draft_from_appointment");
  on("appointment.completed", updateSpendProfile, "crm.spend_profile");
  on("appointment.completed", notifyAppointmentServed, "notifications.appointment_served");

  // --- Flow 2: the facility / field maintenance job -------------------------
  // helpdesk → work order → assets → billing → notifications.
  on("ticket.created", notifyTicketRaised, "notifications.ticket_raised");
  on("work_order.dispatched", notifyTechnicianDispatched, "notifications.wo_dispatched");
  on("work_order.completed", logAssetService, "assets.service_ledger");
  on("work_order.completed", billWorkOrder, "billing.draft_from_work_order");
  on("work_order.completed", notifyWorkOrderCompleted, "notifications.wo_completed");
}

// --- Entitlement -----------------------------------------------------------

/**
 * Whether the tenant behind this event runs the module a reaction wants to write
 * into.
 *
 * The payload carries `factoryId` because that is what scopes a row; entitlements
 * hang off the organization. The hop lives here rather than being pushed onto
 * every publisher.
 */
async function tenantHasModule(factoryId: string, moduleKey: ModuleKey): Promise<boolean> {
  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: { organizationId: true },
  });
  if (!factory) return false;
  return hasModule(factory.organizationId, moduleKey);
}

// --- Core: the activity trail ----------------------------------------------

function auditAppointment(kind: string): EventListener {
  return async (payload) => {
    await prisma.auditLog.create({
      data: {
        factoryId: String(payload.factoryId),
        action: `Appointment ${kind}: ${String(payload.customerName ?? "")}`,
        entityType: "Appointment",
        entityId: String(payload.appointmentId ?? ""),
      },
    });
  };
}

// --- Flow 1 ----------------------------------------------------------------

interface AppointmentPayload extends EventPayload {
  appointmentId?: string;
  customerName?: string;
}

/**
 * The appointment's customer as a CRM row, created on first visit.
 *
 * An appointment stores a name and a phone, not a customer id — a walk-in books
 * before they are anyone's client. Matching is by `phoneKey`, the one canonical
 * form in this codebase; matching on the raw string is how one person becomes
 * three customers.
 *
 * Null when there is no phone to match on. A numberless booking is not worth a
 * permanent CRM record, and inventing one would corrupt the very spend profile
 * this exists to keep.
 */
async function resolveAppointmentCustomer(
  factoryId: string,
  appointment: { customerName: string; customerPhone: string | null; customerEmail: string | null },
): Promise<string | null> {
  const key = phoneKey(appointment.customerPhone);
  if (!key) return null;

  const existing = await prisma.customer.findFirst({
    where: { factoryId, phone: key },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.customer.create({
    data: {
      factoryId,
      name: appointment.customerName || key,
      phone: key,
      email: appointment.customerEmail,
      tags: ["Retail"],
    },
    select: { id: true },
  });
  return created.id;
}

/** The invoice note that ties a draft back to the visit that raised it. */
function appointmentInvoiceMarker(appointmentId: string): string {
  return `Appointment ${appointmentId}`;
}

/** A served appointment becomes a draft bill — if the tenant bills at all. */
const billAppointment: EventListener<AppointmentPayload> = async (payload) => {
  const factoryId = String(payload.factoryId);
  if (!(await tenantHasModule(factoryId, "billing"))) return;

  const appointment = await prisma.appointment.findFirst({
    where: { id: String(payload.appointmentId ?? ""), factoryId },
    select: {
      id: true,
      serviceName: true,
      pricePaise: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
    },
  });
  if (!appointment || appointment.pricePaise <= 0) return;

  const customerId = await resolveAppointmentCustomer(factoryId, appointment);
  if (!customerId) return;

  // Re-running the emit must not raise a second bill for the same visit. The
  // note carries the appointment id precisely so this check can exist without a
  // schema column for a link only this workflow cares about.
  const marker = appointmentInvoiceMarker(appointment.id);
  const already = await prisma.serviceInvoice.findFirst({
    where: { factoryId, notes: { contains: marker } },
    select: { id: true },
  });
  if (already) return;

  await draftServiceInvoice({
    factoryId,
    customerId,
    // Paise on the appointment, rupees on the invoice: the two halves of the
    // platform disagree about money's unit, and the conversion belongs at the
    // boundary rather than inside either side's arithmetic.
    lineItems: [
      { description: appointment.serviceName, quantity: 1, unitPrice: appointment.pricePaise / 100 },
    ],
    notes: marker,
  });
};

/**
 * Spend profile: visits, lifetime spend, last seen.
 *
 * Kept in `Customer.customFields` rather than three new columns. That field
 * exists for exactly this — attributes one vertical cares about and the others
 * never read — and the profile is a running total a repeat-visit business reads
 * on every screen, not something worth re-aggregating from invoices each time.
 */
const updateSpendProfile: EventListener<AppointmentPayload> = async (payload) => {
  const factoryId = String(payload.factoryId);
  if (!(await tenantHasModule(factoryId, "crm"))) return;

  const appointment = await prisma.appointment.findFirst({
    where: { id: String(payload.appointmentId ?? ""), factoryId },
    select: {
      id: true,
      pricePaise: true,
      serviceName: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      endTime: true,
    },
  });
  if (!appointment) return;

  const customerId = await resolveAppointmentCustomer(factoryId, appointment);
  if (!customerId) return;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, factoryId },
    select: { customFields: true },
  });
  const profile = (customer?.customFields ?? {}) as Record<string, unknown>;

  // Counted once per appointment: a re-emitted `completed` must not inflate a
  // client's visit count, and the last appointment counted is the cheapest
  // possible record of what has already been added.
  if (profile.lastAppointmentId === appointment.id) return;

  const visits = Number(profile.visits ?? 0) + 1;
  const lifetimeSpend = Number(profile.lifetimeSpend ?? 0) + appointment.pricePaise / 100;

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      customFields: {
        ...profile,
        visits,
        lifetimeSpend: Math.round((lifetimeSpend + Number.EPSILON) * 100) / 100,
        lastVisitAt: appointment.endTime.toISOString(),
        lastService: appointment.serviceName,
        lastAppointmentId: appointment.id,
      },
    },
  });
};

const notifyAppointmentServed: EventListener<AppointmentPayload> = async (payload) => {
  const factoryId = String(payload.factoryId);
  const recipients = await ownerRecipients(factoryId);
  if (recipients.length === 0) return;

  await emitEvent({
    factoryId,
    event: "APPOINTMENT_COMPLETED",
    recipients,
    title: "Appointment completed",
    message: `${String(payload.customerName ?? "A client")} has been served.`,
    linkUrl: "/owner/booking",
  });
};

// --- Flow 2 ----------------------------------------------------------------

interface TicketPayload extends EventPayload {
  ticketId?: string;
  ticketNumber?: string;
  subject?: string;
}

const notifyTicketRaised: EventListener<TicketPayload> = async (payload) => {
  const factoryId = String(payload.factoryId);
  const recipients = await ownerRecipients(factoryId);
  if (recipients.length === 0) return;

  await emitEvent({
    factoryId,
    event: "TICKET_CREATED",
    recipients,
    title: `Ticket ${String(payload.ticketNumber ?? "")}`.trim(),
    message: String(payload.subject ?? "A new ticket was raised."),
    linkUrl: payload.ticketId ? `/owner/helpdesk/${String(payload.ticketId)}` : "/owner/helpdesk",
    type: "WARNING",
  });
};

interface WorkOrderPayload extends EventPayload {
  workOrderId?: string;
  woNumber?: string;
  title?: string;
  assignedToId?: string | null;
}

const notifyTechnicianDispatched: EventListener<WorkOrderPayload> = async (payload) => {
  const assignedToId = payload.assignedToId ? String(payload.assignedToId) : null;
  if (!assignedToId) return;

  await emitEvent({
    factoryId: String(payload.factoryId),
    event: "WORK_ORDER_DISPATCHED",
    recipients: [assignedToId],
    title: `Job ${String(payload.woNumber ?? "")} dispatched`.trim(),
    message: String(payload.title ?? "A job is waiting for you."),
    linkUrl: "/owner/service-work-orders",
  });
};

/**
 * A completed visit against an asset is a line in that asset's condition ledger.
 *
 * The work order already knows which asset it was. Without this the maintenance
 * history is only ever what somebody remembered to retype into the asset screen
 * afterwards.
 */
const logAssetService: EventListener<WorkOrderPayload> = async (payload) => {
  const factoryId = String(payload.factoryId);
  if (!(await tenantHasModule(factoryId, "assets"))) return;

  const wo = await prisma.serviceWorkOrder.findFirst({
    where: { id: String(payload.workOrderId ?? ""), factoryId },
    select: {
      id: true,
      assetId: true,
      woNumber: true,
      title: true,
      category: true,
      assignedToId: true,
      completedAt: true,
    },
  });
  if (!wo?.assetId) return;

  const asset = await prisma.asset.findFirst({
    where: { id: wo.assetId, factoryId },
    select: { id: true },
  });
  if (!asset) return;

  const description = `${wo.woNumber} — ${wo.title}`;
  const already = await prisma.assetMaintenanceLog.findFirst({
    where: { factoryId, assetId: asset.id, description },
    select: { id: true },
  });
  if (already) return;

  await prisma.assetMaintenanceLog.create({
    data: {
      factoryId,
      assetId: asset.id,
      type: wo.category?.trim() || "Corrective",
      description,
      performedById: wo.assignedToId,
      performedAt: wo.completedAt ?? new Date(),
    },
  });
};

/** A completed visit for a customer becomes a draft bill. */
const billWorkOrder: EventListener<WorkOrderPayload> = async (payload) => {
  const factoryId = String(payload.factoryId);
  if (!(await tenantHasModule(factoryId, "billing"))) return;

  const wo = await prisma.serviceWorkOrder.findFirst({
    where: { id: String(payload.workOrderId ?? ""), factoryId },
    select: { id: true, woNumber: true, title: true, customerId: true, siteId: true },
  });
  if (!wo?.customerId) return;

  const marker = `Work order ${wo.woNumber}`;
  const already = await prisma.serviceInvoice.findFirst({
    where: { factoryId, notes: { contains: marker } },
    select: { id: true },
  });
  if (already) return;

  // Priced at zero on purpose: the rate for a visit lives in a contract this
  // platform does not hold. The draft exists so the line is never missed at
  // month end; a human puts the number on it.
  await draftServiceInvoice({
    factoryId,
    customerId: wo.customerId,
    siteId: wo.siteId,
    lineItems: [{ description: `${wo.woNumber} — ${wo.title}`, quantity: 1, unitPrice: 0 }],
    notes: marker,
  });
};

const notifyWorkOrderCompleted: EventListener<WorkOrderPayload> = async (payload) => {
  const factoryId = String(payload.factoryId);
  const recipients = await ownerRecipients(factoryId);
  if (recipients.length === 0) return;

  await emitEvent({
    factoryId,
    event: "WORK_ORDER_COMPLETED",
    recipients,
    title: `Job ${String(payload.woNumber ?? "")} completed`.trim(),
    message: String(payload.title ?? "A job was completed."),
    linkUrl: "/owner/service-work-orders",
  });
};
