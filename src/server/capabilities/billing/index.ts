import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";

/**
 * CAPABILITY: Billing — `verity.capability.billing` (Task 77, MVP scope)
 *
 * Authority: `taskplans/77_erpclaw_capability_billing.md`. Same override as
 * Tasks 72/73/78, 2026-09-04.
 *
 * NOT REGISTERED, NOT WIRED IN — same shared-DB migration-checksum blocker
 * as every other draft this session. See `../accounting/index.ts`'s module
 * doc for the full explanation.
 *
 * Deliberately separate from one-off sales invoicing (Task 74, not built —
 * different lifecycle, per Task 77's own scope). A `BillingMeter` bills a
 * `Party` directly; no generic Customer entity exists yet to route through.
 *
 * SCOPE BUILT: meters, meter readings, flat rate-per-unit billing periods,
 * and invoice generation guarded against double-billing by a DATABASE
 * constraint (`@@unique([tenantId, meterId, billingPeriodId])`) rather than
 * an application check — Task 77's own critical requirement ("a billing
 * period cannot be invoiced twice") holds even if a caller retries a failed
 * request. NOT built: rate tiers, time-of-use/demand pricing, prepaid
 * credit, a tracked batch-run entity. For generating many meters' invoices
 * at once, the intended caller is Task 91's `runCommandBatch` over
 * `generateInvoiceForMeter` — reusing that batch/partial-failure machinery
 * rather than this capability building a second one.
 */

export const BILLING_CAPABILITY = "verity.capability.billing";
export const ENTITY_BILLING_METER = "verity.billing.meter";
export const ENTITY_BILLING_INVOICE = "verity.billing.invoice";

/* ================================== meters ================================== */

export const createMeter: CommandDefinition<
  { partyId: string; name: string; ratePerUnitMinor: number },
  { id: string }
> = {
  key: "verity.billing.create_meter",
  entity: ENTITY_BILLING_METER,
  verb: "Create",
  input: z.object({
    partyId: z.string().uuid(),
    name: z.string().min(1).max(120),
    ratePerUnitMinor: z.number().int().min(0),
  }),
  handler: async (ctx, input) => {
    const meter = await ctx.tx.billingMeter.create({
      data: {
        tenantId: ctx.actor.tenantId,
        partyId: input.partyId,
        name: input.name,
        ratePerUnitMinor: input.ratePerUnitMinor,
      },
    });
    return {
      result: { id: meter.id },
      events: [{ name: "verity.billing.meter_created", entityId: meter.id }],
    };
  },
};

export const setMeterRate: CommandDefinition<{ meterId: string; ratePerUnitMinor: number }, { id: string }> = {
  key: "verity.billing.set_meter_rate",
  entity: ENTITY_BILLING_METER,
  verb: "Edit",
  input: z.object({ meterId: z.string().uuid(), ratePerUnitMinor: z.number().int().min(0) }),
  handler: async (ctx, input) => {
    const meter = await ctx.tx.billingMeter.update({
      where: { id: input.meterId },
      data: { ratePerUnitMinor: input.ratePerUnitMinor, version: { increment: 1 } },
    });
    return {
      result: { id: meter.id },
      events: [{ name: "verity.billing.meter_rate_changed", entityId: meter.id }],
    };
  },
};

export const recordMeterReading: CommandDefinition<{ meterId: string; readingUnits: number }, { id: string }> = {
  key: "verity.billing.record_meter_reading",
  entity: ENTITY_BILLING_METER,
  verb: "Create",
  input: z.object({ meterId: z.string().uuid(), readingUnits: z.number().int().min(0) }),
  preconditions: async (ctx, input) => {
    const meter = await ctx.tx.billingMeter.findUnique({ where: { id: input.meterId } });
    if (!meter) throw new ValidationError("E_VALIDATION: meter not found in this tenant");
    if (!meter.active) throw new ValidationError("E_VALIDATION: meter is deactivated");
    const last = await ctx.tx.billingMeterReading.findFirst({
      where: { meterId: input.meterId },
      orderBy: { readAt: "desc" },
    });
    if (last && input.readingUnits < last.readingUnits) {
      throw new ValidationError(
        `E_VALIDATION: reading ${input.readingUnits} is below the last recorded reading ${last.readingUnits}`,
      );
    }
  },
  handler: async (ctx, input) => {
    const reading = await ctx.tx.billingMeterReading.create({
      data: {
        tenantId: ctx.actor.tenantId,
        meterId: input.meterId,
        readingUnits: input.readingUnits,
        recordedById: ctx.actor.userId,
      },
    });
    return {
      result: { id: reading.id },
      events: [{ name: "verity.billing.meter_reading_recorded", entityId: reading.id }],
    };
  },
};

export const listMeters: QueryDefinition<
  { includeInactive?: boolean },
  Array<{ id: string; partyId: string; name: string; ratePerUnitMinor: number; active: boolean }>
> = {
  key: "verity.billing.list_meters",
  entity: ENTITY_BILLING_METER,
  input: z.object({ includeInactive: z.boolean().optional() }),
  handler: async (ctx, input) => {
    const rows = await ctx.tx.billingMeter.findMany({
      where: input.includeInactive ? {} : { active: true },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      partyId: r.partyId,
      name: r.name,
      ratePerUnitMinor: r.ratePerUnitMinor,
      active: r.active,
    }));
  },
};

