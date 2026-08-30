import { z } from "zod";
import { financialYearOf, nextDocumentNumber } from "./finance";
import { assertGodownInScope, reachableGodownIds } from "./scope";
import { ValidationError, type CommandDefinition } from "@/server/platform/command";
import { type QueryDefinition } from "@/server/platform/query";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { transition } from "@/server/platform/state";
import type { TenantScopedClient } from "@/server/platform/tenancy";
import {
  ENTITY_CUSTOMER,
  ENTITY_CUSTOMER_PRICE,
  ENTITY_PURCHASE_ORDER,
  ENTITY_RESERVATION,
  ENTITY_SALES_ORDER,
  ENTITY_SUPPLIER,
  ENTITY_SUPPLIER_PRICE,
} from "./keys";
import { applyMovement, serviceProductIds } from "./stock";

/**
 * PLYWOOD STAGES 3 AND 4 — trading partners and orders.
 *
 * Requirement source: plywood.md §1.2 and §1.3. P5 (a reservation table) is
 * resolved in implementation/plywood-decisions.md.
 *
 * Purchase and sale live in one module because they are the same shape pointing
 * in opposite directions, and it is useful to read them beside each other. They
 * are NOT one abstraction with a direction flag: a credit limit, a partial
 * receipt and a reservation are three different rules, and collapsing them would
 * produce a union nobody can follow.
 */

/** A GSTIN is 15 characters in a fixed shape; the column checks the same rule. */
const GSTIN = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "that is not a valid GSTIN");

/** Two digits. It decides CGST + SGST against IGST (P4). */
const STATE_CODE = z.string().regex(/^[0-9]{2}$/, "a GST state code is two digits");

/* ================================ suppliers =============================== */

export const createSupplier: CommandDefinition<
  { displayName: string; gstin?: string; phone?: string; email?: string; stateCode?: string },
  { id: string }
> = {
  key: "verity.plywood.create_supplier",
  entity: ENTITY_SUPPLIER,
  verb: "Create",
  input: z.object({
    displayName: z.string().min(1).max(200),
    gstin: GSTIN.optional(),
    phone: z.string().max(40).optional(),
    email: z.string().email().max(200).optional(),
    stateCode: STATE_CODE.optional(),
  }),
  handler: async (ctx, input) => {
    const supplier = await ctx.tx.plywoodSupplier.create({
      data: {
        tenantId: ctx.actor.tenantId,
        displayName: input.displayName,
        gstin: input.gstin ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        stateCode: input.stateCode ?? null,
      },
    });
    return {
      result: { id: supplier.id },
      events: [{ name: "verity.plywood.supplier_created", entityId: supplier.id }],
    };
  },
};

export const setSupplierPrice: CommandDefinition<
  { supplierId: string; productId: string; negotiatedCostPaise: number },
  { id: string }
> = {
  key: "verity.plywood.set_supplier_price",
  entity: ENTITY_SUPPLIER_PRICE,
  verb: "Edit",
  input: z.object({
    supplierId: z.string().uuid(),
    productId: z.string().uuid(),
    negotiatedCostPaise: z.number().int().min(0),
  }),
  handler: async (ctx, input) => {
    // Upsert rather than create-or-fail: a negotiated price is one current fact
    // per supplier per board, and the history of what it used to be lives in the
    // activity stream and in the orders that were placed at it.
    const price = await ctx.tx.plywoodSupplierPrice.upsert({
      where: {
        tenantId_supplierId_productId: {
          tenantId: ctx.actor.tenantId,
          supplierId: input.supplierId,
          productId: input.productId,
        },
      },
      create: {
        tenantId: ctx.actor.tenantId,
        supplierId: input.supplierId,
        productId: input.productId,
        negotiatedCostPaise: input.negotiatedCostPaise,
      },
      update: { negotiatedCostPaise: input.negotiatedCostPaise, version: { increment: 1 } },
    });
    return {
      result: { id: price.id },
      events: [{ name: "verity.plywood.supplier_price_set", entityId: price.id }],
    };
  },
};

/* ================================ customers =============================== */

export const createCustomer: CommandDefinition<
  {
    displayName: string;
    gstin?: string;
    phone?: string;
    email?: string;
    stateCode?: string;
    creditLimitPaise?: number;
  },
  { id: string }
> = {
  key: "verity.plywood.create_customer",
  entity: ENTITY_CUSTOMER,
  verb: "Create",
  input: z.object({
    displayName: z.string().min(1).max(200),
    gstin: GSTIN.optional(),
    phone: z.string().max(40).optional(),
    email: z.string().email().max(200).optional(),
    stateCode: STATE_CODE.optional(),
    creditLimitPaise: z.number().int().min(0).optional(),
  }),
  handler: async (ctx, input) => {
    const customer = await ctx.tx.plywoodCustomer.create({
      data: {
        tenantId: ctx.actor.tenantId,
        displayName: input.displayName,
        gstin: input.gstin ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        stateCode: input.stateCode ?? null,
        // Zero by default: a new customer is cash-only until someone decides
        // otherwise, rather than starting with credit nobody granted.
        creditLimitPaise: input.creditLimitPaise ?? 0,
      },
    });
    return {
      result: { id: customer.id },
      events: [{ name: "verity.plywood.customer_created", entityId: customer.id }],
    };
  },
};

export const setCreditLimit: CommandDefinition<
  { customerId: string; creditLimitPaise: number },
  { id: string }
> = {
  key: "verity.plywood.set_credit_limit",
  entity: ENTITY_CUSTOMER,
  // Granting credit is not editing a phone number. ActionExecute so it can be
  // held by the owner and finance without also withholding ordinary edits.
  verb: "ActionExecute",
  input: z.object({ customerId: z.string().uuid(), creditLimitPaise: z.number().int().min(0) }),
  handler: async (ctx, input) => {
    const before = await ctx.tx.plywoodCustomer.findUniqueOrThrow({
      where: { id: input.customerId },
    });
    const after = await ctx.tx.plywoodCustomer.update({
      where: { id: input.customerId },
      data: { creditLimitPaise: input.creditLimitPaise, version: { increment: 1 } },
    });

    // Who raised whose limit, and from what, is the first question after a bad
    // debt. The diff answers it.
    await recordActivity(ctx, {
      entityKey: ENTITY_CUSTOMER,
      entityId: after.id,
      commandKey: "verity.plywood.set_credit_limit",
      changes: diffFields(
        { creditLimitPaise: before.creditLimitPaise },
        { creditLimitPaise: after.creditLimitPaise },
      ),
    });

    return {
      result: { id: after.id },
      events: [{ name: "verity.plywood.credit_limit_set", entityId: after.id }],
    };
  },
};

