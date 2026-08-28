import { z } from "zod";
import { ValidationError, type CommandDefinition } from "@/server/platform/command";
import { type QueryDefinition } from "@/server/platform/query";
import { diffFields, recordActivity } from "@/server/platform/audit";
import type { TenantScopedClient } from "@/server/platform/tenancy";
import { ENTITY_STOCK_BALANCE, ENTITY_STOCK_LEDGER } from "./keys";

/**
 * PLYWOOD STAGE 2 — the stock ledger.
 *
 * Requirement source: plywood.md §1.1 — stock by godown, inward and outward,
 * transfers, adjustments, damaged and returned stock, low-stock alerts, and
 * stock valuation.
 *
 * P1 resolved to weighted average cost (implementation/plywood-decisions.md).
 * Two tables say the same thing at two speeds: `stock_ledger_entry` is the
 * append-only truth, enforced by a database trigger, and `stock_balance` is a
 * maintained summary. The invariant between them — quantity equals the sum of
 * the movements — is asserted by a test that replays the ledger, so the summary
 * cannot silently diverge from what it summarises.
 */

/**
 * Movement kinds. The direction is carried by the sign of the quantity, and a
 * check constraint on the table keeps the two consistent — a kind that says
 * "inward" cannot be stored against a negative delta.
 */
const INWARD_KINDS = ["purchase_inward", "transfer_in", "adjust_in", "returned_stock"] as const;
const OUTWARD_KINDS = ["sales_outward", "transfer_out", "adjust_out", "damaged_out"] as const;

export type MovementKind = (typeof INWARD_KINDS)[number] | (typeof OUTWARD_KINDS)[number];

/**
 * Weighted average cost — P1.
 *
 * An inward movement blends its cost into the running average; an outward
 * movement leaves the average alone and consumes at it. A pure function so the
 * arithmetic is testable without a database and the rounding rule is stated
 * once rather than at each call site.
 */
export function blendAverageCost(input: {
  onHandUnits: number;
  avgUnitCostPaise: number;
  inwardUnits: number;
  inwardUnitCostPaise: number;
}): number {
  const total = input.onHandUnits + input.inwardUnits;
  if (total <= 0) return input.inwardUnitCostPaise;
  const value =
    input.onHandUnits * input.avgUnitCostPaise + input.inwardUnits * input.inwardUnitCostPaise;
  return Math.round(value / total);
}

/**
 * Writes one movement and brings the balance with it, inside the caller's
 * transaction.
 *
 * The balance row is locked before it is read, so two movements against the
 * same board in the same godown serialise rather than interleaving and losing
 * one of the updates. Without the lock the weighted average is a read that a
 * concurrent write invalidates before it is used, which is the classic way an
 * average drifts away from the ledger it summarises.
 *
 * Returns the unit cost actually applied — the caller's cost on the way in, the
 * standing average on the way out — because that is what the ledger row stores,
 * and what a past sale's margin is computed from later.
 */
export async function applyMovement(
  tx: TenantScopedClient,
  actor: { tenantId: string; userId: string },
  movement: {
    productId: string;
    locationId: string;
    rackId?: string | null;
    kind: MovementKind;
    /** Always positive. The sign is decided by the kind. */
    qtyUnits: number;
    /** Required for an inward movement; ignored on the way out. */
    unitCostPaise?: number;
    reason?: string | null;
  },
): Promise<{ ledgerId: string; unitCostPaise: number; onHandUnits: number }> {
  const inward = (INWARD_KINDS as readonly string[]).includes(movement.kind);
  const delta = inward ? movement.qtyUnits : -movement.qtyUnits;

  // Lock first, read second. `FOR UPDATE` on a row that does not exist locks
  // nothing, so the very first movement for a board in a godown can still race —
  // the unique index resolves that case, and the caller sees a conflict rather
  // than a silently lost update.
  const existing = await tx.$queryRaw<
    { id: string; qty_units: number; avg_unit_cost_paise: number }[]
  >`SELECT id, qty_units, avg_unit_cost_paise
      FROM stock_balance
     WHERE product_id = ${movement.productId}::uuid
       AND location_id = ${movement.locationId}::uuid
     FOR UPDATE`;

  const onHand = existing[0]?.qty_units ?? 0;
  const currentAvg = existing[0]?.avg_unit_cost_paise ?? 0;

  if (inward && movement.unitCostPaise === undefined) {
    throw new ValidationError("E_VALIDATION: an inward movement needs a unit cost");
  }
  if (!inward && onHand < movement.qtyUnits) {
    // Refused here as well as by the CHECK constraint, so the operator is told
    // what is actually wrong rather than shown a constraint violation.
    throw new ValidationError(
      `E_VALIDATION: only ${onHand} in this godown, cannot move ${movement.qtyUnits}`,
    );
  }

  const appliedCost = inward ? movement.unitCostPaise! : currentAvg;
  const newQty = onHand + delta;
  const newAvg = inward
    ? blendAverageCost({
        onHandUnits: onHand,
        avgUnitCostPaise: currentAvg,
        inwardUnits: movement.qtyUnits,
        inwardUnitCostPaise: appliedCost,
      })
    : // Consuming does not change the average. An emptied godown keeps its last
      // average rather than resetting to zero, so the next sale before the next
      // purchase is still costed at something true.
      currentAvg;

  const entry = await tx.stockLedgerEntry.create({
    data: {
      tenantId: actor.tenantId,
      productId: movement.productId,
      locationId: movement.locationId,
      rackId: movement.rackId ?? null,
      kind: movement.kind,
      qtyDeltaUnits: delta,
      unitCostPaise: appliedCost,
      reason: movement.reason ?? null,
      byUserId: actor.userId,
    },
  });

  if (existing[0]) {
    await tx.stockBalance.update({
      where: { id: existing[0].id },
      data: { qtyUnits: newQty, avgUnitCostPaise: newAvg, version: { increment: 1 } },
    });
  } else {
    await tx.stockBalance.create({
      data: {
        tenantId: actor.tenantId,
        productId: movement.productId,
        locationId: movement.locationId,
        qtyUnits: newQty,
        avgUnitCostPaise: newAvg,
      },
    });
  }

  return { ledgerId: entry.id, unitCostPaise: appliedCost, onHandUnits: newQty };
}

