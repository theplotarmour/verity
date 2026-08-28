import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { diffFields, recordActivity } from "@/server/platform/audit";

/**
 * CAPABILITY: Plywood trading — `verity.capability.plywood`
 *
 * Built for a plywood, laminate, MDF and board trading business (plywood.md),
 * and reusable by the next board trader without a fork: brands, sizes, grades,
 * godowns and racks are all data.
 *
 * STAGE 1 OF 8 — the catalogue and the floor.
 * `implementation/plywood-gap-analysis.md` §6 sequences this build, and stage 1
 * is the only stage gated by none of the six open decisions (P1..P6). Stock
 * movements wait on the costing method and the reservation model; invoicing
 * waits on numbering, balance location and place of supply. Nothing here
 * anticipates any of them.
 *
 * WHAT THIS CAPABILITY REUSES
 * A godown is a `Location` (ADR-004), not a new primitive — the capability adds
 * only the rack inside it, which no existing primitive carries. That reuse is
 * declared as a capability dependency in the install migration rather than
 * discovered at runtime by a failing foreign key.
 *
 * WHAT THIS CAPABILITY DOES NOT TOUCH
 * Nothing in `src/server/platform/`. Every mutation is a registered command,
 * every read a registered query, and tenant isolation comes from the ordinary
 * RLS policy on each new table.
 */

export const PLYWOOD_CAPABILITY = "verity.capability.plywood";

export const ENTITY_BRAND = "verity.plywood.brand";
export const ENTITY_PRODUCT = "verity.plywood.product";
export const ENTITY_GODOWN_RACK = "verity.plywood.godown_rack";

/**
 * HSN codes are 4, 6 or 8 digits — CBIC notification 78/2020 sets which by the
 * business's turnover. The rule is the shape; the digit count is the client's
 * accountant's decision, and hard-coding one would be wrong for the other two.
 *
 * The same expression is a CHECK constraint on the column. Validating here as
 * well is not duplication for its own sake: it produces a named validation
 * failure instead of a constraint violation, and the constraint remains the
 * thing that cannot be forgotten by a second writer.
 */
const HSN_CODE = z
  .string()
  .regex(/^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/, "HSN code must be 4, 6 or 8 digits");

/* ================================= brands ================================= */

export const createBrand: CommandDefinition<{ name: string }, { id: string }> = {
  key: "verity.plywood.create_brand",
  entity: ENTITY_BRAND,
  verb: "Create",
  input: z.object({ name: z.string().min(1).max(120) }),
  preconditions: async (ctx, input) => {
    // The unique index would catch this, but a named failure reads better than
    // a constraint violation on a screen.
    const clash = await ctx.tx.plywoodBrand.findFirst({ where: { name: input.name } });
    if (clash) throw new ValidationError("E_VALIDATION: a brand with that name already exists");
  },
  handler: async (ctx, input) => {
    const brand = await ctx.tx.plywoodBrand.create({
      data: { tenantId: ctx.actor.tenantId, name: input.name },
    });
    return {
      result: { id: brand.id },
      events: [{ name: "verity.plywood.brand_created", entityId: brand.id }],
    };
  },
};

export const setBrandActive: CommandDefinition<
  { brandId: string; active: boolean },
  { id: string }
> = {
  key: "verity.plywood.set_brand_active",
  entity: ENTITY_BRAND,
  verb: "Edit",
  input: z.object({ brandId: z.string().uuid(), active: z.boolean() }),
  handler: async (ctx, input) => {
    // Deactivated, never deleted. A brand that has been traded is referenced by
    // products, and eventually by ledger history that must stay readable.
    const brand = await ctx.tx.plywoodBrand.update({
      where: { id: input.brandId },
      data: { active: input.active, version: { increment: 1 } },
    });
    return {
      result: { id: brand.id },
      events: [
        {
          name: input.active ? "verity.plywood.brand_activated" : "verity.plywood.brand_deactivated",
          entityId: brand.id,
        },
      ],
    };
  },
};

/* ================================ products ================================ */