export const setCustomerPrice: CommandDefinition<
  { customerId: string; productId: string; customPricePaise: number },
  { id: string }
> = {
  key: "verity.plywood.set_customer_price",
  entity: ENTITY_CUSTOMER_PRICE,
  verb: "Edit",
  input: z.object({
    customerId: z.string().uuid(),
    productId: z.string().uuid(),
    customPricePaise: z.number().int().min(0),
  }),
  handler: async (ctx, input) => {
    const price = await ctx.tx.plywoodCustomerPrice.upsert({
      where: {
        tenantId_customerId_productId: {
          tenantId: ctx.actor.tenantId,
          customerId: input.customerId,
          productId: input.productId,
        },
      },
      create: {
        tenantId: ctx.actor.tenantId,
        customerId: input.customerId,
        productId: input.productId,
        customPricePaise: input.customPricePaise,
      },
      update: { customPricePaise: input.customPricePaise, version: { increment: 1 } },
    });
    return {
      result: { id: price.id },
      events: [{ name: "verity.plywood.customer_price_set", entityId: price.id }],
    };
  },
};

/* ============================== purchase side ============================= */

export const createPurchaseOrder: CommandDefinition<
  {
    supplierId: string;
    locationId: string;
    reference?: string;
    lines: Array<{ productId: string; qtyOrdered: number; unitCostPaise?: number }>;
  },
  { id: string; totalCostPaise: number }
> = {
  key: "verity.plywood.create_purchase_order",
  entity: ENTITY_PURCHASE_ORDER,
  verb: "Create",
  input: z.object({
    supplierId: z.string().uuid(),
    locationId: z.string().uuid(),
    reference: z.string().max(60).optional(),
    lines: z
      .array(
        z.object({
          productId: z.string().uuid(),
          qtyOrdered: z.number().int().positive(),
          unitCostPaise: z.number().int().min(0).optional(),
        }),
      )
      .min(1),
  }),
  preconditions: async (ctx, input) => {
    const supplier = await ctx.tx.plywoodSupplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new ValidationError("E_VALIDATION: supplier not found in this tenant");
    if (!supplier.active) {
      throw new ValidationError("E_VALIDATION: that supplier is no longer traded with");
    }
    const godown = await ctx.tx.location.findUnique({ where: { id: input.locationId } });
    if (!godown) throw new ValidationError("E_VALIDATION: godown not found in this tenant");
  },
  handler: async (ctx, input) => {
    const products = await ctx.tx.plywoodProduct.findMany({
      where: { id: { in: input.lines.map((line) => line.productId) }, active: true },
    });
    if (products.length !== new Set(input.lines.map((line) => line.productId)).size) {
      throw new ValidationError("E_VALIDATION: a board on this order is unknown or withdrawn");
    }

    const negotiated = await ctx.tx.plywoodSupplierPrice.findMany({
      where: { supplierId: input.supplierId },
    });

    const priced = input.lines.map((line) => {
      const product = products.find((candidate) => candidate.id === line.productId)!;
      const agreed = negotiated.find((price) => price.productId === line.productId);
      // The caller may override; otherwise the negotiated price applies. An
      // order with neither is refused rather than defaulted to zero, because a
      // zero-cost receipt would poison the weighted average silently.
      const unitCostPaise = line.unitCostPaise ?? agreed?.negotiatedCostPaise;
      if (unitCostPaise === undefined) {
        throw new ValidationError(
          `E_VALIDATION: no agreed price for ${product.name} with this supplier, and none given`,
        );
      }
      return {
        productId: line.productId,
        // Snapshots. A catalogue edit must never rewrite a placed order.
        productNameSnapshot: product.name,
        hsnCodeSnapshot: product.hsnCode,
        qtyOrdered: line.qtyOrdered,
        unitCostPaise,
      };
    });

    const totalCostPaise = priced.reduce(
      (sum, line) => sum + line.qtyOrdered * line.unitCostPaise,
      0,
    );

    // Layer 2 on the write path (P0-01). Holding Create on purchase orders is
    // not permission to order stock into somebody else's godown.
    await assertGodownInScope(
      ctx.tx,
      ctx.actor,
      ENTITY_PURCHASE_ORDER,
      "Create",
      input.locationId,
    );

    const order = await ctx.tx.plywoodPurchaseOrder.create({
      data: {
        tenantId: ctx.actor.tenantId,
        supplierId: input.supplierId,
        locationId: input.locationId,
        reference: input.reference ?? null,
        totalCostPaise,
      },
    });

    // Lines written separately rather than as a nested create. The relation is
    // keyed on (tenantId, purchaseOrderId), so Prisma treats `tenantId` as part
    // of the relation and refuses it as a nested field — the composite key that
    // makes a cross-tenant line impossible also makes the nested form
    // unavailable. Same transaction either way.
    await ctx.tx.plywoodPurchaseOrderLine.createMany({
      data: priced.map((line) => ({
        ...line,
        tenantId: ctx.actor.tenantId,
        purchaseOrderId: order.id,
      })),
    });

    return {
      result: { id: order.id, totalCostPaise },
      events: [{ name: "verity.plywood.purchase_order_created", entityId: order.id }],
    };
  },
};

export const submitPurchaseOrder: CommandDefinition<{ orderId: string }, { id: string }> = {
  key: "verity.plywood.submit_purchase_order",
  entity: ENTITY_PURCHASE_ORDER,
  verb: "ActionExecute",
  input: z.object({ orderId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodPurchaseOrder.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { lines: true },
    });
    const moved = await transition(ctx, {
      entityKey: ENTITY_PURCHASE_ORDER,
      entityId: order.id,
      fromKey: order.state,
      toKey: "submitted",
    });
    await ctx.tx.plywoodPurchaseOrder.update({
      where: { id: order.id },
      data: { state: "submitted", version: { increment: 1 } },
    });
    return {
      result: { id: order.id },
      events: [
        moved.event,
        { name: "verity.plywood.purchase_order_submitted", entityId: order.id },
      ],
    };
  },
};

export const receiveGoods: CommandDefinition<
  {
    orderId: string;
    rackId?: string;
    supplierChallanNumber?: string;
    notes?: string;
    lines: Array<{ productId: string; qtyReceived: number }>;
  },
  { id: string; state: string; receiptId: string; receiptNumber: string }
