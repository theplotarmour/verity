import { z } from "zod";
import { ValidationError, type CommandDefinition } from "@/server/platform/command";
import { type QueryDefinition } from "@/server/platform/query";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { transition } from "@/server/platform/state";
import { ENTITY_SHIPMENT, ENTITY_TRANSPORTER } from "./keys";

/**
 * PLYWOOD STAGE 5 — logistics.
 *
 * Requirement source: plywood.md §1.6. Two questions the owner asks, verbatim:
 * where is my material right now, and what has been sent to which customer and
 * was it delivered. Both are answered by `trackMaterial` below.
 *
 * P6 resolved to records rather than users: no transporter signs in. A phone
 * call becomes a status update, which is how the business runs today.
 *
 * LR scans and signed delivery receipts are `Evidence` rows pointing at the
 * shipment. No column here holds a document — Evidence already references any
 * capability's entity by key and id, and its checksum freeze is what makes a
 * signed receipt worth keeping.
 */

const FREIGHT_PAYER = z.enum(["tenant", "customer", "supplier"]);

/* ============================== transporters ============================== */

export const createTransporter: CommandDefinition<
  { name: string; phone?: string; email?: string },
  { id: string }
> = {
  key: "verity.plywood.create_transporter",
  entity: ENTITY_TRANSPORTER,
  verb: "Create",
  input: z.object({
    name: z.string().min(1).max(200),
    phone: z.string().max(40).optional(),
    email: z.string().email().max(200).optional(),
  }),
  handler: async (ctx, input) => {
    const transporter = await ctx.tx.plywoodTransporter.create({
      data: {
        tenantId: ctx.actor.tenantId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
      },
    });
    return {
      result: { id: transporter.id },
      events: [{ name: "verity.plywood.transporter_created", entityId: transporter.id }],
    };
  },
};

/* ================================ shipments =============================== */

export const createShipment: CommandDefinition<
  {
    sourceLocationId: string;
    salesOrderId?: string;
    purchaseOrderId?: string;
    destLocationId?: string;
    destCustomerId?: string;
    freightChargePaise?: number;
    freightPayer?: "tenant" | "customer" | "supplier";
  },
  { id: string }
> = {
  key: "verity.plywood.create_shipment",
  entity: ENTITY_SHIPMENT,
  verb: "Create",
  input: z.object({
    sourceLocationId: z.string().uuid(),
    salesOrderId: z.string().uuid().optional(),
    purchaseOrderId: z.string().uuid().optional(),
    destLocationId: z.string().uuid().optional(),
    destCustomerId: z.string().uuid().optional(),
    freightChargePaise: z.number().int().min(0).optional(),
    freightPayer: FREIGHT_PAYER.optional(),
  }),
  preconditions: async (ctx, input) => {
    // Both checks exist as CHECK constraints too. Named failures here so the
    // operator is told what is wrong rather than shown a constraint violation.
    if (Boolean(input.salesOrderId) === Boolean(input.purchaseOrderId)) {
      throw new ValidationError("E_VALIDATION: a shipment carries exactly one order");
    }
    if (Boolean(input.destLocationId) === Boolean(input.destCustomerId)) {
      throw new ValidationError(
        "E_VALIDATION: a shipment goes to exactly one destination — a godown or a customer",
      );
    }
    const source = await ctx.tx.location.findUnique({ where: { id: input.sourceLocationId } });
    if (!source) throw new ValidationError("E_VALIDATION: source godown not found in this tenant");
  },
  handler: async (ctx, input) => {
    const shipment = await ctx.tx.plywoodShipment.create({
      data: {
        tenantId: ctx.actor.tenantId,
        sourceLocationId: input.sourceLocationId,
        salesOrderId: input.salesOrderId ?? null,
        purchaseOrderId: input.purchaseOrderId ?? null,
        destLocationId: input.destLocationId ?? null,
        destCustomerId: input.destCustomerId ?? null,
        freightChargePaise: input.freightChargePaise ?? 0,
        // Who bears the freight changes the margin on the sale, so it is a
        // recorded fact rather than an assumption made at reporting time.
        freightPayer: input.freightPayer ?? "tenant",
      },
    });
    return {
      result: { id: shipment.id },
      events: [{ name: "verity.plywood.shipment_created", entityId: shipment.id }],
    };
  },
};

export const assignCarrier: CommandDefinition<
  { shipmentId: string; transporterId: string; vehicleAssetId?: string; lrNumber: string },
  { id: string }
