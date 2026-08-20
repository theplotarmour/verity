"use server";

import { revalidatePath } from "next/cache";
import type { InvoiceStatus, PayrollStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import { hasModule } from "@/platform/modules/entitlements";
import {
  draftServiceInvoice,
  priceLines,
  round2,
  type LineItemInput,
} from "@/platform/billing/service-invoice";

/**
 * Billing — the bridge from operations to money.
 *
 * Two halves, both derived from work that actually happened: `ServiceInvoice`
 * bills the client, `PayrollInput` summarises what to pay staff. Neither is an
 * accounting system. Verity does not post journals or calculate net pay; it
 * supplies the inputs to whatever already does, and refuses to become a second,
 * disagreeing source of truth for either.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function revalidateBillingPaths(invoiceId?: string) {
  revalidatePath("/owner/billing");
  if (invoiceId) revalidatePath(`/owner/billing/${invoiceId}`);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toCalendarDate(value: string | Date): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

// --- Invoices --------------------------------------------------------------

export async function getBillingData() {
  const organizationId = await guardModuleAction("billing");
  const user = await getOwnerUser();
  if (!user) {
    return { invoices: [], payroll: [], customers: [], sites: [], staff: [], stats: null };
  }

  const factoryId = user.factoryId;
  const now = new Date();

  const [invoices, payroll, customers, staff, sites] = await Promise.all([
    prisma.serviceInvoice.findMany({
      where: { factoryId },
      orderBy: { issueDate: "desc" },
      take: 300,
      include: {
        customer: { select: { id: true, name: true, companyName: true } },
        site: { select: { id: true, name: true } },
        _count: { select: { lineItems: true } },
      },
    }),
    prisma.payrollInput.findMany({
      where: { factoryId },
      orderBy: [{ periodStart: "desc" }],
      take: 300,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.customer.findMany({
      where: { factoryId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { factoryId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    (await hasModule(organizationId, "sites"))
      ? prisma.site.findMany({
          where: { factoryId, status: { not: "TERMINATED" } },
          select: { id: true, name: true, siteCode: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const invoiceRows = invoices.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    customerId: i.customerId,
    customerName: i.customer.companyName ?? i.customer.name,
    siteId: i.siteId,
    siteName: i.site?.name ?? null,
    status: i.status,
    issueDate: i.issueDate.toISOString(),
    dueDate: i.dueDate?.toISOString() ?? null,
    subtotal: i.subtotal,
    taxAmount: i.taxAmount,
    total: i.total,
    paidAt: i.paidAt?.toISOString() ?? null,
    notes: i.notes,
    lineCount: i._count.lineItems,
    // Overdue is derived, so an invoice becomes overdue by the clock rather
    // than by someone remembering to press a button.
    overdue: i.status === "SENT" && !!i.dueDate && i.dueDate < now,
  }));

  return {
    invoices: invoiceRows,
    payroll: payroll.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      presentDays: p.presentDays,
      absentDays: p.absentDays,
      leaveDays: p.leaveDays,
      overtimeHours: p.overtimeHours,
      totalHours: p.totalHours,
      status: p.status,
      exportedAt: p.exportedAt?.toISOString() ?? null,
      notes: p.notes,
    })),
    customers,
    sites,
    staff,
    stats: {
      draft: invoiceRows.filter((i) => i.status === "DRAFT").length,
      outstanding: round2(
        invoiceRows
          .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
          .reduce((sum, i) => sum + i.total, 0),
      ),
      overdue: invoiceRows.filter((i) => i.overdue || i.status === "OVERDUE").length,
      paidThisMonth: round2(
        invoiceRows
          .filter(
            (i) =>
              i.status === "PAID" &&
              i.paidAt &&
              new Date(i.paidAt).getMonth() === now.getMonth() &&
              new Date(i.paidAt).getFullYear() === now.getFullYear(),
          )
          .reduce((sum, i) => sum + i.total, 0),
      ),
    },
  };
}

export async function getInvoiceDetail(invoiceId: string) {
  await guardModuleAction("billing");
  const user = await getOwnerUser();
  if (!user) return null;

  const invoice = await prisma.serviceInvoice.findFirst({
    where: { id: invoiceId, factoryId: user.factoryId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          companyName: true,
          billingAddress: true,
          gstNumber: true,
          email: true,
          phone: true,
        },
      },
      site: { select: { id: true, name: true, address: true } },
      lineItems: true,
    },
  });
  if (!invoice) return null;

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    notes: invoice.notes,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    customer: invoice.customer,
    site: invoice.site,
    lineItems: invoice.lineItems.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
      amount: l.amount,
    })),
  };
}

export async function createInvoice(input: {
  customerId: string;
  siteId?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  lineItems: LineItemInput[];
}) {
  await guardModuleWrite("billing");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.customerId) return { error: "Pick a customer." };

  try {
    // Session and entitlement are settled above; the write itself is shared with
    // the event reactions that raise a draft off a completed visit.
    const id = await draftServiceInvoice({
      factoryId: user.factoryId,
      customerId: input.customerId,
      siteId: input.siteId ?? null,
      dueDate: parseDate(input.dueDate),
      notes: input.notes ?? null,
      lineItems: input.lineItems ?? [],
    });
    if (!id) return { error: "Customer not found, or no priced line items." };
    revalidateBillingPaths();
    return { success: true, id };
  } catch {
    return { error: "Could not create the invoice." };
  }
}

export async function updateInvoice(
  invoiceId: string,
  input: {
    customerId?: string;
    siteId?: string | null;
    dueDate?: string | null;
    notes?: string | null;
    lineItems: LineItemInput[];
  },
) {
  await guardModuleWrite("billing");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const factoryId = user.factoryId;
  const invoice = await prisma.serviceInvoice.findFirst({
    where: { id: invoiceId, factoryId },
    select: { id: true, status: true },
  });
  if (!invoice) return { error: "Invoice not found." };
  // Once an invoice has left the building its numbers are a statement to the
  // client. Editing it in place would make the copy they hold a forgery.
  if (invoice.status !== "DRAFT") return { error: "Only a draft invoice can be edited." };

  const { priced, subtotal, taxAmount, total } = priceLines(input.lineItems ?? []);
  if (priced.length === 0) return { error: "Add at least one line item." };

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, factoryId },
      select: { id: true },
    });
    if (!customer) return { error: "Customer not found." };
  }

  await prisma.$transaction([
    prisma.invoiceLineItem.deleteMany({ where: { invoiceId: invoice.id } }),
    prisma.serviceInvoice.update({
      where: { id: invoice.id },
      data: {
        ...(input.customerId ? { customerId: input.customerId } : {}),
        siteId: input.siteId || null,
        dueDate: parseDate(input.dueDate),
        notes: input.notes?.trim() || null,
        subtotal,
        taxAmount,
        total,
        lineItems: { create: priced },
      },
    }),
  ]);

  revalidateBillingPaths(invoiceId);
  return { success: true };
}

export async function setInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  await guardModuleWrite("billing");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const invoice = await prisma.serviceInvoice.findFirst({
    where: { id: invoiceId, factoryId: user.factoryId },
    select: { id: true, paidAt: true },
  });
  if (!invoice) return { error: "Invoice not found." };

  await prisma.serviceInvoice.update({
    where: { id: invoice.id },
    data: {
      status,
      paidAt: status === "PAID" ? (invoice.paidAt ?? new Date()) : null,
    },
  });

  revalidateBillingPaths(invoiceId);
  return { success: true };
}

export async function deleteInvoice(invoiceId: string) {
  await guardModuleWrite("billing");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const invoice = await prisma.serviceInvoice.findFirst({
    where: { id: invoiceId, factoryId: user.factoryId },
    select: { id: true, status: true },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status !== "DRAFT") {
    return { error: "A sent invoice cannot be deleted. Cancel it instead." };
  }

  await prisma.serviceInvoice.delete({ where: { id: invoice.id } });
  revalidateBillingPaths();
  return { success: true };
}

/**
 * Draft an invoice from work already done at a site: completed work orders and
 * approved billable hours in the period, each becoming a line.
 *
 * This is the whole reason billing lives inside the operations platform rather
 * than beside it — the person invoicing does not have to retype what the person
 * doing the work already recorded.
 */
export async function buildInvoiceFromWork(input: {
  customerId: string;
  siteId?: string | null;
  periodStart: string;
  periodEnd: string;
}) {
  const organizationId = await guardModuleWrite("billing");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const factoryId = user.factoryId;
  const start = toCalendarDate(input.periodStart);
  const endDay = toCalendarDate(input.periodEnd);
  if (!start || !endDay) return { error: "Pick a valid period." };
  const end = new Date(endDay.getTime() + DAY_MS - 1);

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, factoryId },
    select: { id: true },
  });
  if (!customer) return { error: "Customer not found." };

  const lines: LineItemInput[] = [];

  if (await hasModule(organizationId, "helpdesk")) {
    const workOrders = await prisma.serviceWorkOrder.findMany({
      where: {
        factoryId,
        customerId: customer.id,
        ...(input.siteId ? { siteId: input.siteId } : {}),
        status: "COMPLETED",
        completedAt: { gte: start, lte: end },
      },
      select: { woNumber: true, title: true },
      orderBy: { completedAt: "asc" },
    });
    for (const wo of workOrders) {
      lines.push({ description: `${wo.woNumber} — ${wo.title}`, quantity: 1, unitPrice: 0 });
    }
  }

  if (await hasModule(organizationId, "projects")) {
    // Grouped per project rather than per entry: a client wants "38 hours on
    // the Phase 2 fit-out", not thirty-eight rows.
    const projects = await prisma.project.findMany({
      where: {
        factoryId,
        customerId: customer.id,
        ...(input.siteId ? { siteId: input.siteId } : {}),
      },
      select: { id: true, name: true, billableRate: true },
    });
    for (const project of projects) {
      const agg = await prisma.timesheetEntry.aggregate({
        where: {
          factoryId,
          projectId: project.id,
          billable: true,
          approved: true,
          date: { gte: start, lte: end },
        },
        _sum: { hours: true },
      });
      const hours = agg._sum.hours ?? 0;
      if (hours <= 0) continue;
      lines.push({
        description: `${project.name} — billable hours`,
        quantity: hours,
        unitPrice: project.billableRate,
      });
    }
  }

  if (lines.length === 0) {
    return { error: "No completed work or approved hours found in that period." };
  }

  return createInvoice({
    customerId: customer.id,
    siteId: input.siteId ?? null,
    notes: `Work performed ${start.toISOString().slice(0, 10)} to ${endDay.toISOString().slice(0, 10)}.`,
    lineItems: lines,
  });
}