/* ============================= billing periods ============================== */

export const openBillingPeriod: CommandDefinition<{ periodStart: string; periodEnd: string }, { id: string }> = {
  key: "verity.billing.open_billing_period",
  entity: ENTITY_BILLING_INVOICE,
  verb: "Create",
  input: z
    .object({ periodStart: z.string().datetime(), periodEnd: z.string().datetime() })
    .refine((v) => new Date(v.periodEnd) > new Date(v.periodStart), {
      message: "periodEnd must be after periodStart",
      path: ["periodEnd"],
    }),
  handler: async (ctx, input) => {
    const period = await ctx.tx.billingPeriod.create({
      data: {
        tenantId: ctx.actor.tenantId,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
      },
    });
    return {
      result: { id: period.id },
      events: [{ name: "verity.billing.period_opened", entityId: period.id }],
    };
  },
};

/**
 * Generates one meter's invoice for one period. Idempotent by the schema's
 * own unique constraint — a retried or duplicate call fails with
 * `E_VALIDATION` rather than double-billing. Usage is the sum of readings
 * taken to date within the period (a simple running total, not a
 * meter-start/meter-end delta — tiers/time-of-use are explicitly not built).
 * The natural caller for "bill every meter" is Task 91's `runCommandBatch`
 * over this command, one call per meter — not a bespoke loop here.
 */
export const generateInvoiceForMeter: CommandDefinition<
  { meterId: string; billingPeriodId: string },
  { id: string; usageUnits: number; amountMinor: number }
> = {
  key: "verity.billing.generate_invoice_for_meter",
  entity: ENTITY_BILLING_INVOICE,
  verb: "Create",
  impact: "destructive",
  input: z.object({ meterId: z.string().uuid(), billingPeriodId: z.string().uuid() }),
  preconditions: async (ctx, input) => {
    const meter = await ctx.tx.billingMeter.findUnique({ where: { id: input.meterId } });
    if (!meter) throw new ValidationError("E_VALIDATION: meter not found in this tenant");
    const period = await ctx.tx.billingPeriod.findUnique({ where: { id: input.billingPeriodId } });
    if (!period) throw new ValidationError("E_VALIDATION: billing period not found in this tenant");
    const already = await ctx.tx.billingInvoice.findUnique({
      where: {
        tenantId_meterId_billingPeriodId: {
          tenantId: ctx.actor.tenantId,
          meterId: input.meterId,
          billingPeriodId: input.billingPeriodId,
        },
      },
    });
    if (already) throw new ValidationError("E_VALIDATION: this meter already has an invoice for this period");
  },
  handler: async (ctx, input) => {
    const meter = await ctx.tx.billingMeter.findUniqueOrThrow({ where: { id: input.meterId } });
    const period = await ctx.tx.billingPeriod.findUniqueOrThrow({ where: { id: input.billingPeriodId } });

    const usage = await ctx.tx.billingMeterReading.aggregate({
      where: { meterId: input.meterId, readAt: { gte: period.periodStart, lte: period.periodEnd } },
      _sum: { readingUnits: true },
    });
    const usageUnits = usage._sum.readingUnits ?? 0;
    const amountMinor = usageUnits * meter.ratePerUnitMinor;

    const invoice = await ctx.tx.billingInvoice.create({
      data: {
        tenantId: ctx.actor.tenantId,
        meterId: input.meterId,
        billingPeriodId: input.billingPeriodId,
        usageUnits,
        amountMinor,
      },
    });

    return {
      result: { id: invoice.id, usageUnits, amountMinor },
      events: [
        {
          name: "verity.billing.invoice_generated",
          entityId: invoice.id,
          payload: { meterId: input.meterId, amountMinor },
        },
      ],
    };
  },
};

export const periodInvoices: QueryDefinition<
  { billingPeriodId: string },
  Array<{ id: string; meterId: string; usageUnits: number; amountMinor: number; generatedAt: Date }>
> = {
  key: "verity.billing.period_invoices",
  entity: ENTITY_BILLING_INVOICE,
  input: z.object({ billingPeriodId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const rows = await ctx.tx.billingInvoice.findMany({
      where: { billingPeriodId: input.billingPeriodId },
      orderBy: { generatedAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      meterId: r.meterId,
      usageUnits: r.usageUnits,
      amountMinor: r.amountMinor,
      generatedAt: r.generatedAt,
    }));
  },
};

/* ============================== registration ============================== */

/** NOT CALLED by `registry.ts` yet — see this file's module doc. */
export function registerBillingCapability(): void {
  registerContribution({
    capabilityId: BILLING_CAPABILITY,
    navigation: [
      {
        href: "/billing",
        label: "Billing",
        group: "Money",
        order: 46,
        icon: "finance",
        requiresEntity: ENTITY_BILLING_INVOICE,
        shells: ["platform"],
      },
    ],
  });
  registerCommand(createMeter);
  registerCommand(setMeterRate);
  registerCommand(recordMeterReading);
  registerCommand(openBillingPeriod);
  registerCommand(generateInvoiceForMeter);
  registerQuery(listMeters);
  registerQuery(periodInvoices);
}