> = {
  key: "verity.plywood.assign_carrier",
  entity: ENTITY_SHIPMENT,
  verb: "ActionExecute",
  input: z.object({
    shipmentId: z.string().uuid(),
    transporterId: z.string().uuid(),
    vehicleAssetId: z.string().uuid().optional(),
    // Required at assignment, not optional. The LR number is the handle a
    // transporter answers to on the phone; a shipment assigned without one
    // cannot be chased, which is the whole point of recording it.
    lrNumber: z.string().min(1).max(60),
  }),
  handler: async (ctx, input) => {
    const shipment = await ctx.tx.plywoodShipment.findUniqueOrThrow({
      where: { id: input.shipmentId },
    });
    const moved = await transition(ctx, {
      entityKey: ENTITY_SHIPMENT,
      entityId: shipment.id,
      fromKey: shipment.state,
      toKey: "assigned",
    });
    await ctx.tx.plywoodShipment.update({
      where: { id: shipment.id },
      data: {
        transporterId: input.transporterId,
        vehicleAssetId: input.vehicleAssetId ?? null,
        lrNumber: input.lrNumber,
        state: "assigned",
        version: { increment: 1 },
      },
    });
    return {
      result: { id: shipment.id },
      events: [moved.event, { name: "verity.plywood.carrier_assigned", entityId: shipment.id }],
    };
  },
};