> = {
  key: "verity.plywood.receive_goods",
  entity: ENTITY_PURCHASE_ORDER,
  verb: "ActionExecute",
  input: z.object({
    orderId: z.string().uuid(),
    rackId: z.string().uuid().optional(),
    /** The supplier's own delivery note, as written on the paper. */
    supplierChallanNumber: z.string().max(60).optional(),
    notes: z.string().max(500).optional(),
    lines: z
      .array(
        z.object({ productId: z.string().uuid(), qtyReceived: z.number().int().positive() }),
      )
      .min(1),
  }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodPurchaseOrder.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { lines: true },
    });
    if (order.state === "draft") {
      throw new ValidationError("E_VALIDATION: submit the order before receiving against it");
    }
    if (order.state === "completed" || order.state === "cancelled") {
      throw new ValidationError("E_VALIDATION: that order is closed");
    }

    // Layer 2 on the write path: receiving into a godown is an action against
    // that godown, not merely against the order.
    await assertGodownInScope(
      ctx.tx,
      ctx.actor,
      ENTITY_PURCHASE_ORDER,
      "ActionExecute",
      order.locationId,
    );

    const services = await serviceProductIds(
      ctx.tx,
      input.lines.map((line) => line.productId),
    );

    // THE RECEIPT IS A DOCUMENT (audit P0-04, slice 3).
    //
    // It used to be an incremented field plus a stock movement pointing at
    // nothing. A receipt nobody can open, print, or match against a supplier
    // invoice is not a receipt; it is a side effect. Numbered gaplessly through
    // the same allocator invoices use, because a receipt is what a supplier
    // dispute turns on.
    const receivedAt = new Date();
    const financialYear = financialYearOf(receivedAt);
    const numbering = await nextDocumentNumber(ctx.tx, ctx.actor.tenantId, "GRN", financialYear);

    const receipt = await ctx.tx.plywoodGoodsReceipt.create({
      data: {
        tenantId: ctx.actor.tenantId,
        purchaseOrderId: order.id,
        locationId: order.locationId,
        receiptNumber: numbering.invoiceNumber,
        financialYear,
        supplierChallanNumber: input.supplierChallanNumber ?? null,
        receivedAt,
        receivedBy: ctx.actor.userId,
        notes: input.notes ?? null,
      },
    });

    for (const received of input.lines) {
      const line = order.lines.find((candidate) => candidate.productId === received.productId);
      if (!line) {
        throw new ValidationError("E_VALIDATION: that board is not on this order");
      }
      const outstanding = line.qtyOrdered - line.qtyReceived;
      if (received.qtyReceived > outstanding) {
        // Refused rather than clamped. An over-receipt is a real event that
        // needs the order amended: silently accepting it would make "what is
        // still owed" negative and every outstanding report inherit that.
        throw new ValidationError(
          `E_VALIDATION: ${line.productNameSnapshot} has ${outstanding} outstanding, cannot receive ${received.qtyReceived}`,
        );
      }

      await ctx.tx.plywoodPurchaseOrderLine.update({
        where: { id: line.id },
        data: { qtyReceived: { increment: received.qtyReceived } },
      });

      // The receipt IS the stock movement — except for a service line, which
      // has no godown to land in. The order progress above is still real and
      // recorded; only the stock side of it is skipped.
      if (services.has(received.productId)) continue;

      await applyMovement(ctx.tx, ctx.actor, {
        productId: received.productId,
        locationId: order.locationId,
        rackId: input.rackId ?? null,
        kind: "purchase_inward",
        qtyUnits: received.qtyReceived,
        unitCostPaise: line.unitCostPaise,
        // The movement now says what caused it. This is what makes the
        // specification's §13 possible: open a quantity, see the receipt.
        source: { type: "goods_receipt", id: receipt.id, number: receipt.receiptNumber },
      });
    }

    // Written after the movements so a refused over-receipt leaves no line
    // behind. The whole handler is one transaction, so this is about reading
    // order rather than durability.
    await ctx.tx.plywoodGoodsReceiptLine.createMany({
      data: input.lines.map((received) => {
        const line = order.lines.find((candidate) => candidate.productId === received.productId)!;
        return {
          tenantId: ctx.actor.tenantId,
          receiptId: receipt.id,
          purchaseOrderLineId: line.id,
          productId: received.productId,
          productNameSnapshot: line.productNameSnapshot,
          rackId: input.rackId ?? null,
          qtyReceived: received.qtyReceived,
          unitCostPaise: line.unitCostPaise,
        };
      }),
    });

    const after = await ctx.tx.plywoodPurchaseOrderLine.findMany({
      where: { purchaseOrderId: order.id },
    });
    const complete = after.every((line) => line.qtyReceived >= line.qtyOrdered);
    const target = complete ? "completed" : "receiving";

    const stateEvents = [];
    if (order.state !== target) {
      const moved = await transition(ctx, {
        entityKey: ENTITY_PURCHASE_ORDER,
        entityId: order.id,
        fromKey: order.state,
        toKey: target,
      });
      await ctx.tx.plywoodPurchaseOrder.update({
        where: { id: order.id },
        data: { state: target, version: { increment: 1 } },
      });
      stateEvents.push(moved.event);
    }

    return {
      result: {
        id: order.id,
        state: target,
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
      },
      events: [
        ...stateEvents,
        {
          name: complete
            ? "verity.plywood.purchase_order_completed"
            : "verity.plywood.goods_partially_received",
          entityId: order.id,
          payload: { receiptNumber: receipt.receiptNumber },
        },
      ],
    };
  },
};

export const cancelPurchaseOrder: CommandDefinition<
  { orderId: string; reason: string },
  { id: string }
> = {
  key: "verity.plywood.cancel_purchase_order",
  entity: ENTITY_PURCHASE_ORDER,
  verb: "ActionExecute",
  input: z.object({ orderId: z.string().uuid(), reason: z.string().min(3).max(400) }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodPurchaseOrder.findUniqueOrThrow({
      where: { id: input.orderId },
    });
    await transition(ctx, {
      entityKey: ENTITY_PURCHASE_ORDER,
      entityId: order.id,
      fromKey: order.state,
      toKey: "cancelled",
    });
    await ctx.tx.plywoodPurchaseOrder.update({
      where: { id: order.id },
      data: { state: "cancelled", version: { increment: 1 } },
    });
    await recordActivity(ctx, {
      entityKey: ENTITY_PURCHASE_ORDER,
      entityId: input.orderId,
      commandKey: "verity.plywood.cancel_purchase_order",
      changes: diffFields({ cancelReason: "" }, { cancelReason: input.reason }),
    });
    return {
      result: { id: input.orderId },
      events: [{ name: "verity.plywood.purchase_order_cancelled", entityId: input.orderId }],
    };
  },
};

