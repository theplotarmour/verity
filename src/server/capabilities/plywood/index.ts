import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import {
  registerCommand,
  ValidationError,
  type CommandDefinition,
} from "@/server/platform/command";
import { registerBusinessIdentity } from "./business";
import { registerTax } from "./tax";
import { registerBusinessActivities } from "./activities";
import { registerReports } from "./reports";
import { registerItc } from "./itc";
import { reachableGodownIds } from "./scope";
import { registerPeriods } from "./period";
import {
  goodsReceiptDetail,
  purchaseMatch,
  purchaseReviewQueue,
  raiseInvoiceNote,
} from "./finance";
import {
  godownDetail,
  productDetail,
  supplierPrices,
  customerPrices,
  sellableStock,
  stockLedger,
} from "./views";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { notify } from "@/server/platform/notification";
import { withTenant, type TenantScopedClient } from "@/server/platform/tenancy";
import {
  ENTITY_BRAND,
  ENTITY_ACCOUNTING_PERIOD,
  ENTITY_BUSINESS_PROFILE,
  ENTITY_GODOWN_RACK,
  ENTITY_PRODUCT,
  ENTITY_STOCK_BALANCE,
  ENTITY_STOCK_LEDGER,
  ENTITY_CUSTOMER,
  ENTITY_GST_REGISTRATION,
  ENTITY_PURCHASE_ORDER,
  ENTITY_SALES_ORDER,
  ENTITY_SUPPLIER,
  ENTITY_INVOICE,
  ENTITY_LEDGER_ENTRY,
  ENTITY_PAYMENT,
  ENTITY_SUPPLIER_PRICE,
  HSN_CODE,
  PLYWOOD_CAPABILITY,
} from "./keys";
import {
  adjustStock,
  issueStock,
  lowStock,
  productMovements,
  receiveStock,
  recordDamagedStock,
  recordReturnedStock,
  stockOnHand,
  transferStock,
} from "./stock";
import {
  approveCredit,
  cancelPurchaseOrder,
  cancelSalesOrder,
  createCustomer,
  createPurchaseOrder,
  createSalesOrder,
  createSupplier,
  editSalesOrder,
  editPurchaseOrder,
  removeCustomer,
  editCustomer,
  removeSupplier,
  editSupplier,
  dispatchOrder,
  customerDetail,
  listCustomers,
  listSuppliers,
  supplierDetail,
  openOrders,
  purchaseOrderDetail,
  receiveGoods,
  linkSupplierToCustomer,
  reserveForOrder,
  salesOrderDetail,
  setCreditLimit,
  setCustomerPrice,
  setSupplierPrice,
  setPriceSheet,
  stockAvailability,
  submitPurchaseOrder,
} from "./trading";
import {
  invoiceDetail,
  listInvoices,
  outstandingReceivables,
  partyBalances,
  paymentJournal,
  unbilledMovements,
  partyLedger,
  raisePurchaseInvoice,
  marginReport,
  ownerConsole,
  raiseSalesInvoice,
  recordPayment,
  recordPartyPayment,
  confirmPurchaseBill,
  raisePurchaseBillFromOrder,
} from "./finance";

/**
 * CAPABILITY: Plywood trading — `verity.capability.plywood`
 *
 * Built for a plywood, laminate, MDF and board trading business (plywood.md),
 * and reusable by the next board trader without a fork: brands, sizes, grades,
 * godowns and racks are all data.
 *
 * BUILT IN STAGES. `implementation/plywood-gap-analysis.md` §6 sequences them and
 * `implementation/plywood-decisions.md` records the six decisions they turn on.
 *   1 — catalogue and godown racks (this file)
 *   2 — the stock ledger and weighted average cost (`stock.ts`)
 *   3, 4 — suppliers, customers, purchase and sales orders (`trading.ts`)
 * Finance, the dashboard and the service-chain fixture follow. Logistics was
 * removed in slice 2: stock leaves a godown through a Goods Issue and nothing
 * else, or the stock ledger cannot be proven.
 *
 * This file holds the catalogue and the capability's registration; each later
 * stage is its own module so the capability can grow without one file becoming
 * the place everything is looked for.
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

export * from "./keys";
export * from "./business";
export * from "./tax";
export * from "./period";
export * from "./stock";
export * from "./trading";
export * from "./finance";
export * from "./views";
export * from "./activities";
export * from "./reports";
export * from "./itc";

/* ================================= brands ================================= */