export const dispatchShipment: CommandDefinition<{ shipmentId: string }, { id: string }> = {
  key: "verity.plywood.dispatch_shipment",
  entity: ENTITY_SHIPMENT,
  verb: "ActionExecute",
  input: z.object({ shipmentId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const shipment = await ctx.tx.plywoodShipment.findUniqueOrThrow({
      where: { id: input.shipmentId },
    });
    const moved = await transition(ctx, {
      entityKey: ENTITY_SHIPMENT,
      entityId: shipment.id,
      fromKey: shipment.state,
      toKey: "in_transit",
    });
    await ctx.tx.plywoodShipment.update({
      where: { id: shipment.id },
      data: { state: "in_transit", dispatchedAt: new Date(), version: { increment: 1 } },
    });
    return {
      result: { id: shipment.id },
      events: [moved.event, { name: "verity.plywood.shipment_dispatched", entityId: shipment.id }],
    };
  },
};

export const confirmDelivery: CommandDefinition<
  { shipmentId: string; receivedBy?: string },
  { id: string }
> = {
  key: "verity.plywood.confirm_delivery",
  entity: ENTITY_SHIPMENT,
  verb: "ActionExecute",
  input: z.object({
    shipmentId: z.string().uuid(),
    receivedBy: z.string().max(200).optional(),
  }),
  handler: async (ctx, input) => {
    const shipment = await ctx.tx.plywoodShipment.findUniqueOrThrow({
      where: { id: input.shipmentId },
    });
    const moved = await transition(ctx, {
      entityKey: ENTITY_SHIPMENT,
      entityId: shipment.id,
      fromKey: shipment.state,
      toKey: "delivered",
    });
    await ctx.tx.plywoodShipment.update({
      where: { id: shipment.id },
      data: { state: "delivered", deliveredAt: new Date(), version: { increment: 1 } },
    });

    if (input.receivedBy) {
      await recordActivity(ctx, {
        entityKey: ENTITY_SHIPMENT,
        entityId: shipment.id,
        commandKey: "verity.plywood.confirm_delivery",
        changes: diffFields({ receivedBy: "" }, { receivedBy: input.receivedBy }),
      });
    }

    return {
      result: { id: shipment.id },
      events: [moved.event, { name: "verity.plywood.shipment_delivered", entityId: shipment.id }],
    };
  },
};

export const reportShipmentLost: CommandDefinition<
  { shipmentId: string; reason: string },
  { id: string }
> = {
  key: "verity.plywood.report_shipment_lost",
  entity: ENTITY_SHIPMENT,
  verb: "ActionExecute",
  input: z.object({ shipmentId: z.string().uuid(), reason: z.string().min(3).max(400) }),
  handler: async (ctx, input) => {
    const shipment = await ctx.tx.plywoodShipment.findUniqueOrThrow({
      where: { id: input.shipmentId },
    });
    // Cancelled, not delivered. Goods that never arrived are not a delivery, and
    // recording them as one would make every transit-time and delivery-rate
    // report quietly wrong.
    const moved = await transition(ctx, {
      entityKey: ENTITY_SHIPMENT,
      entityId: shipment.id,
      fromKey: shipment.state,
      toKey: "cancelled",
    });
    await ctx.tx.plywoodShipment.update({
      where: { id: shipment.id },
      data: { state: "cancelled", version: { increment: 1 } },
    });
    await recordActivity(ctx, {
      entityKey: ENTITY_SHIPMENT,
      entityId: shipment.id,
      commandKey: "verity.plywood.report_shipment_lost",
      changes: diffFields({ lossReason: "" }, { lossReason: input.reason }),
    });
    return {
      result: { id: shipment.id },
      events: [moved.event, { name: "verity.plywood.shipment_lost", entityId: shipment.id }],
    };
  },
};

/* ================================= reads ================================== */

export const listTransporters: QueryDefinition<
  { includeInactive?: boolean },
  Array<{ id: string; name: string; phone: string | null; active: boolean; inTransit: number }>
> = {
  key: "verity.plywood.list_transporters",
  entity: ENTITY_TRANSPORTER,
  input: z.object({ includeInactive: z.boolean().optional() }),
  handler: async (ctx, input) => {
    const transporters = await ctx.tx.plywoodTransporter.findMany({
      where: input.includeInactive ? {} : { active: true },
      orderBy: { name: "asc" },
      include: { shipments: { where: { state: "in_transit" }, select: { id: true } } },
    });
    return transporters.map((transporter) => ({
      id: transporter.id,
      name: transporter.name,
      phone: transporter.phone,
      active: transporter.active,
      inTransit: transporter.shipments.length,
    }));
  },
};

/**
 * "Mera maal abhi kahan hai?" — where is my material right now.
 *
 * One query, searchable by LR number, customer name or order reference, because
 * those are the three things somebody has in hand when they ask. It returns the
 * chain rather than a row: source, carrier, vehicle, how long it has been out,
 * and where it is going.
 */
export const trackMaterial: QueryDefinition<
  { search?: string; onlyInTransit?: boolean },
  Array<{
    shipmentId: string;
    state: string;
    lrNumber: string | null;
    transporterName: string | null;
    vehicleReference: string | null;
    sourceName: string;
    destination: string;
    orderReference: string | null;
    direction: "outbound" | "inbound";
    freightChargePaise: number;
    freightPayer: string;
    dispatchedAt: Date | null;
    deliveredAt: Date | null;
    daysInTransit: number | null;
  }>
> = {
  key: "verity.plywood.track_material",
  entity: ENTITY_SHIPMENT,
  input: z.object({
    search: z.string().max(200).optional(),
    onlyInTransit: z.boolean().optional(),
  }),
  handler: async (ctx, input) => {
    const search = input.search?.trim();
    const shipments = await ctx.tx.plywoodShipment.findMany({
      where: {
        ...(input.onlyInTransit ? { state: "in_transit" } : {}),
        ...(search
          ? {
              OR: [
                { lrNumber: { contains: search, mode: "insensitive" } },
                { destCustomer: { displayName: { contains: search, mode: "insensitive" } } },
                { salesOrder: { reference: { contains: search, mode: "insensitive" } } },
                { purchaseOrder: { reference: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        transporter: { select: { name: true } },
        vehicle: { select: { reference: true, name: true } },
        source: { select: { name: true } },
        destination: { select: { name: true } },
        destCustomer: { select: { displayName: true } },
        salesOrder: { select: { reference: true } },
        purchaseOrder: { select: { reference: true } },
      },
      orderBy: [{ dispatchedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    const now = Date.now();
    return shipments.map((shipment) => ({
      shipmentId: shipment.id,
      state: shipment.state,
      lrNumber: shipment.lrNumber,
      transporterName: shipment.transporter?.name ?? null,
      vehicleReference: shipment.vehicle?.reference ?? shipment.vehicle?.name ?? null,
      sourceName: shipment.source.name,
      destination: shipment.destination?.name ?? shipment.destCustomer?.displayName ?? "—",
      orderReference: shipment.salesOrder?.reference ?? shipment.purchaseOrder?.reference ?? null,
      direction: shipment.salesOrderId ? ("outbound" as const) : ("inbound" as const),
      freightChargePaise: shipment.freightChargePaise,
      freightPayer: shipment.freightPayer,
      dispatchedAt: shipment.dispatchedAt,
      deliveredAt: shipment.deliveredAt,
      // "Out for two days" is the phrasing the question arrives in, so the
      // number is computed here rather than left as two timestamps for a screen
      // to subtract.
      daysInTransit: shipment.dispatchedAt
        ? Math.floor(
            ((shipment.deliveredAt?.getTime() ?? now) - shipment.dispatchedAt.getTime()) /
              86_400_000,
          )
        : null,
    }));
  },
};