// --- Payroll inputs --------------------------------------------------------

/**
 * Build the period summary for every active employee from attendance, leave and
 * (when `projects` is on) approved timesheet hours.
 *
 * Re-runnable: an existing DRAFT row for the same person and period is
 * recomputed, a FINALISED or EXPORTED one is left alone. Payroll that has
 * already been handed off must not silently change underneath the handoff.
 */
export async function generatePayrollInputs(input: { periodStart: string; periodEnd: string }) {
  const organizationId = await guardModuleWrite("billing");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const factoryId = user.factoryId;
  const start = toCalendarDate(input.periodStart);
  const endDay = toCalendarDate(input.periodEnd);
  if (!start || !endDay) return { error: "Pick a valid period." };
  if (endDay < start) return { error: "The period ends before it starts." };
  const end = new Date(endDay.getTime() + DAY_MS - 1);

  const staff = await prisma.user.findMany({
    where: { factoryId, isActive: true },
    select: { id: true },
  });
  if (staff.length === 0) return { error: "No active employees to summarise." };

  const [attendance, leaves, timesheets, existing] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: { factoryId, clockIn: { gte: start, lte: end } },
      select: { userId: true, status: true, overtimeHours: true },
    }),
    prisma.leaveApplication.findMany({
      where: { factoryId, fromDate: { lte: end }, toDate: { gte: start } },
      select: { userId: true, fromDate: true, toDate: true, status: true },
    }),
    (await hasModule(organizationId, "projects"))
      ? prisma.timesheetEntry.groupBy({
          by: ["userId"],
          where: { factoryId, approved: true, date: { gte: start, lte: end } },
          _sum: { hours: true },
        })
      : Promise.resolve([] as { userId: string; _sum: { hours: number | null } }[]),
    prisma.payrollInput.findMany({
      where: { factoryId, periodStart: start, periodEnd: endDay },
      select: { id: true, userId: true, status: true },
    }),
  ]);

  const byUser = new Map<
    string,
    { present: number; absent: number; overtime: number; leave: number; hours: number }
  >(staff.map((s) => [s.id, { present: 0, absent: 0, overtime: 0, leave: 0, hours: 0 }]));

  for (const log of attendance) {
    const row = byUser.get(log.userId);
    if (!row) continue;
    if (log.status === "PRESENT") row.present += 1;
    else if (log.status === "HALF_DAY") row.present += 0.5;
    else if (log.status === "ABSENT") row.absent += 1;
    row.overtime += log.overtimeHours;
  }

  for (const leave of leaves) {
    if (leave.status !== "APPROVED") continue;
    const row = byUser.get(leave.userId);
    if (!row) continue;
    // Only the part of the leave that falls inside the period counts.
    const from = leave.fromDate < start ? start : leave.fromDate;
    const to = leave.toDate > endDay ? endDay : leave.toDate;
    const days = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
    row.leave += Math.max(days, 0);
  }

  for (const entry of timesheets) {
    const row = byUser.get(entry.userId);
    if (row) row.hours = entry._sum.hours ?? 0;
  }

  const lockedByUser = new Map(existing.map((e) => [e.userId, e.status]));
  let written = 0;
  let skipped = 0;

  for (const [userId, totals] of byUser) {
    const lock = lockedByUser.get(userId);
    if (lock === "FINALISED" || lock === "EXPORTED") {
      skipped += 1;
      continue;
    }

    await prisma.payrollInput.upsert({
      where: { userId_periodStart_periodEnd: { userId, periodStart: start, periodEnd: endDay } },
      create: {
        factoryId,
        userId,
        periodStart: start,
        periodEnd: endDay,
        presentDays: Math.round(totals.present),
        absentDays: totals.absent,
        overtimeHours: round2(totals.overtime),
        leaveDays: totals.leave,
        totalHours: round2(totals.hours),
      },
      update: {
        presentDays: Math.round(totals.present),
        absentDays: totals.absent,
        overtimeHours: round2(totals.overtime),
        leaveDays: totals.leave,
        totalHours: round2(totals.hours),
      },
    });
    written += 1;
  }

  revalidateBillingPaths();
  return { success: true, written, skipped };
}