export const createBrand: CommandDefinition<{ name: string }, { id: string }> =
  {
    key: "verity.plywood.create_brand",
    entity: ENTITY_BRAND,
    verb: "Create",
    input: z.object({ name: z.string().min(1).max(120) }),
    preconditions: async (ctx, input) => {
      // The unique index would catch this, but a named failure reads better than
      // a constraint violation on a screen.
      const clash = await ctx.tx.plywoodBrand.findFirst({
        where: { name: input.name },
      });
      if (clash)
        throw new ValidationError(
          "E_VALIDATION: a brand with that name already exists",
        );
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
          name: input.active
            ? "verity.plywood.brand_activated"
            : "verity.plywood.brand_deactivated",
          entityId: brand.id,
        },
      ],
    };
  },
};

/* ================================ products ================================ */

/**
 * PHYSICAL holds stock; SERVICE (sawing, estimating, rentals) never does —
 * see `stock.ts`'s `assertTradeable` and the reservation/dispatch/receive
 * loops in `trading.ts`. A TS union validated by `PRODUCT_TYPES` below, the
 * same shape as `MovementKind` in `stock.ts` — not a Postgres enum, kept
 * consistent with this capability's other closed-set fields (`grade`, order
 * `state`, movement `kind`), all plain strings.
 */
