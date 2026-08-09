"use server";

import { revalidatePath } from "next/cache";
import type { SiteStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { createWithDocNumber, formatDocNumber } from "@/lib/server/numbering";
import { guardModuleAction } from "@/platform/modules/guard";

/**
 * Sites — the link between a client and the work done for them.
 *
 * A Site is where service work happens: the guarded premises, the serviced
 * building, the construction plot. It is not a Warehouse; warehouses locate
 * stock, sites locate work, and conflating them would put bins on a client
 * contract.
 *
 * Every query below is scoped to `factoryId`. That is not defensive style, it
 * is the tenancy boundary — a missing filter here leaks one client's sites into
 * another's list.
 */

function revalidateSitePaths(id?: string) {
  revalidatePath("/owner/sites");
  if (id) revalidatePath(`/owner/sites/${id}`);
}

export interface SiteInput {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  customerId?: string | null;
  status?: SiteStatus;
  managerUserId?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  slaHours?: number | null;
  notes?: string | null;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The Sites list, with the three numbers that tell an operator whether a site
 * is healthy: who is posted there, what work is open, and how much of it has
 * already blown the SLA.
 */
export async function getSitesData() {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { sites: [], customers: [], managers: [] };

  const factoryId = user.factoryId;
  const now = new Date();

  const [sites, customers, managers] = await Promise.all([
    prisma.site.findMany({
      where: { factoryId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        customer: { select: { id: true, name: true, companyName: true } },
        managerUser: { select: { id: true, name: true } },
        _count: {
          select: {
            deployments: { where: { isActive: true } },
            workOrders: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } },
            tickets: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } } },
          },
        },
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
  ]);

  // Breach is counted, not stored: recomputing it here means changing a site's
  // SLA never rewrites what already happened, it only changes what happens next.
  const breaches = await prisma.serviceWorkOrder.groupBy({
    by: ["siteId"],
    where: {
      factoryId,
      siteId: { in: sites.map((s) => s.id) },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      slaDueAt: { lt: now },
    },
    _count: { _all: true },
  });
  const breachBySite = new Map(breaches.map((b) => [b.siteId, b._count._all]));

  return {
    sites: sites.map((site) => ({
      id: site.id,
      name: site.name,
      siteCode: site.siteCode,
      address: site.address,
      city: site.city,
      state: site.state,
      status: site.status,
      customerId: site.customerId,
      customerName: site.customer?.companyName ?? site.customer?.name ?? null,
      managerUserId: site.managerUserId,
      managerName: site.managerUser?.name ?? null,
      contractStart: site.contractStart?.toISOString() ?? null,
      contractEnd: site.contractEnd?.toISOString() ?? null,
      slaHours: site.slaHours,
      notes: site.notes,
      activeStaff: site._count.deployments,
      openWorkOrders: site._count.workOrders,
      openTickets: site._count.tickets,
      slaBreaches: breachBySite.get(site.id) ?? 0,
    })),
    customers,
    managers,
  };
}