/** Shared input shape for the movement commands. */
const movementInput = {
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  rackId: z.string().uuid().optional(),
  qtyUnits: z.number().int().positive(),
};

export async function assertTradeable(
  tx: TenantScopedClient,
  productId: string,
  locationId: string,
): Promise<void> {
  const product = await tx.plywoodProduct.findUnique({ where: { id: productId } });
  if (!product) throw new ValidationError("E_VALIDATION: board not found in this tenant");
  if (!product.active) {
    throw new ValidationError("E_VALIDATION: that board has been withdrawn from the catalogue");
  }
  const godown = await tx.location.findUnique({ where: { id: locationId } });
  if (!godown) throw new ValidationError("E_VALIDATION: godown not found in this tenant");
}

/* -------------------------------- commands -------------------------------- */

export const receiveStock: CommandDefinition<
  {
    productId: string;
    locationId: string;
    rackId?: string;
    qtyUnits: number;
    unitCostPaise: number;
    reason?: string;
  },
  { ledgerId: string; onHandUnits: number }
> = {
  key: "verity.plywood.receive_stock",
  entity: ENTITY_STOCK_LEDGER,
  verb: "Create",
  input: z.object({
    ...movementInput,
    unitCostPaise: z.number().int().min(0),
    reason: z.string().max(400).optional(),
  }),
  preconditions: async (ctx, input) => assertTradeable(ctx.tx, input.productId, input.locationId),
  handler: async (ctx, input) => {
    const moved = await applyMovement(ctx.tx, ctx.actor, {
      ...input,
      kind: "purchase_inward",
      reason: input.reason ?? null,
    });
    return {
      result: { ledgerId: moved.ledgerId, onHandUnits: moved.onHandUnits },
      events: [{ name: "verity.plywood.stock_received", entityId: moved.ledgerId }],
    };
  },
};

export const issueStock: CommandDefinition<
  { productId: string; locationId: string; rackId?: string; qtyUnits: number; reason?: string },
  { ledgerId: string; unitCostPaise: number; onHandUnits: number }
> = {
  key: "verity.plywood.issue_stock",
  entity: ENTITY_STOCK_LEDGER,
  verb: "Create",
  input: z.object({ ...movementInput, reason: z.string().max(400).optional() }),
  preconditions: async (ctx, input) => assertTradeable(ctx.tx, input.productId, input.locationId),
  handler: async (ctx, input) => {
    const moved = await applyMovement(ctx.tx, ctx.actor, {
      ...input,
      kind: "sales_outward",
      reason: input.reason ?? null,
    });
    return {
      result: moved,
      events: [{ name: "verity.plywood.stock_issued", entityId: moved.ledgerId }],
    };
  },
};

export const transferStock: CommandDefinition<
  {
    productId: string;
    fromLocationId: string;
    toLocationId: string;
    toRackId?: string;
    qtyUnits: number;
  },
  { outLedgerId: string; inLedgerId: string }