export const PRODUCT_TYPES = ["PHYSICAL", "SERVICE"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const createProduct: CommandDefinition<
  {
    brandId: string;
    name: string;
    hsnCode: string;
    thicknessTenthMm?: number;
    widthMm?: number;
    heightMm?: number;
    grade: string;
    sheetWeightGrams?: number;
    reorderLevelUnits?: number;
    unitLabel?: string;
    type?: ProductType;
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
    // Optional: a SERVICE product or most hardware items have no sheet
    // dimensions at all — the database's own check constraint allows NULL
    // but still refuses zero or negative when a value is given.
    thicknessTenthMm: z.number().int().positive().optional(),
    widthMm: z.number().int().positive().optional(),
    heightMm: z.number().int().positive().optional(),
    grade: z.string().min(1).max(60),
    sheetWeightGrams: z.number().int().positive().optional(),
    reorderLevelUnits: z.number().int().min(0).optional(),
    unitLabel: z.string().min(1).max(30).optional(),
    type: z.enum(PRODUCT_TYPES).optional(),
  }),
  preconditions: async (ctx, input) => {
    const brand = await ctx.tx.plywoodBrand.findUnique({
      where: { id: input.brandId },
    });
    if (!brand)
      throw new ValidationError("E_VALIDATION: brand not found in this tenant");
    if (!brand.active) {
      throw new ValidationError(
        "E_VALIDATION: cannot add a product to a deactivated brand",
      );
    }
  },
  handler: async (ctx, input) => {
    const product = await ctx.tx.plywoodProduct.create({
      data: {
        tenantId: ctx.actor.tenantId,
        brandId: input.brandId,
        name: input.name,
        hsnCode: input.hsnCode,
        thicknessTenthMm: input.thicknessTenthMm ?? null,
        widthMm: input.widthMm ?? null,
        heightMm: input.heightMm ?? null,
        grade: input.grade,
        sheetWeightGrams: input.sheetWeightGrams ?? null,
        reorderLevelUnits: input.reorderLevelUnits ?? 0,
        unitLabel: input.unitLabel ?? "sheets",
        type: input.type ?? "PHYSICAL",
      },
    });
    return {
      result: { id: product.id },
      events: [
        { name: "verity.plywood.product_created", entityId: product.id },
      ],
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
    type?: ProductType;
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
    /**
     * Correcting what a product IS.
     *
     * Audit finding U2-6b. `createProduct` takes a type and defaults to
     * PHYSICAL; `editProduct` could not change it, so a service entered
     * without ticking the box was permanently a board. It then appeared in
     * every "Board" dropdown, could be ordered, and could be received into a
     * godown — nonsense the business had no way to undo. A real example was
     * found in a live tenant: "Custom Log Sawing & Sizing Service", PHYSICAL.
     */
    type: z.enum(PRODUCT_TYPES).optional(),
  }),
  handler: async (ctx, input) => {
    const before = await ctx.tx.plywoodProduct.findUniqueOrThrow({
      where: { id: input.productId },
    });

    // A type change is only safe while the product has no stock history. Once
    // sheets have moved, calling it a service would orphan those movements —
    // the ledger would hold quantities for something the system says is not
    // held in a godown. Correcting a data-entry slip is the use; rewriting the
    // nature of a traded board is not.
    if (input.type !== undefined && input.type !== before.type) {
      const movements = await ctx.tx.stockLedgerEntry.count({
        where: { productId: input.productId },
      });
      if (movements > 0) {
        throw new ValidationError(
          `E_VALIDATION: ${before.name} already has ${movements} stock movement(s), ` +
            "so it cannot be reclassified. Withdraw it and add it again under the right type.",
        );
      }
    }

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
        ...(input.unitLabel === undefined
          ? {}
          : { unitLabel: input.unitLabel }),
        ...(input.type === undefined ? {} : { type: input.type }),
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
          type: before.type,
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
  input: z.object({
    locationId: z.string().uuid(),
    rackLabel: z.string().min(1).max(60),
  }),
  preconditions: async (ctx, input) => {
    // The composite foreign key would reject a cross-tenant Location, but a
    // named precondition is a better error than a constraint violation.
    const location = await ctx.tx.location.findUnique({
      where: { id: input.locationId },
    });
    if (!location)
      throw new ValidationError(
        "E_VALIDATION: godown not found in this tenant",
      );
    const clash = await ctx.tx.godownRack.findFirst({
      where: { locationId: input.locationId, rackLabel: input.rackLabel },
    });
    if (clash)
      throw new ValidationError(
        "E_VALIDATION: that rack already exists in this godown",
      );
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
      events: [
        { name: "verity.plywood.godown_rack_defined", entityId: rack.id },
      ],
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
      thicknessTenthMm: number | null;
      widthMm: number | null;
      heightMm: number | null;
      grade: string;
      unitLabel: string;
      reorderLevelUnits: number;
      active: boolean;
      type: ProductType;
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
        type: product.type as ProductType,
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
    // Layer 2. Audit finding F-09: rack layout is a map of another branch's
    // godown, and it was readable tenant-wide.
    const reachable = await reachableGodownIds(
      ctx.tx,
      ctx.actor,
      ENTITY_GODOWN_RACK,
    );
    const racks = await ctx.tx.godownRack.findMany({
      where: {
        locationId: { in: reachable },
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
      {
        locationId: string;
        locationName: string;
        racks: Array<{ id: string; rackLabel: string; active: boolean }>;
      }
    >();
    for (const rack of racks) {
      const existing = byLocation.get(rack.locationId) ?? {
        locationId: rack.locationId,
        locationName: rack.location.name,
        racks: [],
      };
      existing.racks.push({
        id: rack.id,
        rackLabel: rack.rackLabel,
        active: rack.active,
      });
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
      // The client's navigation, in the business's own words.
      //
      // Authority: taskplans/45_plywood_workflow_program.md §8. Groups are the
      // five the specification names — TRADE, INVENTORY, MONEY, INSIGHTS,
      // ADMINISTRATION — not the platform's own "Capabilities" and
      // "Administration", which are implementation vocabulary. A client seeing
      // "Capabilities" is the foundation leaking into the product.
      //
      // Order is dense within a group and leaves gaps between them, so the
      // slices still to come (Suppliers, Customers, Tax & Compliance, People &
      // Roles, Business Settings) drop in without renumbering everything.
      {
        href: "/overview",
        label: "Overview",
        group: "Overview",
        order: 10,
        icon: "overview",
        requiresEntity: ENTITY_INVOICE,
        shells: ["platform"],
      },

      /* ---- TRADE ---- */
      {
        href: "/catalogue",
        label: "Catalogue",
        group: "Trade",
        order: 20,
        icon: "catalogue",
        requiresEntity: ENTITY_PRODUCT,
        shells: ["platform"],
      },
      {
        href: "/suppliers",
        label: "Suppliers",
        group: "Trade",
        order: 21,
        icon: "supplier",
        requiresEntity: ENTITY_SUPPLIER,
        shells: ["platform"],
      },
      {
        href: "/purchases",
        label: "Purchases",
        group: "Trade",
        order: 22,
        icon: "purchases",
        requiresEntity: ENTITY_PURCHASE_ORDER,
        shells: ["platform", "operations"],
      },
      {
        href: "/customers",
        label: "Customers",
        group: "Trade",
        order: 23,
        icon: "parties",
        requiresEntity: ENTITY_CUSTOMER,
        shells: ["platform"],
      },
      {
        href: "/sales",
        label: "Sales",
        group: "Trade",
        order: 24,
        icon: "sales",
        requiresEntity: ENTITY_SALES_ORDER,
        shells: ["platform", "operations"],
      },

      /* ---- INVENTORY ---- */
      {
        href: "/stock",
        label: "Stock",
        group: "Inventory",
        order: 30,
        icon: "stock",
        requiresEntity: ENTITY_STOCK_BALANCE,
        shells: ["platform", "operations"],
      },
      {
        href: "/godowns",
        label: "Godowns",
        group: "Inventory",
        order: 32,
        icon: "locations",
        // §0 — a plywood business has godowns, not "Locations" and not
        // "Assets". Both generic entries present concepts this screen already
        // covers in the client's own word, and showing all three is the
        // foundation leaking into the product. The routes still exist and still
        // authorize; only the menu entry is replaced.
        supersedes: ["/locations", "/assets"],
        // Gated on CREATE rather than READ: rack layout is set up by whoever
        // shapes the godown, not by everyone who reads stock off it.
        requiresEntity: ENTITY_GODOWN_RACK,
        requiresVerb: "Create",
        shells: ["platform"],
      },

      /* ---- MONEY ---- */
      {
        href: "/finance",
        label: "Finance",
        group: "Money",
        order: 40,
        icon: "finance",
        requiresEntity: ENTITY_INVOICE,
        shells: ["platform"],
      },
      {
        // The cash book, and the only place a payment is entered. Above the
        // ledgers because "what money moved" is asked far more often than
        // "what happened with this one party".
        href: "/transactions",
        label: "Transactions",
        group: "Money",
        order: 41,
        icon: "ledger",
        requiresEntity: ENTITY_PAYMENT,
        shells: ["platform"],
      },
      {
        href: "/ledgers",
        label: "Who owes what",
        group: "Money",
        order: 42,
        icon: "ledger",
        requiresEntity: ENTITY_LEDGER_ENTRY,
        shells: ["platform"],
      },

      {
        href: "/prices",
        label: "Agreed prices",
        group: "Money",
        order: 43,
        icon: "finance",
        requiresEntity: ENTITY_SUPPLIER_PRICE,
        requiresVerb: "Edit",
        shells: ["platform"],
      },

      {
        // The centre, not the close screen. Closing a period is one thing an
        // accountant does at the end of a month; reading the position is what
        // they do every day, and the nav should land on the second.
        href: "/tax",
        label: "Tax & Compliance",
        group: "Money",
        order: 44,
        icon: "tax",
        requiresEntity: ENTITY_INVOICE,
        requiresVerb: "Read",
        shells: ["platform"],
      },

      /* ---- INSIGHTS ---- */
      {
        href: "/reports",
        label: "Reports",
        group: "Insights",
        order: 50,
        icon: "audit",
        requiresEntity: ENTITY_INVOICE,
        shells: ["platform"],
      },

      /* ---- ADMINISTRATION ---- */
      {
        href: "/people",
        label: "People & Roles",
        group: "Administration",
        order: 58,
        icon: "people",
        // Gated on the platform's membership entity, not a plywood one: who
        // works here is a platform fact, and the capability only supplies the
        // vocabulary the role editor speaks.
        requiresEntity: "verity.platform.membership",
        requiresVerb: "Read",
        shells: ["platform"],
      },
      {
        href: "/settings/tax",
        label: "Tax Settings",
        group: "Administration",
        order: 62,
        icon: "tax",
        // Edit on the registration: the people who may change a GSTIN or a
        // rate are a much smaller set than those who read tax figures.
        requiresEntity: ENTITY_GST_REGISTRATION,
        requiresVerb: "Edit",
        shells: ["platform"],
      },
      {
        href: "/audit",
        label: "Audit",
        group: "Administration",
        order: 64,
        icon: "audit",
        requiresEntity: ENTITY_INVOICE,
        requiresVerb: "Read",
        shells: ["platform"],
      },
      {
        href: "/settings/business",
        label: "Business Settings",
        group: "Administration",
        order: 60,
        icon: "configuration",
        // Edit, not Read: this is where the business's legal identity is set,
        // and everyone who can read an invoice can already see it printed on
        // one. The people who may change it are a much smaller set.
        requiresEntity: ENTITY_BUSINESS_PROFILE,
        requiresVerb: "Edit",
        shells: ["platform"],
      },
    ],
    workspace: [
      {
        key: "verity.plywood.low_stock",
        label: "Boards at or below reorder level",
        href: "/stock",
        count: async ({ tenantId }) =>
          withTenant(tenantId, async (tx) => {
            const rows = await tx.$queryRaw<{ count: bigint }[]>`
              SELECT count(*)::bigint AS count
                FROM plywood_product p
               WHERE p.active
                 AND p.reorder_level_units > 0
                 AND COALESCE((
                       SELECT sum(b.qty_units) FROM stock_balance b WHERE b.product_id = p.id
                     ), 0) <= p.reorder_level_units`;
            return Number(rows[0]?.count ?? 0);
          }),
        shells: ["platform", "operations"],
      },
    ],
    schedules: [
      {
        key: "verity.plywood.sweep_low_stock",
        label: "Notify on boards at or below reorder level",
        // Daily, not frequent. A board that dropped below its reorder level an
        // hour ago is not a different fact from one that dropped this morning,
        // and a purchase decision is made once a day. Cadence rather than a cron
        // string: the capability knows how often the fact changes and does not
        // know what runs it.
        cadence: "daily",
        run: async ({ tx, tenantId }) => {
          const short = await tx.$queryRaw<
            {
              id: string;
              name: string;
              on_hand: bigint;
              reorder_level_units: number;
            }[]
          >`SELECT p.id,
                   p.name,
                   COALESCE((SELECT sum(b.qty_units) FROM stock_balance b WHERE b.product_id = p.id), 0) AS on_hand,
                   p.reorder_level_units
              FROM plywood_product p
             WHERE p.active
               AND p.reorder_level_units > 0
               AND COALESCE((SELECT sum(b.qty_units) FROM stock_balance b WHERE b.product_id = p.id), 0)
                   <= p.reorder_level_units`;

          if (short.length === 0) return { events: [] };

          // Whoever may create a purchase order is who needs to know. Derived
          // from the permission rather than from a role name, because role names
          // belong to the client and permissions are the model.
          const buyers = await tx.tenantMembership.findMany({
            where: {
              role: {
                permissions: {
                  some: { verb: "Create", entity: ENTITY_STOCK_LEDGER },
                },
              },
            },
            select: { userId: true },
          });

          if (buyers.length > 0) {
            await notify(tx, {
              tenantId,
              key: "verity.plywood.low_stock",
              recipientIds: buyers.map((membership) => membership.userId),
              variables: { count: String(short.length) },
              fallback: {
                subject: `${short.length} board${short.length === 1 ? "" : "s"} at or below reorder level`,
                // §72 — a notification says what to do, not that something is
                // wrong. "Low stock" is a fact the reader must then go and
                // investigate; the board, the figure, the threshold and the
                // next action is something they can act on without leaving the
                // message.
                body: [
                  ...short.map(
                    (row) =>
                      `${row.name} — ${row.on_hand} available, reorder at ${row.reorder_level_units}`,
                  ),
                  "",
                  "Raise a purchase order: /purchases",
                ].join("\n"),
              },
            });
          }

          // Idempotent by construction: the sweep reads a condition and notifies,
          // writing no state that a retry would double. Every real scheduler
          // retries, and this one changes nothing the second time.
          return {
            events: short.map((row) => ({
              name: "verity.plywood.stock_below_reorder_level",
              entityId: row.id,
            })),
          };
        },
      },
    ],
  });

  registerBusinessIdentity();
  registerTax();
  registerBusinessActivities();
  registerReports();
  registerItc();
  registerPeriods();
  registerCommand(createBrand);
  registerCommand(setBrandActive);
  registerCommand(createProduct);
  registerCommand(editProduct);
  registerCommand(setProductActive);
  registerCommand(defineGodownRack);
  registerCommand(setGodownRackActive);
  registerCommand(receiveStock);
  registerCommand(issueStock);
  registerCommand(transferStock);
  registerCommand(adjustStock);
  registerCommand(recordDamagedStock);
  registerCommand(recordReturnedStock);
  registerCommand(createSupplier);
  registerCommand(editSalesOrder);
  registerCommand(editPurchaseOrder);
  registerCommand(removeCustomer);
  registerCommand(editCustomer);
  registerCommand(removeSupplier);
  registerCommand(editSupplier);
  registerCommand(setSupplierPrice);
  registerCommand(setPriceSheet);
  registerCommand(createCustomer);
  registerCommand(setCustomerPrice);
  registerCommand(setCreditLimit);
  registerCommand(createPurchaseOrder);
  registerCommand(submitPurchaseOrder);
  registerCommand(receiveGoods);
  registerCommand(linkSupplierToCustomer);
  registerCommand(cancelPurchaseOrder);
  registerCommand(createSalesOrder);
  registerCommand(approveCredit);
  registerCommand(reserveForOrder);
  registerCommand(dispatchOrder);
  registerCommand(cancelSalesOrder);
  registerCommand(raiseSalesInvoice);
  registerCommand(raisePurchaseInvoice);
  registerCommand(recordPayment);
  registerCommand(recordPartyPayment);
  registerCommand(confirmPurchaseBill);
  registerCommand(raisePurchaseBillFromOrder);
  registerCommand(raiseInvoiceNote);

  registerQuery(listCatalogue);
  registerQuery(listGodownRacks);
  registerQuery(stockOnHand);
  registerQuery(lowStock);
  registerQuery(productMovements);
  registerQuery(purchaseMatch);
  registerQuery(goodsReceiptDetail);
  registerQuery(listSuppliers);
  registerQuery(supplierDetail);
  registerQuery(listCustomers);
  registerQuery(customerDetail);
  registerQuery(productDetail);
  registerQuery(supplierPrices);
  registerQuery(customerPrices);
  registerQuery(godownDetail);
  registerQuery(stockLedger);
  registerQuery(sellableStock);
  registerQuery(purchaseReviewQueue);
  registerQuery(purchaseOrderDetail);
  registerQuery(salesOrderDetail);
  registerQuery(openOrders);
  registerQuery(stockAvailability);
  registerQuery(listInvoices);
  registerQuery(invoiceDetail);
  registerQuery(outstandingReceivables);
  registerQuery(partyLedger);
  registerQuery(partyBalances);
  registerQuery(paymentJournal);
  registerQuery(unbilledMovements);
  registerQuery(ownerConsole);
  registerQuery(marginReport);
}