/* =============================== sales side =============================== */

/**
 * What a customer already owes plus what they are about to.
 *
 * Until the finance stage exists there are no invoices, so exposure is the value
 * of their open orders. Stage 6 adds invoiced-and-unpaid to the same function
 * rather than introducing a second notion of "owed" beside it — which is the
 * mistake P3 exists to prevent.
 */
/**
 * What this customer currently owes us, plus what we have committed to supply
 * them and not yet billed.
 *
 * Authority: taskplans/45_plywood_workflow_program.md §4.1 — the single
 * canonical formula. Any second definition of exposure anywhere in this
 * capability is a defect.
 *
 * ```text
 * exposure = unallocated_receivables + approved_uninvoiced_commitments
 * ```
 *
 * THE DEFECT THIS REPLACES (audit P0-02)
 * The previous implementation summed open orders and nothing else, and
 * dispatch moved an order to `completed`. So the moment goods left the
 * godown the customer's exposure fell to zero — while they still owed the
 * whole invoice. The next order then passed a credit check it should have
 * failed. Exposure fell precisely when the business's risk was highest.
 *
 * The three properties that must hold, and why each term is shaped as it is:
 *
 *   1. Issuing goods must not reduce exposure. It does not: the commitment
 *      converts into a receivable when the invoice is raised, and the
 *      receivable clears only when a payment is allocated against it.
 *   2. Nothing is counted twice. An order that has been invoiced contributes
 *      through its receivable; subtracting the invoiced value from the
 *      commitment is what stops it also contributing as a commitment.
 *   3. A draft order is not a commitment. Only an order the business has
 *      actually approved constrains further credit.
 *
 * Advances reduce exposure only once allocated. A disputed invoice is NOT
 * excluded — a dispute is not a payment.
 */
export async function customerExposurePaise(
  tx: TenantScopedClient,
  customerId: string,
): Promise<number> {
  // Term 1 — unallocated receivables. Gross of tax: the customer owes the
  // total on the document, not its taxable value.
  const invoices = await tx.plywoodInvoice.findMany({
    where: { customerId },
    select: {
      totalPaise: true,
      payments: { select: { amountPaise: true } },
      // Slice 5 fills in the term slice 1 left at zero: a credit note reduces
      // what the customer owes, and an exposure that ignores it holds credit
      // against money the business has already agreed it will not collect.
      notes: { select: { noteType: true, totalPaise: true } },
    },
  });

  const receivables = invoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((p, payment) => p + payment.amountPaise, 0);
    const credited = invoice.notes
      .filter((note) => note.noteType === "credit")
      .reduce((c, note) => c + note.totalPaise, 0);
    const debited = invoice.notes
      .filter((note) => note.noteType === "debit")
      .reduce((d, note) => d + note.totalPaise, 0);

    // Clamped at zero per invoice, not in aggregate: an overpayment on one
    // invoice is money on account, and letting it mask a different unpaid
    // invoice would understate exposure.
    return sum + Math.max(0, invoice.totalPaise + debited - paid - credited);
  }, 0);

  // Term 2 — approved but not yet invoiced. `COMMITTED_ORDER_STATES` is the
  // set of states in which the business has promised to supply; a draft has
  // promised nothing and a cancelled order has withdrawn the promise.
  const orders = await tx.plywoodSalesOrder.findMany({
    where: { customerId, state: { in: [...COMMITTED_ORDER_STATES] } },
    select: { id: true, totalPricePaise: true },
  });

  // `PlywoodSalesOrder` carries no back-relation to its invoices, so the
  // invoiced value is fetched once for the whole set rather than per order.
  const invoicedByOrder = new Map<string, number>();
  if (orders.length > 0) {
    const raised = await tx.plywoodInvoice.findMany({
      where: { salesOrderId: { in: orders.map((order) => order.id) } },
      select: { salesOrderId: true, totalPaise: true },
    });
    for (const invoice of raised) {
      if (!invoice.salesOrderId) continue;
      invoicedByOrder.set(
        invoice.salesOrderId,
        (invoicedByOrder.get(invoice.salesOrderId) ?? 0) + invoice.totalPaise,
      );
    }
  }

  const commitments = orders.reduce((sum, order) => {
    const invoiced = invoicedByOrder.get(order.id) ?? 0;
    return sum + Math.max(0, order.totalPricePaise - invoiced);
  }, 0);

  return receivables + commitments;
}

/**
 * Order states in which the business has committed to supply.
 *
 * `draft` is excluded (nothing promised) and so is `cancelled` (promise
 * withdrawn). `completed` IS included: a completed order whose invoice is
 * unpaid still represents money owed, and it is the subtraction of the
 * invoiced amount — not the order's state — that prevents double counting.
 */
export const COMMITTED_ORDER_STATES = [
  "pending_credit",
  "approved",
  "dispatching",
  "completed",
] as const;

export const createSalesOrder: CommandDefinition<
  {
    customerId: string;
    locationId: string;
    reference?: string;
    lines: Array<{ productId: string; qtyOrdered: number; unitPricePaise?: number }>;
  },
  { id: string; totalPricePaise: number; state: string }