export async function setPayrollStatus(payrollId: string, status: PayrollStatus) {
  await guardModuleWrite("billing");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const row = await prisma.payrollInput.findFirst({
    where: { id: payrollId, factoryId: user.factoryId },
    select: { id: true, exportedAt: true },
  });
  if (!row) return { error: "Payroll row not found." };

  await prisma.payrollInput.update({
    where: { id: row.id },
    data: {
      status,
      exportedAt: status === "EXPORTED" ? (row.exportedAt ?? new Date()) : null,
    },
  });

  revalidateBillingPaths();
  return { success: true };
}

/**
 * CSV for the payroll system, and the act of marking the period exported.
 *
 * The two happen together on purpose: an export that does not flip the status
 * is how the same period gets paid twice.
 */
export async function exportPayrollCsv(input: { periodStart: string; periodEnd: string }) {
  await guardModuleAction("billing");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const start = toCalendarDate(input.periodStart);
  const endDay = toCalendarDate(input.periodEnd);
  if (!start || !endDay) return { error: "Pick a valid period." };

  const rows = await prisma.payrollInput.findMany({
    where: { factoryId: user.factoryId, periodStart: start, periodEnd: endDay },
    include: { user: { select: { name: true, employeeId: true } } },
    orderBy: { user: { name: "asc" } },
  });
  if (rows.length === 0) return { error: "Nothing to export for that period." };

  const header = [
    "Employee ID",
    "Name",
    "Period Start",
    "Period End",
    "Present Days",
    "Absent Days",
    "Leave Days",
    "Overtime Hours",
    "Total Hours",
  ];
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.user.employeeId,
        r.user.name,
        r.periodStart.toISOString().slice(0, 10),
        r.periodEnd.toISOString().slice(0, 10),
        r.presentDays,
        r.absentDays,
        r.leaveDays,
        r.overtimeHours,
        r.totalHours,
      ]
        .map(escape)
        .join(","),
    ),
  ].join("\n");

  await prisma.payrollInput.updateMany({
    where: { factoryId: user.factoryId, periodStart: start, periodEnd: endDay },
    data: { status: "EXPORTED", exportedAt: new Date() },
  });

  revalidateBillingPaths();
  return {
    success: true,
    csv,
    filename: `payroll-${start.toISOString().slice(0, 10)}-to-${endDay.toISOString().slice(0, 10)}.csv`,
  };
}