export async function getSiteDetail(siteId: string) {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return null;

  const factoryId = user.factoryId;

  // findFirst rather than findUnique: the tenant filter has to be part of the
  // lookup, not a check performed after the row is already in hand.
  const site = await prisma.site.findFirst({
    where: { id: siteId, factoryId },
    include: {
      customer: { select: { id: true, name: true, companyName: true } },
      managerUser: { select: { id: true, name: true } },
      deployments: {
        orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
        include: {
          user: { select: { id: true, name: true, role: true } },
          shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        },
      },
      workOrders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      tickets: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      },
      inspections: {
        orderBy: { createdAt: "desc" },
        take: 25,
        select: { id: true, status: true, submittedAt: true, approvedAt: true, createdAt: true },
      },
    },
  });

  if (!site) return null;

  const [users, shifts, customers] = await Promise.all([
    prisma.user.findMany({
      where: { factoryId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.shift.findMany({
      where: { factoryId },
      select: { id: true, name: true, startTime: true, endTime: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { factoryId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    site: {
      id: site.id,
      name: site.name,
      siteCode: site.siteCode,
      address: site.address,
      city: site.city,
      state: site.state,
      status: site.status,
      customerId: site.customerId,
      customerName: site.customer?.companyName ?? site.customer?.name ?? null,
      managerUserId: site.managerUserId,
      managerName: site.managerUser?.name ?? null,
      contractStart: site.contractStart?.toISOString() ?? null,
      contractEnd: site.contractEnd?.toISOString() ?? null,
      slaHours: site.slaHours,
      notes: site.notes,
    },
    deployments: site.deployments.map((d) => ({
      id: d.id,
      userId: d.userId,
      userName: d.user.name,
      role: d.role,
      shiftId: d.shiftId,
      shiftName: d.shift ? `${d.shift.name} (${d.shift.startTime}–${d.shift.endTime})` : null,
      startDate: d.startDate.toISOString(),
      endDate: d.endDate?.toISOString() ?? null,
      isActive: d.isActive,
    })),
    workOrders: site.workOrders.map((w) => ({
      id: w.id,
      woNumber: w.woNumber,
      title: w.title,
      status: w.status,
      priority: w.priority,
      assignedToName: w.assignedTo?.name ?? null,
      scheduledAt: w.scheduledAt?.toISOString() ?? null,
      slaDueAt: w.slaDueAt?.toISOString() ?? null,
    })),
    tickets: site.tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
    })),
    inspections: site.inspections.map((i) => ({
      id: i.id,
      status: i.status,
      submittedAt: i.submittedAt?.toISOString() ?? null,
      approvedAt: i.approvedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
    users,
    shifts,
    customers,
  };
}

export async function createSite(input: SiteInput) {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "Site name is required." };

  const factoryId = user.factoryId;
  const base = (await prisma.site.count({ where: { factoryId } })) + 1;

  try {
    const site = await createWithDocNumber(
      (attempt) => formatDocNumber("SITE", base + attempt, 4),
      (siteCode) =>
        prisma.site.create({
          data: {
            factoryId,
            siteCode,
            name: input.name.trim(),
            address: input.address?.trim() || null,
            city: input.city?.trim() || null,
            state: input.state?.trim() || null,
            customerId: input.customerId || null,
            status: input.status ?? "ACTIVE",
            managerUserId: input.managerUserId || null,
            contractStart: parseDate(input.contractStart),
            contractEnd: parseDate(input.contractEnd),
            slaHours: input.slaHours ?? null,
            notes: input.notes?.trim() || null,
          },
          select: { id: true },
        }),
    );
    revalidateSitePaths();
    return { success: true, id: site.id };
  } catch {
    return { error: "Could not create the site." };
  }
}

export async function updateSite(siteId: string, input: SiteInput) {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "Site name is required." };

  const updated = await prisma.site.updateMany({
    where: { id: siteId, factoryId: user.factoryId },
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      customerId: input.customerId || null,
      ...(input.status ? { status: input.status } : {}),
      managerUserId: input.managerUserId || null,
      contractStart: parseDate(input.contractStart),
      contractEnd: parseDate(input.contractEnd),
      slaHours: input.slaHours ?? null,
      notes: input.notes?.trim() || null,
    },
  });

  if (updated.count === 0) return { error: "Site not found." };
  revalidateSitePaths(siteId);
  return { success: true };
}

export async function setSiteStatus(siteId: string, status: SiteStatus) {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const updated = await prisma.site.updateMany({
    where: { id: siteId, factoryId: user.factoryId },
    data: { status },
  });
  if (updated.count === 0) return { error: "Site not found." };

  // Terminating a site ends the postings too. Leaving guards deployed to a
  // closed site is how a roster silently overstates its headcount.
  if (status === "TERMINATED") {
    await prisma.siteDeployment.updateMany({
      where: { siteId, factoryId: user.factoryId, isActive: true },
      data: { isActive: false, endDate: new Date() },
    });
  }

  revalidateSitePaths(siteId);
  return { success: true };
}

export async function deleteSite(siteId: string) {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const factoryId = user.factoryId;
  const referenced = await prisma.$transaction([
    prisma.ticket.count({ where: { factoryId, siteId } }),
    prisma.serviceWorkOrder.count({ where: { factoryId, siteId } }),
    prisma.serviceInvoice.count({ where: { factoryId, siteId } }),
  ]);

  // A site with history is closed, not deleted — the tickets and invoices
  // raised against it have to keep pointing somewhere real.
  if (referenced.some((n) => n > 0)) {
    return { error: "This site has work or invoices against it. Set it to Terminated instead." };
  }

  const deleted = await prisma.site.deleteMany({ where: { id: siteId, factoryId } });
  if (deleted.count === 0) return { error: "Site not found." };
  revalidateSitePaths();
  return { success: true };
}

// --- Deployments ----------------------------------------------------------

export async function deployStaff(input: {
  siteId: string;
  userId: string;
  role?: string | null;
  shiftId?: string | null;
  startDate: string;
  endDate?: string | null;
}) {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const factoryId = user.factoryId;
  const start = parseDate(input.startDate);
  if (!start) return { error: "A start date is required." };

  // Both ends of the posting must belong to this tenant. Checking the site
  // alone would let a crafted userId post someone else's employee.
  const [site, staff] = await Promise.all([
    prisma.site.findFirst({ where: { id: input.siteId, factoryId }, select: { id: true } }),
    prisma.user.findFirst({ where: { id: input.userId, factoryId }, select: { id: true } }),
  ]);
  if (!site) return { error: "Site not found." };
  if (!staff) return { error: "Employee not found." };

  const alreadyHere = await prisma.siteDeployment.findFirst({
    where: { factoryId, siteId: input.siteId, userId: input.userId, isActive: true },
    select: { id: true },
  });
  if (alreadyHere) return { error: "That person is already deployed to this site." };

  await prisma.siteDeployment.create({
    data: {
      factoryId,
      siteId: input.siteId,
      userId: input.userId,
      role: input.role?.trim() || null,
      shiftId: input.shiftId || null,
      startDate: start,
      endDate: parseDate(input.endDate),
      isActive: true,
    },
  });

  revalidateSitePaths(input.siteId);
  return { success: true };
}

export async function endDeployment(deploymentId: string) {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const deployment = await prisma.siteDeployment.findFirst({
    where: { id: deploymentId, factoryId: user.factoryId },
    select: { id: true, siteId: true },
  });
  if (!deployment) return { error: "Deployment not found." };

  await prisma.siteDeployment.update({
    where: { id: deployment.id },
    data: { isActive: false, endDate: new Date() },
  });

  revalidateSitePaths(deployment.siteId);
  return { success: true };
}

export async function removeDeployment(deploymentId: string) {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const deployment = await prisma.siteDeployment.findFirst({
    where: { id: deploymentId, factoryId: user.factoryId },
    select: { id: true, siteId: true },
  });
  if (!deployment) return { error: "Deployment not found." };

  await prisma.siteDeployment.delete({ where: { id: deployment.id } });
  revalidateSitePaths(deployment.siteId);
  return { success: true };
}