> = {
  key: "verity.plywood.create_sales_order",
  entity: ENTITY_SALES_ORDER,
  verb: "Create",
  input: z.object({
    customerId: z.string().uuid(),
    locationId: z.string().uuid(),
    reference: z.string().max(60).optional(),
    lines: z
      .array(
        z.object({
          productId: z.string().uuid(),
          qtyOrdered: z.number().int().positive(),
          unitPricePaise: z.number().int().min(0).optional(),
        }),
      )
      .min(1),
  }),
  preconditions: async (ctx, input) => {
    const customer = await ctx.tx.plywoodCustomer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new ValidationError("E_VALIDATION: customer not found in this tenant");
    if (!customer.active) throw new ValidationError("E_VALIDATION: that customer is inactive");
    const godown = await ctx.tx.location.findUnique({ where: { id: input.locationId } });
    if (!godown) throw new ValidationError("E_VALIDATION: godown not found in this tenant");
  },
  handler: async (ctx, input) => {
    const products = await ctx.tx.plywoodProduct.findMany({
      where: { id: { in: input.lines.map((line) => line.productId) }, active: true },
    });
    if (products.length !== new Set(input.lines.map((line) => line.productId)).size) {
      throw new ValidationError("E_VALIDATION: a board on this order is unknown or withdrawn");
    }

    const agreed = await ctx.tx.plywoodCustomerPrice.findMany({
      where: { customerId: input.customerId },
    });

    const priced = input.lines.map((line) => {
      const product = products.find((candidate) => candidate.id === line.productId)!;
      const customerPrice = agreed.find((price) => price.productId === line.productId);
      const unitPricePaise = line.unitPricePaise ?? customerPrice?.customPricePaise;
      if (unitPricePaise === undefined) {
        throw new ValidationError(
          `E_VALIDATION: no price for ${product.name} for this customer, and none given`,
        );
      }
      return {
        productId: line.productId,
        productNameSnapshot: product.name,
        hsnCodeSnapshot: product.hsnCode,
        qtyOrdered: line.qtyOrdered,
        unitPricePaise,
      };
    });

    const totalPricePaise = priced.reduce(
      (sum, line) => sum + line.qtyOrdered * line.unitPricePaise,
      0,
    );

    const customer = await ctx.tx.plywoodCustomer.findUniqueOrThrow({
      where: { id: input.customerId },
    });
    const exposure = await customerExposurePaise(ctx.tx, input.customerId);

    // The credit check is a PRECONDITION of the order, not a warning on a
    // screen (MET-ACT-003). A limit enforced only in the interface is enforced
    // until the first person who uses a different one.
    const overLimit = exposure + totalPricePaise > customer.creditLimitPaise;

    // Layer 2 on the write path (P0-01): the same rule for selling out of a
    // godown as for buying into one.
    await assertGodownInScope(
      ctx.tx,
      ctx.actor,
      ENTITY_SALES_ORDER,
      "Create",
      input.locationId,
    );

    const order = await ctx.tx.plywoodSalesOrder.create({
      data: {
        tenantId: ctx.actor.tenantId,
        customerId: input.customerId,
        locationId: input.locationId,
        reference: input.reference ?? null,
        totalPricePaise,
      },
    });

    // Separately, for the same reason as a purchase order's lines.
    await ctx.tx.plywoodSalesOrderLine.createMany({
      data: priced.map((line) => ({
        ...line,
        tenantId: ctx.actor.tenantId,
        salesOrderId: order.id,
      })),
    });

    // Blocked rather than refused. The order is real and someone with authority
    // may still approve it; refusing outright would push the business to write
    // it down somewhere Verity cannot see.
    const target = overLimit ? "pending_credit" : "approved";
    await transition(ctx, {
      entityKey: ENTITY_SALES_ORDER,
      entityId: order.id,
      fromKey: order.state,
      toKey: target,
    });
    await ctx.tx.plywoodSalesOrder.update({
      where: { id: order.id },
      data: { state: target, version: { increment: 1 } },
    });

    return {
      result: { id: order.id, totalPricePaise, state: target },
      events: [
        { name: "verity.plywood.sales_order_created", entityId: order.id },
        ...(overLimit
          ? [{ name: "verity.plywood.sales_order_held_for_credit", entityId: order.id }]
          : []),
      ],
    };
  },
};

export const approveCredit: CommandDefinition<
  { orderId: string; reason: string },
  { id: string }
> = {
  key: "verity.plywood.approve_credit",
  entity: ENTITY_SALES_ORDER,
  verb: "ActionExecute",
  input: z.object({ orderId: z.string().uuid(), reason: z.string().min(3).max(400) }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodSalesOrder.findUniqueOrThrow({
      where: { id: input.orderId },
    });
    await transition(ctx, {
      entityKey: ENTITY_SALES_ORDER,
      entityId: order.id,
      fromKey: order.state,
      toKey: "approved",
    });
    await ctx.tx.plywoodSalesOrder.update({
      where: { id: order.id },
      data: { state: "approved", version: { increment: 1 } },
    });
    // Overriding a credit limit is exactly the decision someone asks about
    // after a bad debt, so the reason is mandatory and recorded.
    await recordActivity(ctx, {
      entityKey: ENTITY_SALES_ORDER,
      entityId: input.orderId,
      commandKey: "verity.plywood.approve_credit",
      changes: diffFields({ creditOverrideReason: "" }, { creditOverrideReason: input.reason }),
    });
    return {
      result: { id: input.orderId },
      events: [{ name: "verity.plywood.credit_approved", entityId: input.orderId }],
    };
  },
};

/**
 * Available = on hand − live reservations, for one board in one godown.
 *
 * Exported because the reservation command and the availability query must agree
 * on the definition; two implementations of "available" is how a business ends up
 * promising the same forty sheets twice.
 */
/**
 * Serializes concurrent reservation of the same product in the same godown.
 *
 * Authority: audit P0-06. Availability was read without a lock, so two
 * requests could both see 40 available and both reserve 40 — overselling stock
 * that physically exists once.
 *
 * A transaction-scoped advisory lock rather than `SELECT ... FOR UPDATE`,
 * because the row that would be locked is the `stock_balance`, and for a
 * product that has never moved in this godown **there is no such row** — the
 * very case where two concurrent first reservations race. An advisory key
 * exists whether or not the row does.
 *
 * Released automatically at commit or rollback; nothing can leak a lock.
 */