export const createProduct: CommandDefinition<
  {
    brandId: string;
    name: string;
    hsnCode: string;
    thicknessTenthMm: number;
    widthMm: number;
    heightMm: number;
    grade: string;
    sheetWeightGrams?: number;
    reorderLevelUnits?: number;
    unitLabel?: string;
  },
  { id: string }
> = {
  key: "verity.plywood.create_product",
  entity: ENTITY_PRODUCT,
  verb: "Create",
  input: z.object({
    brandId: z.string().uuid(),
    name: z.string().min(1).max(200),
    hsnCode: HSN_CODE,
    // Tenths of a millimetre: 180 is 18.0 mm. Integers because a board's
    // thickness is an exact fact, and a float would make it approximately so.
    thicknessTenthMm: z.number().int().positive(),
    widthMm: z.number().int().positive(),
    heightMm: z.number().int().positive(),
    grade: z.string().min(1).max(60),
    sheetWeightGrams: z.number().int().positive().optional(),
    reorderLevelUnits: z.number().int().min(0).optional(),
    unitLabel: z.string().min(1).max(30).optional(),
  }),
  preconditions: async (ctx, input) => {
    const brand = await ctx.tx.plywoodBrand.findUnique({ where: { id: input.brandId } });
    if (!brand) throw new ValidationError("E_VALIDATION: brand not found in this tenant");
    if (!brand.active) {
      throw new ValidationError("E_VALIDATION: cannot add a product to a deactivated brand");
    }
  },
  handler: async (ctx, input) => {
    const product = await ctx.tx.plywoodProduct.create({
      data: {
        tenantId: ctx.actor.tenantId,
        brandId: input.brandId,
        name: input.name,
        hsnCode: input.hsnCode,
        thicknessTenthMm: input.thicknessTenthMm,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
        grade: input.grade,
        sheetWeightGrams: input.sheetWeightGrams ?? null,
        reorderLevelUnits: input.reorderLevelUnits ?? 0,
        unitLabel: input.unitLabel ?? "sheets",
      },
    });
    return {
      result: { id: product.id },
      events: [{ name: "verity.plywood.product_created", entityId: product.id }],
    };
  },
};

export const editProduct: CommandDefinition<
  {
    productId: string;
    name?: string;
    hsnCode?: string;
    grade?: string;
    sheetWeightGrams?: number | null;
    reorderLevelUnits?: number;
    unitLabel?: string;
  },
  { id: string }
> = {
  key: "verity.plywood.edit_product",
  entity: ENTITY_PRODUCT,
  verb: "Edit",
  input: z.object({
    productId: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    hsnCode: HSN_CODE.optional(),
    grade: z.string().min(1).max(60).optional(),
    sheetWeightGrams: z.number().int().positive().nullable().optional(),
    reorderLevelUnits: z.number().int().min(0).optional(),
    unitLabel: z.string().min(1).max(30).optional(),
  }),
  handler: async (ctx, input) => {
    const before = await ctx.tx.plywoodProduct.findUniqueOrThrow({
      where: { id: input.productId },
    });
    const after = await ctx.tx.plywoodProduct.update({
      where: { id: input.productId },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.hsnCode === undefined ? {} : { hsnCode: input.hsnCode }),
        ...(input.grade === undefined ? {} : { grade: input.grade }),
        ...(input.sheetWeightGrams === undefined
          ? {}
          : { sheetWeightGrams: input.sheetWeightGrams }),
        ...(input.reorderLevelUnits === undefined
          ? {}
          : { reorderLevelUnits: input.reorderLevelUnits }),
        ...(input.unitLabel === undefined ? {} : { unitLabel: input.unitLabel }),
        version: { increment: 1 },
      },
    });

    // An HSN change is a tax fact and will be asked about after a filing. The
    // diff records what it was, not merely that it changed.
    await recordActivity(ctx, {
      entityKey: ENTITY_PRODUCT,
      entityId: after.id,
      commandKey: "verity.plywood.edit_product",
      changes: diffFields(
        {
          name: before.name,
          hsnCode: before.hsnCode,
          grade: before.grade,
          reorderLevelUnits: before.reorderLevelUnits,
        },
        {
          name: after.name,
          hsnCode: after.hsnCode,
          grade: after.grade,
          reorderLevelUnits: after.reorderLevelUnits,
        },
      ),
    });

    return {
      result: { id: after.id },
      events: [{ name: "verity.plywood.product_edited", entityId: after.id }],
    };
  },
};

