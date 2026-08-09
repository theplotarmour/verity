"use server";

import { revalidatePath } from "next/cache";
import type { ServiceWOStatus, TicketPriority, TicketStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { createWithDocNumber, formatDocNumber } from "@/lib/server/numbering";
import { guardModuleAction } from "@/platform/modules/guard";
import { hasModule } from "@/platform/modules/entitlements";

/**
 * Helpdesk — tickets and the service work orders dispatched from them.
 *
 * A ticket is a request. A ServiceWorkOrder is the visit that answers it. They
 * are separate because one complaint can produce three visits, and because a
 * planned maintenance round produces work orders with no ticket at all.
 *
 * `ServiceWorkOrder` deliberately is not `WorkOrder`: the production one
 * requires a ProductionPlan and a produced item, neither of which a site visit
 * has.
 */

const CLOSED_TICKET_STATES: TicketStatus[] = ["RESOLVED", "CLOSED"];
const CLOSED_WO_STATES: ServiceWOStatus[] = ["COMPLETED", "CANCELLED"];

function revalidateHelpdeskPaths(ticketId?: string) {
  revalidatePath("/owner/helpdesk");
  revalidatePath("/owner/service-work-orders");
  if (ticketId) revalidatePath(`/owner/helpdesk/${ticketId}`);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The SLA clock. A site's `slaHours` is the promise; this stamps the deadline
 * onto the work at the moment it is raised, so later edits to the contract do
 * not silently re-date work that is already running.
 */
async function slaDueFor(factoryId: string, siteId: string | null | undefined, from: Date) {
  if (!siteId) return null;
  const site = await prisma.site.findFirst({
    where: { id: siteId, factoryId },
    select: { slaHours: true },
  });
  if (!site?.slaHours) return null;
  return new Date(from.getTime() + site.slaHours * 60 * 60 * 1000);
}

/** Site pickers only make sense when the tenant actually has sites. */
async function sitesEnabled(organizationId: string) {
  return hasModule(organizationId, "sites");
}

// --- Tickets ---------------------------------------------------------------

export async function getHelpdeskData() {
  const organizationId = await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { tickets: [], customers: [], agents: [], sites: [], stats: null };

  const factoryId = user.factoryId;
  const now = new Date();

  const [tickets, customers, agents, sites] = await Promise.all([
    prisma.ticket.findMany({
      where: { factoryId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: {
        customer: { select: { id: true, name: true, companyName: true } },
        site: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { comments: true, workOrders: true } },
      },
    }),
    prisma.customer.findMany({
      where: { factoryId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { factoryId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    (await sitesEnabled(organizationId))
      ? prisma.site.findMany({
          where: { factoryId, status: { not: "TERMINATED" } },
          select: { id: true, name: true, siteCode: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows = tickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    customerId: t.customerId,
    customerName: t.customer?.companyName ?? t.customer?.name ?? null,
    siteId: t.siteId,
    siteName: t.site?.name ?? null,
    assignedToId: t.assignedToId,
    assignedToName: t.assignedTo?.name ?? null,
    slaDueAt: t.slaDueAt?.toISOString() ?? null,
    slaBreached:
      !!t.slaDueAt && t.slaDueAt < now && !CLOSED_TICKET_STATES.includes(t.status),
    createdAt: t.createdAt.toISOString(),
    commentCount: t._count.comments,
    workOrderCount: t._count.workOrders,
  }));

  return {
    tickets: rows,
    customers,
    agents,
    sites,
    stats: {
      open: rows.filter((r) => r.status === "OPEN").length,
      inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
      waiting: rows.filter((r) => r.status === "WAITING_ON_CUSTOMER").length,
      breached: rows.filter((r) => r.slaBreached).length,
    },
  };
}

export async function getTicketDetail(ticketId: string) {
  const organizationId = await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return null;

  const factoryId = user.factoryId;

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, factoryId },
    include: {
      customer: { select: { id: true, name: true, companyName: true } },
      site: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
      workOrders: {
        orderBy: { createdAt: "desc" },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ticket) return null;

  const [agents, sites] = await Promise.all([
    prisma.user.findMany({
      where: { factoryId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    (await sitesEnabled(organizationId))
      ? prisma.site.findMany({
          where: { factoryId, status: { not: "TERMINATED" } },
          select: { id: true, name: true, siteCode: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    ticket: {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      customerId: ticket.customerId,
      customerName: ticket.customer?.companyName ?? ticket.customer?.name ?? null,
      siteId: ticket.siteId,
      siteName: ticket.site?.name ?? null,
      assignedToId: ticket.assignedToId,
      assignedToName: ticket.assignedTo?.name ?? null,
      reportedByName: ticket.reportedBy?.name ?? null,
      slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      closedAt: ticket.closedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
    },
    comments: ticket.comments.map((c) => ({
      id: c.id,
      body: c.body,
      isInternal: c.isInternal,
      authorName: c.author?.name ?? "System",
      createdAt: c.createdAt.toISOString(),
    })),
    workOrders: ticket.workOrders.map((w) => ({
      id: w.id,
      woNumber: w.woNumber,
      title: w.title,
      status: w.status,
      priority: w.priority,
      assignedToName: w.assignedTo?.name ?? null,
      scheduledAt: w.scheduledAt?.toISOString() ?? null,
    })),
    agents,
    sites,
  };
}

export interface TicketInput {
  subject: string;
  description?: string | null;
  category?: string | null;
  priority?: TicketPriority;
  customerId?: string | null;
  siteId?: string | null;
  assignedToId?: string | null;
}

export async function createTicket(input: TicketInput) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.subject?.trim()) return { error: "A subject is required." };

  const factoryId = user.factoryId;
  const now = new Date();
  const base = (await prisma.ticket.count({ where: { factoryId } })) + 1;
  const slaDueAt = await slaDueFor(factoryId, input.siteId, now);

  try {
    const ticket = await createWithDocNumber(
      (attempt) => formatDocNumber("TKT", base + attempt),
      (ticketNumber) =>
        prisma.ticket.create({
          data: {
            factoryId,
            ticketNumber,
            subject: input.subject.trim(),
            description: input.description?.trim() || null,
            category: input.category?.trim() || null,
            priority: input.priority ?? "MEDIUM",
            status: input.assignedToId ? "IN_PROGRESS" : "OPEN",
            customerId: input.customerId || null,
            siteId: input.siteId || null,
            assignedToId: input.assignedToId || null,
            reportedById: user.id,
            slaDueAt,
          },
          select: { id: true },
        }),
    );
    revalidateHelpdeskPaths();
    return { success: true, id: ticket.id };
  } catch {
    return { error: "Could not create the ticket." };
  }
}

export async function updateTicket(ticketId: string, input: TicketInput) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.subject?.trim()) return { error: "A subject is required." };

  const updated = await prisma.ticket.updateMany({
    where: { id: ticketId, factoryId: user.factoryId },
    data: {
      subject: input.subject.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      ...(input.priority ? { priority: input.priority } : {}),
      customerId: input.customerId || null,
      siteId: input.siteId || null,
      assignedToId: input.assignedToId || null,
    },
  });
  if (updated.count === 0) return { error: "Ticket not found." };

  revalidateHelpdeskPaths(ticketId);
  return { success: true };
}

export async function setTicketStatus(ticketId: string, status: TicketStatus) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const now = new Date();
  // Resolved and closed are stamped once and never un-stamped by a later
  // reopen — the first resolution time is the one an SLA report needs.
  const updated = await prisma.ticket.updateMany({
    where: { id: ticketId, factoryId: user.factoryId },
    data: {
      status,
      ...(status === "RESOLVED" ? { resolvedAt: now } : {}),
      ...(status === "CLOSED" ? { closedAt: now } : {}),
    },
  });
  if (updated.count === 0) return { error: "Ticket not found." };

  revalidateHelpdeskPaths(ticketId);
  return { success: true };
}

export async function assignTicket(ticketId: string, assignedToId: string | null) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  if (assignedToId) {
    const agent = await prisma.user.findFirst({
      where: { id: assignedToId, factoryId: user.factoryId },
      select: { id: true },
    });
    if (!agent) return { error: "That person is not on this team." };
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, factoryId: user.factoryId },
    select: { id: true, status: true },
  });
  if (!ticket) return { error: "Ticket not found." };

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      assignedToId,
      // Assigning an untouched ticket moves it off the OPEN pile; anything
      // already in flight keeps the status it has.
      ...(assignedToId && ticket.status === "OPEN" ? { status: "IN_PROGRESS" as const } : {}),
    },
  });

  revalidateHelpdeskPaths(ticketId);
  return { success: true };
}

export async function addTicketComment(input: {
  ticketId: string;
  body: string;
  isInternal?: boolean;
}) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.body?.trim()) return { error: "Write something first." };

  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!ticket) return { error: "Ticket not found." };

  await prisma.ticketComment.create({
    data: {
      factoryId: user.factoryId,
      ticketId: ticket.id,
      authorId: user.id,
      body: input.body.trim(),
      isInternal: input.isInternal ?? false,
    },
  });

  revalidateHelpdeskPaths(input.ticketId);
  return { success: true };
}

export async function deleteTicket(ticketId: string) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const deleted = await prisma.ticket.deleteMany({
    where: { id: ticketId, factoryId: user.factoryId },
  });
  if (deleted.count === 0) return { error: "Ticket not found." };

  revalidateHelpdeskPaths();
  return { success: true };
}