async function lockAvailability(
  tx: TenantScopedClient,
  productId: string,
  locationId: string,
): Promise<void> {
  // `$executeRaw`, not `$queryRaw`: pg_advisory_xact_lock returns void and the
  // client cannot deserialize a void column.
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${`${productId}:${locationId}`}, 0)
    )`;
}

export async function availableUnits(
  tx: TenantScopedClient,
  productId: string,
  locationId: string,
  /**
   * Take the lock first. Required by any caller that is about to *consume*
   * what it reads; a read for display does not need it and should not pay for
   * it.
   */
  options: { forUpdate?: boolean } = {},
): Promise<{ onHandUnits: number; reservedUnits: number; availableUnits: number }> {
  if (options.forUpdate) await lockAvailability(tx, productId, locationId);
  const balance = await tx.stockBalance.findFirst({ where: { productId, locationId } });
  const held = await tx.plywoodStockReservation.aggregate({
    where: { productId, locationId, releasedAt: null },
    _sum: { qtyUnits: true },
  });
  const onHandUnits = balance?.qtyUnits ?? 0;
  const reservedUnits = held._sum.qtyUnits ?? 0;
  return { onHandUnits, reservedUnits, availableUnits: onHandUnits - reservedUnits };
}

export const reserveForOrder: CommandDefinition<
  { orderId: string },
  { reserved: Array<{ productId: string; qtyUnits: number }> }
> = {
  key: "verity.plywood.reserve_for_order",
  entity: ENTITY_RESERVATION,
  verb: "Create",
  input: z.object({ orderId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodSalesOrder.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { lines: true, reservations: { where: { releasedAt: null } } },
    });
    if (order.state !== "approved") {
      throw new ValidationError("E_VALIDATION: only an approved order can hold stock");
    }
    if (order.reservations.length > 0) {
      throw new ValidationError("E_VALIDATION: this order already holds stock");
    }

    const services = await serviceProductIds(
      ctx.tx,
      order.lines.map((line) => line.productId),
    );

    const reserved: Array<{ productId: string; qtyUnits: number }> = [];
    for (const line of order.lines) {
      // A service line has nothing to hold — `availableUnits` would always
      // read 0 for it (no stock_balance row exists), refusing every order
      // that includes one. Skip straight to counting it reserved.
      if (services.has(line.productId)) {
        reserved.push({ productId: line.productId, qtyUnits: line.qtyOrdered });
        continue;
      }

      // forUpdate: this read decides a write. Without the lock two orders can
      // both reserve the last sheet (audit P0-06).
      const { availableUnits: free } = await availableUnits(
        ctx.tx,
        line.productId,
        order.locationId,
        { forUpdate: true },
      );
      if (free < line.qtyOrdered) {
        // The whole hold fails rather than reserving what it can. A partial
        // hold on a multi-line order is a promise the business cannot keep and
        // would discover at dispatch.
        throw new ValidationError(
          `E_VALIDATION: ${line.productNameSnapshot} has ${free} available, cannot hold ${line.qtyOrdered}`,
        );
      }
      await ctx.tx.plywoodStockReservation.create({
        data: {
          tenantId: ctx.actor.tenantId,
          productId: line.productId,
          locationId: order.locationId,
          salesOrderId: order.id,
          qtyUnits: line.qtyOrdered,
        },
      });
      reserved.push({ productId: line.productId, qtyUnits: line.qtyOrdered });
    }

    await transition(ctx, {
      entityKey: ENTITY_SALES_ORDER,
      entityId: order.id,
      fromKey: order.state,
      toKey: "dispatching",
    });
    await ctx.tx.plywoodSalesOrder.update({
      where: { id: order.id },
      data: { state: "dispatching", version: { increment: 1 } },
    });

    return {
      result: { reserved },
      events: [{ name: "verity.plywood.stock_reserved", entityId: order.id }],
    };
  },
};

/**
 * Material physically leaves the godown.
 *
 * Authority: taskplans/45_plywood_workflow_program.md §5;
 * PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-04; specification §45–§47.
 *
 * WHAT THIS REPLACES
 * `dispatchOrder` moved every remaining line at once, released every hold and
 * completed the order in one step. Three things followed from that: a partial
 * issue was impossible, nothing recorded who handed the material over, and an
 * invoice could be raised for the quantity ORDERED rather than the quantity
 * that actually left the yard.
 *
 * The old key is kept — `verity.plywood.dispatch_order` — because it is what
 * the existing screens and journeys call, and a rename is a migration of every
 * caller for no behavioural gain. The vocabulary in the result and the events
 * is the specification's.
 *
 * PARTIAL BY DEFAULT
 * `lines` is optional. Omitted, it issues everything outstanding, which is what
 * the old command did and what most orders need. Given, it issues exactly what
 * is named — and the order stays open until the balance follows.
 */
export const dispatchOrder: CommandDefinition<
  {
    orderId: string;
    rackId?: string;
    collectedBy?: string;
    notes?: string;
    /** Omit to issue everything outstanding. */
    lines?: Array<{ productId: string; qtyIssued: number }>;
  },
  {
    id: string;
    state: string;
    issueId: string;
    issueNumber: string;
    issuedLines: number;
  }
> = {
  key: "verity.plywood.dispatch_order",
  entity: ENTITY_SALES_ORDER,
  verb: "ActionExecute",
  input: z.object({
    orderId: z.string().uuid(),
    rackId: z.string().uuid().optional(),
    collectedBy: z.string().max(120).optional(),
    notes: z.string().max(500).optional(),
    lines: z
      .array(z.object({ productId: z.string().uuid(), qtyIssued: z.number().int().positive() }))
      .min(1)
      .optional(),
  }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodSalesOrder.findUniqueOrThrow({
      where: { id: input.orderId },
      include: { lines: true, reservations: { where: { releasedAt: null } } },
    });
    if (order.state !== "dispatching") {
      throw new ValidationError("E_VALIDATION: hold stock for this order before issuing it");
    }

    await assertGodownInScope(
      ctx.tx,
      ctx.actor,
      ENTITY_SALES_ORDER,
      "ActionExecute",
      order.locationId,
    );

    const services = await serviceProductIds(
      ctx.tx,
      order.lines.map((line) => line.productId),
    );

    // What to issue: exactly what was asked for, or everything outstanding.
    const requested =
      input.lines ??
      order.lines
        .filter((line) => line.qtyOrdered > line.qtyShipped)
        .map((line) => ({ productId: line.productId, qtyIssued: line.qtyOrdered - line.qtyShipped }));

    if (requested.length === 0) {
      throw new ValidationError("E_VALIDATION: this order has nothing left to issue");
    }

    const issuedAt = new Date();
    const financialYear = financialYearOf(issuedAt);
    const numbering = await nextDocumentNumber(ctx.tx, ctx.actor.tenantId, "GI", financialYear);

    const issue = await ctx.tx.plywoodGoodsIssue.create({
      data: {
        tenantId: ctx.actor.tenantId,
        salesOrderId: order.id,
        locationId: order.locationId,
        issueNumber: numbering.invoiceNumber,
        financialYear,
        issuedAt,
        issuedBy: ctx.actor.userId,
        collectedBy: input.collectedBy ?? null,
        notes: input.notes ?? null,
      },
    });

    for (const line of requested) {
      const orderLine = order.lines.find((candidate) => candidate.productId === line.productId);
      if (!orderLine) {
        throw new ValidationError("E_VALIDATION: that board is not on this order");
      }
      const outstanding = orderLine.qtyOrdered - orderLine.qtyShipped;
      if (line.qtyIssued > outstanding) {
        // Refused rather than clamped, for the same reason an over-receipt is:
        // issuing more than was ordered makes "still to go" negative and every
        // fulfilment report inherits it.
        throw new ValidationError(
          `E_VALIDATION: ${orderLine.productNameSnapshot} has ${outstanding} left to issue, cannot issue ${line.qtyIssued}`,
        );
      }

      // A service line was never reserved and has nothing to move; only its
      // issued quantity is real.
      let unitCostPaise = 0;
      if (!services.has(line.productId)) {
        const movement = await applyMovement(ctx.tx, ctx.actor, {
          productId: line.productId,
          locationId: order.locationId,
          rackId: input.rackId ?? null,
          kind: "sales_outward",
          qtyUnits: line.qtyIssued,
          source: { type: "goods_issue", id: issue.id, number: issue.issueNumber },
        });
        unitCostPaise = movement.unitCostPaise;
      }

      await ctx.tx.plywoodGoodsIssueLine.create({
        data: {
          tenantId: ctx.actor.tenantId,
          issueId: issue.id,
          salesOrderLineId: orderLine.id,
          productId: line.productId,
          productNameSnapshot: orderLine.productNameSnapshot,
          rackId: input.rackId ?? null,
          qtyIssued: line.qtyIssued,
          unitCostPaise,
        },
      });

      await ctx.tx.plywoodSalesOrderLine.update({
        where: { id: orderLine.id },
        data: { qtyShipped: { increment: line.qtyIssued } },
      });
    }

    // Release only what was issued. Releasing every hold on a partial issue —
    // which is what the old command did, because it always issued everything —
    // would free stock the customer is still owed, and the next order would
    // quietly take it.
    const after = await ctx.tx.plywoodSalesOrderLine.findMany({
      where: { salesOrderId: order.id },
    });
    const fulfilled = after.every((line) => line.qtyShipped >= line.qtyOrdered);

    for (const line of requested) {
      const held = await ctx.tx.plywoodStockReservation.findFirst({
        where: { salesOrderId: order.id, productId: line.productId, releasedAt: null },
      });
      if (!held) continue;

      const remaining = held.qtyUnits - line.qtyIssued;
      if (remaining > 0) {
        // The hold shrinks by what left. Reservations are immutable only once
        // released; a live hold is a running quantity.
        await ctx.tx.plywoodStockReservation.update({
          where: { id: held.id },
          data: { qtyUnits: remaining },
        });
      } else {
        await ctx.tx.plywoodStockReservation.update({
          where: { id: held.id },
          data: { releasedAt: issuedAt, releaseReason: `Issued on ${issue.issueNumber}` },
        });
      }
    }

    const target = fulfilled ? "completed" : "dispatching";
    if (order.state !== target) {
      await transition(ctx, {
        entityKey: ENTITY_SALES_ORDER,
        entityId: order.id,
        fromKey: order.state,
        toKey: target,
      });
      await ctx.tx.plywoodSalesOrder.update({
        where: { id: order.id },
        data: { state: target, version: { increment: 1 } },
      });
    }

    return {
      result: {
        id: order.id,
        state: target,
        issueId: issue.id,
        issueNumber: issue.issueNumber,
        issuedLines: requested.length,
      },
      events: [
        {
          name: fulfilled
            ? "verity.plywood.sales_order_fulfilled"
            : "verity.plywood.goods_partially_issued",
          entityId: order.id,
          payload: { issueNumber: issue.issueNumber },
        },
      ],
    };
  },
};

export const cancelSalesOrder: CommandDefinition<
  { orderId: string; reason: string },
  { id: string }
> = {
  key: "verity.plywood.cancel_sales_order",
  entity: ENTITY_SALES_ORDER,
  verb: "ActionExecute",
  input: z.object({ orderId: z.string().uuid(), reason: z.string().min(3).max(400) }),
  handler: async (ctx, input) => {
    // Releasing the hold is the point of cancelling. Stock held for an order
    // nobody is going to fulfil is stock the business cannot sell.
    await ctx.tx.plywoodStockReservation.updateMany({
      where: { salesOrderId: input.orderId, releasedAt: null },
      data: { releasedAt: new Date(), releaseReason: input.reason },
    });
    const order = await ctx.tx.plywoodSalesOrder.findUniqueOrThrow({
      where: { id: input.orderId },
    });
    await transition(ctx, {
      entityKey: ENTITY_SALES_ORDER,
      entityId: order.id,
      fromKey: order.state,
      toKey: "cancelled",
    });
    await ctx.tx.plywoodSalesOrder.update({
      where: { id: order.id },
      data: { state: "cancelled", version: { increment: 1 } },
    });
    return {
      result: { id: order.id },
      events: [{ name: "verity.plywood.sales_order_cancelled", entityId: order.id }],
    };
  },
};

/* ================================= reads ================================== */

export const listSuppliers: QueryDefinition<
  { includeInactive?: boolean },
  Array<{
    id: string;
    displayName: string;
    gstin: string | null;
    phone: string | null;
    stateCode: string | null;
    active: boolean;
    openOrders: number;
  }>
> = {
  key: "verity.plywood.list_suppliers",
  entity: ENTITY_SUPPLIER,
  input: z.object({ includeInactive: z.boolean().optional() }),
  handler: async (ctx, input) => {
    const suppliers = await ctx.tx.plywoodSupplier.findMany({
      where: input.includeInactive ? {} : { active: true },
      orderBy: { displayName: "asc" },
      include: {
        orders: { where: { state: { in: ["submitted", "receiving"] } }, select: { id: true } },
      },
    });
    return suppliers.map((supplier) => ({
      id: supplier.id,
      displayName: supplier.displayName,
      gstin: supplier.gstin,
      phone: supplier.phone,
      stateCode: supplier.stateCode,
      active: supplier.active,
      openOrders: supplier.orders.length,
    }));
  },
};

export const listCustomers: QueryDefinition<
  { includeInactive?: boolean },
  Array<{
    id: string;
    displayName: string;
    gstin: string | null;
    phone: string | null;
    stateCode: string | null;
    creditLimitPaise: number;
    exposurePaise: number;
    active: boolean;
  }>
> = {
  key: "verity.plywood.list_customers",
  entity: ENTITY_CUSTOMER,
  input: z.object({ includeInactive: z.boolean().optional() }),
  handler: async (ctx, input) => {
    const customers = await ctx.tx.plywoodCustomer.findMany({
      where: input.includeInactive ? {} : { active: true },
      orderBy: { displayName: "asc" },
      include: {
        orders: {
          where: { state: { notIn: ["cancelled", "completed"] } },
          select: { totalPricePaise: true },
        },
      },
    });
    return customers.map((customer) => ({
      id: customer.id,
      displayName: customer.displayName,
      gstin: customer.gstin,
      phone: customer.phone,
      stateCode: customer.stateCode,
      creditLimitPaise: customer.creditLimitPaise,
      exposurePaise: customer.orders.reduce((sum, order) => sum + order.totalPricePaise, 0),
      active: customer.active,
    }));
  },
};

export const purchaseOrderDetail: QueryDefinition<
  { orderId: string },
  {
    id: string;
    supplierName: string;
    locationName: string;
    reference: string | null;
    state: string;
    totalCostPaise: number;
    lines: Array<{
      productId: string;
      name: string;
      hsnCode: string;
      qtyOrdered: number;
      qtyReceived: number;
      qtyOutstanding: number;
      unitCostPaise: number;
    }>;
  } | null
> = {
  key: "verity.plywood.purchase_order_detail",
  entity: ENTITY_PURCHASE_ORDER,
  input: z.object({ orderId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodPurchaseOrder.findUnique({
      where: { id: input.orderId },
      include: {
        lines: true,
        supplier: { select: { displayName: true } },
        location: { select: { name: true } },
      },
    });
    if (!order) return null;
    return {
      id: order.id,
      supplierName: order.supplier.displayName,
      locationName: order.location.name,
      reference: order.reference,
      state: order.state,
      totalCostPaise: order.totalCostPaise,
      lines: order.lines.map((line) => ({
        productId: line.productId,
        name: line.productNameSnapshot,
        hsnCode: line.hsnCodeSnapshot,
        qtyOrdered: line.qtyOrdered,
        qtyReceived: line.qtyReceived,
        // The number the question is actually about: what is still owed on
        // this order. A column, not an arithmetic exercise for the reader.
        qtyOutstanding: line.qtyOrdered - line.qtyReceived,
        unitCostPaise: line.unitCostPaise,
      })),
    };
  },
};

export const salesOrderDetail: QueryDefinition<
  { orderId: string },
  {
    id: string;
    customerName: string;
    locationName: string;
    reference: string | null;
    state: string;
    totalPricePaise: number;
    lines: Array<{
      productId: string;
      name: string;
      hsnCode: string;
      qtyOrdered: number;
      qtyShipped: number;
      unitPricePaise: number;
    }>;
    holds: Array<{ productId: string; qtyUnits: number; releasedAt: Date | null }>;
  } | null
> = {
  key: "verity.plywood.sales_order_detail",
  entity: ENTITY_SALES_ORDER,
  input: z.object({ orderId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodSalesOrder.findUnique({
      where: { id: input.orderId },
      include: {
        lines: true,
        reservations: true,
        customer: { select: { displayName: true } },
        location: { select: { name: true } },
      },
    });
    if (!order) return null;
    return {
      id: order.id,
      customerName: order.customer.displayName,
      locationName: order.location.name,
      reference: order.reference,
      state: order.state,
      totalPricePaise: order.totalPricePaise,
      lines: order.lines.map((line) => ({
        productId: line.productId,
        name: line.productNameSnapshot,
        hsnCode: line.hsnCodeSnapshot,
        qtyOrdered: line.qtyOrdered,
        qtyShipped: line.qtyShipped,
        unitPricePaise: line.unitPricePaise,
      })),
      holds: order.reservations.map((hold) => ({
        productId: hold.productId,
        qtyUnits: hold.qtyUnits,
        releasedAt: hold.releasedAt,
      })),
    };
  },
};

export const openOrders: QueryDefinition<
  Record<string, never>,
  {
    purchases: Array<{
      id: string;
      supplierName: string;
      state: string;
      totalCostPaise: number;
      outstandingUnits: number;
    }>;
    sales: Array<{
      id: string;
      customerName: string;
      state: string;
      totalPricePaise: number;
    }>;
  }
> = {
  key: "verity.plywood.open_orders",
  entity: ENTITY_SALES_ORDER,
  input: z.object({}),
  handler: async (ctx) => {
    // Layer 2 (P0-01). Both lists are anchored to a godown, so both are
    // filtered by the godowns this actor reaches. Each is scoped against its
    // OWN entity: reading sales orders must not be what lets someone read
    // purchase orders, even on a screen that shows them side by side.
    const forPurchases = await reachableGodownIds(ctx.tx, ctx.actor, ENTITY_PURCHASE_ORDER);
    const forSales = await reachableGodownIds(ctx.tx, ctx.actor, ENTITY_SALES_ORDER);

    const purchases = await ctx.tx.plywoodPurchaseOrder.findMany({
      where: {
        state: { in: ["draft", "submitted", "receiving"] },
        locationId: { in: forPurchases },
      },
      include: { lines: true, supplier: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
    });
    const sales = await ctx.tx.plywoodSalesOrder.findMany({
      where: {
        state: { in: ["draft", "pending_credit", "approved", "dispatching"] },
        locationId: { in: forSales },
      },
      include: { customer: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      purchases: purchases.map((order) => ({
        id: order.id,
        supplierName: order.supplier.displayName,
        state: order.state,
        totalCostPaise: order.totalCostPaise,
        outstandingUnits: order.lines.reduce(
          (sum, line) => sum + (line.qtyOrdered - line.qtyReceived),
          0,
        ),
      })),
      sales: sales.map((order) => ({
        id: order.id,
        customerName: order.customer.displayName,
        state: order.state,
        totalPricePaise: order.totalPricePaise,
      })),
    };
  },
};

export const stockAvailability: QueryDefinition<
  { locationId: string },
  Array<{
    productId: string;
    productName: string;
    onHandUnits: number;
    reservedUnits: number;
    availableUnits: number;
  }>
> = {
  key: "verity.plywood.stock_availability",
  entity: ENTITY_RESERVATION,
  input: z.object({ locationId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const balances = await ctx.tx.stockBalance.findMany({
      where: { locationId: input.locationId },
      include: { product: { select: { name: true } } },
    });
    const holds = await ctx.tx.plywoodStockReservation.groupBy({
      by: ["productId"],
      where: { locationId: input.locationId, releasedAt: null },
      _sum: { qtyUnits: true },
    });

    return balances
      .map((balance) => {
        const reservedUnits =
          holds.find((hold) => hold.productId === balance.productId)?._sum.qtyUnits ?? 0;
        return {
          productId: balance.productId,
          productName: balance.product.name,
          onHandUnits: balance.qtyUnits,
          reservedUnits,
          availableUnits: balance.qtyUnits - reservedUnits,
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  },
};