> = {
  key: "verity.plywood.transfer_stock",
  entity: ENTITY_STOCK_LEDGER,
  verb: "Create",
  input: z.object({
    productId: z.string().uuid(),
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    toRackId: z.string().uuid().optional(),
    qtyUnits: z.number().int().positive(),
  }),
  preconditions: async (ctx, input) => {
    if (input.fromLocationId === input.toLocationId) {
      throw new ValidationError("E_VALIDATION: a transfer needs two different godowns");
    }
    await assertTradeable(ctx.tx, input.productId, input.fromLocationId);
    await assertTradeable(ctx.tx, input.productId, input.toLocationId);
  },
  handler: async (ctx, input) => {
    // Two rows, one transaction. The cost travels with the stock: the receiving
    // godown blends in what the sending godown was carrying it at, not a price
    // invented for the transfer — so moving stock between godowns can neither
    // create nor destroy value.
    const out = await applyMovement(ctx.tx, ctx.actor, {
      productId: input.productId,
      locationId: input.fromLocationId,
      kind: "transfer_out",
      qtyUnits: input.qtyUnits,
    });
    const incoming = await applyMovement(ctx.tx, ctx.actor, {
      productId: input.productId,
      locationId: input.toLocationId,
      rackId: input.toRackId ?? null,
      kind: "transfer_in",
      qtyUnits: input.qtyUnits,
      unitCostPaise: out.unitCostPaise,
    });
    return {
      result: { outLedgerId: out.ledgerId, inLedgerId: incoming.ledgerId },
      events: [{ name: "verity.plywood.stock_transferred", entityId: incoming.ledgerId }],
    };
  },
};

export const adjustStock: CommandDefinition<
  {
    productId: string;
    locationId: string;
    rackId?: string;
    qtyUnits: number;
    direction: "in" | "out";
    reason: string;
  },
  { ledgerId: string; onHandUnits: number }
> = {
  key: "verity.plywood.adjust_stock",
  entity: ENTITY_STOCK_LEDGER,
  // An adjustment is not an ordinary movement: it is someone asserting that the
  // system is wrong. ActionExecute rather than Create, so it can be granted to
  // the owner alone without also withholding ordinary receipts and issues.
  verb: "ActionExecute",
  input: z.object({
    ...movementInput,
    direction: z.enum(["in", "out"]),
    reason: z.string().min(3).max(400),
  }),
  preconditions: async (ctx, input) => assertTradeable(ctx.tx, input.productId, input.locationId),
  handler: async (ctx, input) => {
    const balance = await ctx.tx.stockBalance.findFirst({
      where: { productId: input.productId, locationId: input.locationId },
    });
    const moved = await applyMovement(ctx.tx, ctx.actor, {
      productId: input.productId,
      locationId: input.locationId,
      rackId: input.rackId ?? null,
      kind: input.direction === "in" ? "adjust_in" : "adjust_out",
      qtyUnits: input.qtyUnits,
      // Found stock comes in at what the godown already carries the board at.
      // Any other figure would be a purchase price nobody paid.
      unitCostPaise: balance?.avgUnitCostPaise ?? 0,
      reason: input.reason,
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_STOCK_BALANCE,
      entityId: balance?.id ?? moved.ledgerId,
      commandKey: "verity.plywood.adjust_stock",
      changes: diffFields({ qtyUnits: balance?.qtyUnits ?? 0 }, { qtyUnits: moved.onHandUnits }),
    });

    return {
      result: { ledgerId: moved.ledgerId, onHandUnits: moved.onHandUnits },
      events: [{ name: "verity.plywood.stock_adjusted", entityId: moved.ledgerId }],
    };
  },
};

export const recordDamagedStock: CommandDefinition<
  { productId: string; locationId: string; rackId?: string; qtyUnits: number; reason: string },
  { ledgerId: string; onHandUnits: number }
> = {
  key: "verity.plywood.record_damaged_stock",
  entity: ENTITY_STOCK_LEDGER,
  verb: "ActionExecute",
  input: z.object({ ...movementInput, reason: z.string().min(3).max(400) }),
  preconditions: async (ctx, input) => assertTradeable(ctx.tx, input.productId, input.locationId),
  handler: async (ctx, input) => {
    const moved = await applyMovement(ctx.tx, ctx.actor, {
      ...input,
      kind: "damaged_out",
      reason: input.reason,
    });
    return {
      result: { ledgerId: moved.ledgerId, onHandUnits: moved.onHandUnits },
      events: [{ name: "verity.plywood.stock_damaged", entityId: moved.ledgerId }],
    };
  },
};

export const recordReturnedStock: CommandDefinition<
  { productId: string; locationId: string; rackId?: string; qtyUnits: number; reason: string },
  { ledgerId: string; onHandUnits: number }