/**
 * Dimensions are deliberately NOT editable.
 *
 * An 18 mm board and a 12 mm board are different products, not one product with
 * a corrected field. Editing the size in place would silently restate every
 * past movement and every past invoice line that referenced it. A wrong size is
 * fixed by deactivating the product and creating the right one — which is the
 * same reasoning that makes the ledgers append-only.
 */
export const setProductActive: CommandDefinition<
  { productId: string; active: boolean },
  { id: string }
> = {
  key: "verity.plywood.set_product_active",
  entity: ENTITY_PRODUCT,
  verb: "Edit",
  input: z.object({ productId: z.string().uuid(), active: z.boolean() }),
  handler: async (ctx, input) => {
    const product = await ctx.tx.plywoodProduct.update({
      where: { id: input.productId },
      data: { active: input.active, version: { increment: 1 } },
    });
    return {
      result: { id: product.id },
      events: [
        {
          name: input.active
            ? "verity.plywood.product_activated"
            : "verity.plywood.product_deactivated",
          entityId: product.id,
        },
      ],
    };
  },
};

/* ============================== godown racks ============================== */

export const defineGodownRack: CommandDefinition<
  { locationId: string; rackLabel: string },
  { id: string }
> = {
  key: "verity.plywood.define_godown_rack",
  entity: ENTITY_GODOWN_RACK,
  verb: "Create",
  input: z.object({ locationId: z.string().uuid(), rackLabel: z.string().min(1).max(60) }),
  preconditions: async (ctx, input) => {
    // The composite foreign key would reject a cross-tenant Location, but a
    // named precondition is a better error than a constraint violation.
    const location = await ctx.tx.location.findUnique({ where: { id: input.locationId } });
    if (!location) throw new ValidationError("E_VALIDATION: godown not found in this tenant");
    const clash = await ctx.tx.godownRack.findFirst({
      where: { locationId: input.locationId, rackLabel: input.rackLabel },
    });
    if (clash) throw new ValidationError("E_VALIDATION: that rack already exists in this godown");
  },
  handler: async (ctx, input) => {
    const rack = await ctx.tx.godownRack.create({
      data: {
        tenantId: ctx.actor.tenantId,
        locationId: input.locationId,
        rackLabel: input.rackLabel,
      },
    });
    return {
      result: { id: rack.id },
      events: [{ name: "verity.plywood.godown_rack_defined", entityId: rack.id }],
    };
  },
};

export const setGodownRackActive: CommandDefinition<
  { rackId: string; active: boolean },
  { id: string }
> = {
  key: "verity.plywood.set_godown_rack_active",
  entity: ENTITY_GODOWN_RACK,
  verb: "Edit",
  input: z.object({ rackId: z.string().uuid(), active: z.boolean() }),
  handler: async (ctx, input) => {
    const rack = await ctx.tx.godownRack.update({
      where: { id: input.rackId },
      data: { active: input.active, version: { increment: 1 } },
    });
    return {
      result: { id: rack.id },
      events: [
        {
          name: input.active
            ? "verity.plywood.godown_rack_activated"
            : "verity.plywood.godown_rack_retired",
          entityId: rack.id,
        },
      ],
    };
  },
};

/* ================================ queries ================================= */

export const listCatalogue: QueryDefinition<
  { includeInactive?: boolean; brandId?: string },
  Array<{
    brandId: string;
    brandName: string;
    brandActive: boolean;
    products: Array<{
      id: string;
      name: string;
      hsnCode: string;
      thicknessTenthMm: number;
      widthMm: number;
      heightMm: number;
      grade: string;
      unitLabel: string;
      reorderLevelUnits: number;
      active: boolean;
    }>;
  }>