// --- Service work orders ---------------------------------------------------

export interface ServiceWorkOrderInput {
  title: string;
  description?: string | null;
  category?: string | null;
  customerId?: string | null;
  siteId?: string | null;
  assignedToId?: string | null;
  assetId?: string | null;
  checklistId?: string | null;
  ticketId?: string | null;
  priority?: TicketPriority;
  scheduledAt?: string | null;
}

export async function getServiceWorkOrdersData() {
  const organizationId = await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) {
    return { workOrders: [], customers: [], technicians: [], sites: [], assets: [], checklists: [], stats: null };
  }

  const factoryId = user.factoryId;
  const now = new Date();

  const [workOrders, customers, technicians, checklists, sites, assets] = await Promise.all([
    prisma.serviceWorkOrder.findMany({
      where: { factoryId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: {
        customer: { select: { id: true, name: true, companyName: true } },
        site: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        ticket: { select: { id: true, ticketNumber: true } },
      },
    }),
    prisma.customer.findMany({
      where: { factoryId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { factoryId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.checklistTemplate.findMany({
      where: { factoryId, status: "active", isLatest: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    (await sitesEnabled(organizationId))
      ? prisma.site.findMany({
          where: { factoryId, status: { not: "TERMINATED" } },
          select: { id: true, name: true, siteCode: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    (await hasModule(organizationId, "assets"))
      ? prisma.asset.findMany({
          where: { factoryId, status: { notIn: ["RETIRED", "DISPOSED"] } },
          select: { id: true, name: true, assetCode: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows = workOrders.map((w) => ({
    id: w.id,
    woNumber: w.woNumber,
    title: w.title,
    description: w.description,
    category: w.category,
    status: w.status,
    priority: w.priority,
    customerId: w.customerId,
    customerName: w.customer?.companyName ?? w.customer?.name ?? null,
    siteId: w.siteId,
    siteName: w.site?.name ?? null,
    assignedToId: w.assignedToId,
    assignedToName: w.assignedTo?.name ?? null,
    assetId: w.assetId,
    checklistId: w.checklistId,
    ticketId: w.ticketId,
    ticketNumber: w.ticket?.ticketNumber ?? null,
    scheduledAt: w.scheduledAt?.toISOString() ?? null,
    startedAt: w.startedAt?.toISOString() ?? null,
    completedAt: w.completedAt?.toISOString() ?? null,
    slaDueAt: w.slaDueAt?.toISOString() ?? null,
    slaBreached: !!w.slaDueAt && w.slaDueAt < now && !CLOSED_WO_STATES.includes(w.status),
    createdAt: w.createdAt.toISOString(),
  }));

  return {
    workOrders: rows,
    customers,
    technicians,
    sites,
    assets,
    checklists,
    stats: {
      open: rows.filter((r) => r.status === "OPEN").length,
      inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
      pendingParts: rows.filter((r) => r.status === "PENDING_PARTS").length,
      breached: rows.filter((r) => r.slaBreached).length,
    },
  };
}

export async function createServiceWorkOrder(input: ServiceWorkOrderInput) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.title?.trim()) return { error: "A title is required." };

  const factoryId = user.factoryId;
  const now = new Date();
  const base = (await prisma.serviceWorkOrder.count({ where: { factoryId } })) + 1;
  const slaDueAt = await slaDueFor(factoryId, input.siteId, now);

  try {
    const wo = await createWithDocNumber(
      (attempt) => formatDocNumber("SWO", base + attempt),
      (woNumber) =>
        prisma.serviceWorkOrder.create({
          data: {
            factoryId,
            woNumber,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            category: input.category?.trim() || null,
            customerId: input.customerId || null,
            siteId: input.siteId || null,
            assignedToId: input.assignedToId || null,
            assetId: input.assetId || null,
            checklistId: input.checklistId || null,
            ticketId: input.ticketId || null,
            priority: input.priority ?? "MEDIUM",
            status: input.assignedToId ? "ASSIGNED" : "OPEN",
            scheduledAt: parseDate(input.scheduledAt),
            slaDueAt,
          },
          select: { id: true },
        }),
    );
    revalidateHelpdeskPaths(input.ticketId ?? undefined);
    return { success: true, id: wo.id };
  } catch {
    return { error: "Could not create the work order." };
  }
}

export async function updateServiceWorkOrder(woId: string, input: ServiceWorkOrderInput) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.title?.trim()) return { error: "A title is required." };

  const updated = await prisma.serviceWorkOrder.updateMany({
    where: { id: woId, factoryId: user.factoryId },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      customerId: input.customerId || null,
      siteId: input.siteId || null,
      assignedToId: input.assignedToId || null,
      assetId: input.assetId || null,
      checklistId: input.checklistId || null,
      ...(input.priority ? { priority: input.priority } : {}),
      scheduledAt: parseDate(input.scheduledAt),
    },
  });
  if (updated.count === 0) return { error: "Work order not found." };

  revalidateHelpdeskPaths();
  return { success: true };
}

export async function setServiceWorkOrderStatus(woId: string, status: ServiceWOStatus) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const wo = await prisma.serviceWorkOrder.findFirst({
    where: { id: woId, factoryId: user.factoryId },
    select: { id: true, startedAt: true, ticketId: true },
  });
  if (!wo) return { error: "Work order not found." };

  const now = new Date();
  await prisma.serviceWorkOrder.update({
    where: { id: wo.id },
    data: {
      status,
      // First transition into IN_PROGRESS is what "started" means; a later
      // pause and resume must not reset the clock.
      ...(status === "IN_PROGRESS" && !wo.startedAt ? { startedAt: now } : {}),
      ...(status === "COMPLETED" ? { completedAt: now } : {}),
    },
  });

  revalidateHelpdeskPaths(wo.ticketId ?? undefined);
  return { success: true };
}

export async function assignServiceWorkOrder(woId: string, assignedToId: string | null) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  if (assignedToId) {
    const tech = await prisma.user.findFirst({
      where: { id: assignedToId, factoryId: user.factoryId },
      select: { id: true },
    });
    if (!tech) return { error: "That person is not on this team." };
  }

  const wo = await prisma.serviceWorkOrder.findFirst({
    where: { id: woId, factoryId: user.factoryId },
    select: { id: true, status: true },
  });
  if (!wo) return { error: "Work order not found." };

  await prisma.serviceWorkOrder.update({
    where: { id: wo.id },
    data: {
      assignedToId,
      ...(assignedToId && wo.status === "OPEN" ? { status: "ASSIGNED" as const } : {}),
    },
  });

  revalidateHelpdeskPaths();
  return { success: true };
}

export async function deleteServiceWorkOrder(woId: string) {
  await guardModuleAction("helpdesk");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const deleted = await prisma.serviceWorkOrder.deleteMany({
    where: { id: woId, factoryId: user.factoryId },
  });
  if (deleted.count === 0) return { error: "Work order not found." };

  revalidateHelpdeskPaths();
  return { success: true };
}