> = {
  key: "verity.plywood.record_returned_stock",
  entity: ENTITY_STOCK_LEDGER,
  verb: "ActionExecute",
  input: z.object({ ...movementInput, reason: z.string().min(3).max(400) }),
  preconditions: async (ctx, input) => assertTradeable(ctx.tx, input.productId, input.locationId),
  handler: async (ctx, input) => {
    const balance = await ctx.tx.stockBalance.findFirst({
      where: { productId: input.productId, locationId: input.locationId },
    });
    const moved = await applyMovement(ctx.tx, ctx.actor, {
      ...input,
      kind: "returned_stock",
      // Returned goods re-enter at what the godown carries them at, not at what
      // they were sold for. A return is not a purchase.
      unitCostPaise: balance?.avgUnitCostPaise ?? 0,
      reason: input.reason,
    });
    return {
      result: { ledgerId: moved.ledgerId, onHandUnits: moved.onHandUnits },
      events: [{ name: "verity.plywood.stock_returned", entityId: moved.ledgerId }],
    };
  },
};

/* --------------------------------- reads ---------------------------------- */

export const stockOnHand: QueryDefinition<
  { locationId?: string; productId?: string },
  Array<{
    productId: string;
    productName: string;
    brandName: string;
    grade: string;
    unitLabel: string;
    locationId: string;
    locationName: string;
    qtyUnits: number;
    avgUnitCostPaise: number;
    valuePaise: number;
  }>
> = {
  key: "verity.plywood.stock_on_hand",
  entity: ENTITY_STOCK_BALANCE,
  input: z.object({
    locationId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
  }),
  handler: async (ctx, input) => {
    const balances = await ctx.tx.stockBalance.findMany({
      where: {
        ...(input.locationId ? { locationId: input.locationId } : {}),
        ...(input.productId ? { productId: input.productId } : {}),
      },
      include: {
        product: { include: { brand: { select: { name: true } } } },
        location: { select: { name: true } },
      },
    });

    return balances
      .map((balance) => ({
        productId: balance.productId,
        productName: balance.product.name,
        brandName: balance.product.brand.name,
        grade: balance.product.grade,
        unitLabel: balance.product.unitLabel,
        locationId: balance.locationId,
        locationName: balance.location.name,
        qtyUnits: balance.qtyUnits,
        avgUnitCostPaise: balance.avgUnitCostPaise,
        // Value at weighted average cost (P1), not at what it might sell for.
        // Naming the method matters: an owner reading this figure is entitled to
        // know which of three possible numbers it is.
        valuePaise: balance.qtyUnits * balance.avgUnitCostPaise,
      }))
      .sort(
        (a, b) =>
          a.locationName.localeCompare(b.locationName) ||
          a.brandName.localeCompare(b.brandName) ||
          a.productName.localeCompare(b.productName),
      );
  },
};

export const lowStock: QueryDefinition<
  Record<string, never>,
  Array<{
    productId: string;
    productName: string;
    brandName: string;
    unitLabel: string;
    onHandUnits: number;
    reorderLevelUnits: number;
  }>
> = {
  key: "verity.plywood.low_stock",
  entity: ENTITY_STOCK_BALANCE,
  input: z.object({}),
  handler: async (ctx) => {
    // Across every godown, not per godown: the buying decision is made for the
    // business, and a board short in Okhla but plentiful in Noida is a transfer,
    // not a purchase order.
    const products = await ctx.tx.plywoodProduct.findMany({
      where: { active: true, reorderLevelUnits: { gt: 0 } },
      include: { brand: { select: { name: true } }, balances: true },
    });

    return products
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        brandName: product.brand.name,
        unitLabel: product.unitLabel,
        onHandUnits: product.balances.reduce((sum, balance) => sum + balance.qtyUnits, 0),
        reorderLevelUnits: product.reorderLevelUnits,
      }))
      .filter((row) => row.onHandUnits <= row.reorderLevelUnits)
      .sort((a, b) => a.onHandUnits - b.onHandUnits);
  },
};

export const productMovements: QueryDefinition<
  { productId: string; limit?: number },
  Array<{
    id: string;
    kind: string;
    qtyDeltaUnits: number;
    unitCostPaise: number;
    locationName: string;
    rackLabel: string | null;
    reason: string | null;
    occurredAt: Date;
  }>
> = {
  key: "verity.plywood.product_movements",
  entity: ENTITY_STOCK_LEDGER,
  input: z.object({
    productId: z.string().uuid(),
    limit: z.number().int().min(1).max(500).optional(),
  }),
  handler: async (ctx, input) => {
    const entries = await ctx.tx.stockLedgerEntry.findMany({
      where: { productId: input.productId },
      orderBy: { occurredAt: "desc" },
      take: input.limit ?? 100,
      include: { location: { select: { name: true } }, rack: { select: { rackLabel: true } } },
    });

    return entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      qtyDeltaUnits: entry.qtyDeltaUnits,
      unitCostPaise: entry.unitCostPaise,
      locationName: entry.location.name,
      rackLabel: entry.rack?.rackLabel ?? null,
      reason: entry.reason,
      occurredAt: entry.occurredAt,
    }));
  },
};