> = {
  key: "verity.plywood.list_catalogue",
  entity: ENTITY_PRODUCT,
  input: z.object({
    includeInactive: z.boolean().optional(),
    brandId: z.string().uuid().optional(),
  }),
  handler: async (ctx, input) => {
    const brands = await ctx.tx.plywoodBrand.findMany({
      where: {
        ...(input.includeInactive ? {} : { active: true }),
        ...(input.brandId ? { id: input.brandId } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        products: {
          where: input.includeInactive ? {} : { active: true },
          orderBy: [{ name: "asc" }],
        },
      },
    });

    return brands.map((brand) => ({
      brandId: brand.id,
      brandName: brand.name,
      brandActive: brand.active,
      products: brand.products.map((product) => ({
        id: product.id,
        name: product.name,
        hsnCode: product.hsnCode,
        thicknessTenthMm: product.thicknessTenthMm,
        widthMm: product.widthMm,
        heightMm: product.heightMm,
        grade: product.grade,
        unitLabel: product.unitLabel,
        reorderLevelUnits: product.reorderLevelUnits,
        active: product.active,
      })),
    }));
  },
};

export const listGodownRacks: QueryDefinition<
  { locationId?: string; includeInactive?: boolean },
  Array<{
    locationId: string;
    locationName: string;
    racks: Array<{ id: string; rackLabel: string; active: boolean }>;
  }>
> = {
  key: "verity.plywood.list_godown_racks",
  entity: ENTITY_GODOWN_RACK,
  input: z.object({
    locationId: z.string().uuid().optional(),
    includeInactive: z.boolean().optional(),
  }),
  handler: async (ctx, input) => {
    const racks = await ctx.tx.godownRack.findMany({
      where: {
        ...(input.locationId ? { locationId: input.locationId } : {}),
        ...(input.includeInactive ? {} : { active: true }),
      },
      orderBy: [{ locationId: "asc" }, { rackLabel: "asc" }],
      include: { location: { select: { id: true, name: true } } },
    });

    // Grouped in code rather than by a second query: the row count here is
    // racks in one business's godowns, and a join already carried the name.
    const byLocation = new Map<
      string,
      { locationId: string; locationName: string; racks: Array<{ id: string; rackLabel: string; active: boolean }> }
    >();
    for (const rack of racks) {
      const existing = byLocation.get(rack.locationId) ?? {
        locationId: rack.locationId,
        locationName: rack.location.name,
        racks: [],
      };
      existing.racks.push({ id: rack.id, rackLabel: rack.rackLabel, active: rack.active });
      byLocation.set(rack.locationId, existing);
    }
    return [...byLocation.values()];
  },
};

/* ============================== registration ============================== */

export function registerPlywoodCapability(): void {
  registerContribution({
    capabilityId: PLYWOOD_CAPABILITY,
    navigation: [
      {
        href: "/catalogue",
        label: "Catalogue",
        group: "Administration",
        order: 30,
        icon: "evidence",
        requiresEntity: ENTITY_PRODUCT,
        shells: ["platform"],
      },
      {
        href: "/godowns",
        label: "Godowns",
        group: "Administration",
        order: 31,
        icon: "locations",
        // Gated on CREATE rather than READ: rack layout is set up by whoever
        // shapes the godown, not by everyone who reads stock off it.
        requiresEntity: ENTITY_GODOWN_RACK,
        requiresVerb: "Create",
        shells: ["platform"],
      },
    ],
    // No workspace queues and no schedules yet. The low-stock sweep belongs to
    // stage 2, and declaring it now would announce a queue that counts nothing
    // because no stock movement exists to count.
  });

  registerCommand(createBrand);
  registerCommand(setBrandActive);
  registerCommand(createProduct);
  registerCommand(editProduct);
  registerCommand(setProductActive);
  registerCommand(defineGodownRack);
  registerCommand(setGodownRackActive);

  registerQuery(listCatalogue);
  registerQuery(listGodownRacks);
}
