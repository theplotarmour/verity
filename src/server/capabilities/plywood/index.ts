import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import {
  registerCommand,
  ValidationError,
  type CommandDefinition,
} from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { notify } from "@/server/platform/notification";
import { withTenant } from "@/server/platform/tenancy";
import { PLYWOOD_CAPABILITY } from "./keys";
import { productDetail } from "./views";
import {
  registerTradingCapability,
  ENTITY_PRODUCT,
  ENTITY_SUPPLIER,
  ENTITY_PURCHASE_ORDER,
  ENTITY_CUSTOMER,
  ENTITY_SALES_ORDER,
  ENTITY_STOCK_BALANCE,
  ENTITY_STOCK_LEDGER,
  ENTITY_INVOICE,
  ENTITY_PAYMENT,
  ENTITY_LEDGER_ENTRY,
  ENTITY_SUPPLIER_PRICE,
  ENTITY_GST_REGISTRATION,
  ENTITY_BUSINESS_PROFILE,
  HSN_CODE,
  captureMetricSnapshot,
  stockOnHand as tradingStockOnHand,
} from "../trading";

/**
 * CAPABILITY: Plywood — `verity.capability.plywood`
 *
 * ADR-018 shrank this to plywood's own board-dimension/grade taxonomy —
 * everything generic (parties, orders, invoicing, GST, payments, ledger,
 * stock, brands, godown racks) now lives in `../trading`
 * (`verity.capability.trading`), which this capability depends on
 * (`CapabilityDefinition.dependencies`, DB-trigger-enforced) and re-exports
 * wholesale below, so nothing importing from `@/server/capabilities/plywood`
 * had to change.
 *
 * WHAT THIS CAPABILITY STILL OWNS
 * `createProduct`/`editProduct`/`setProductActive`/`listCatalogue` — each
 * writes/reads BOTH the generic `TradingProduct` base row (name, brand, HSN,
 * type, reorder level, unit label) and this capability's own
 * `PlywoodProductDetail` extension (thickness, category, size, grade) in one
 * transaction, so the UI-facing "create a product" contract is exactly what
 * it was before the split — one call, one form, one product.
 */

export * from "../trading";
export * from "./keys";
export * from "./views";
export {
  PRODUCT_CATEGORIES,
  SIZE_UNITS,
  CATEGORY_RULES,
  formatProductSize,
  productLabel,
  type ProductCategory,
  type SizeUnit,
} from "./product";
import {
  CATEGORY_RULES,
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type SizeUnit,
} from "./product";

export const PRODUCT_TYPES = ["PHYSICAL", "SERVICE"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/* ================================ products ================================ */

export const createProduct: CommandDefinition<
  {
    brandId: string;
    name: string;
    hsnCode: string;
    thicknessTenthMm?: number;
    category?: ProductCategory;
    widthTenth?: number;
    heightTenth?: number;
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
    // Which family this is. The unit its size is quoted in follows from it —
    // see CATEGORY_RULES — and is never accepted from the caller, so a louvre
    // cannot arrive measured in feet.
    category: z.enum(PRODUCT_CATEGORIES).optional(),
    // Tenths of that unit: 80 is 8.0 ft, 960 is 96.0 in, 24400 is 2440.0 mm.
    widthTenth: z.number().int().positive().optional(),
    heightTenth: z.number().int().positive().optional(),
    grade: z.string().min(1).max(60),
    sheetWeightGrams: z.number().int().positive().optional(),
    reorderLevelUnits: z.number().int().min(0).optional(),
    unitLabel: z.string().min(1).max(30).optional(),
    type: z.enum(PRODUCT_TYPES).optional(),
  }),
  preconditions: async (ctx, input) => {
    const brand = await ctx.tx.tradingBrand.findUnique({
      where: { id: input.brandId },
    });
    if (!brand)
      throw new ValidationError("E_VALIDATION: brand not found in this tenant");
    if (!brand.active) {
      throw new ValidationError(
        "E_VALIDATION: cannot add a product to a deactivated brand",
      );
    }

    const rules = CATEGORY_RULES[input.category ?? "OTHER"];

    // A board with no thickness is the one mistake this catalogue cannot
    // absorb: thickness is what tells two otherwise identical rows apart, and
    // an order line for "Sainik 710" with no millimetres is a guess made in
    // the godown. Checked only for a physical item — a service has no edge.
    if (
      rules.thickness === "required" &&
      (input.type ?? "PHYSICAL") === "PHYSICAL" &&
      input.thicknessTenthMm === undefined
    ) {
      throw new ValidationError(
        `E_VALIDATION: a ${rules.label.toLowerCase()} needs a thickness in mm`,
      );
    }

    // Both sides or neither. Half a size reads as a complete one on screen.
    if ((input.widthTenth === undefined) !== (input.heightTenth === undefined)) {
      throw new ValidationError(
        "E_VALIDATION: give both the width and the height, or neither",
      );
    }
  },
  handler: async (ctx, input) => {
    const category = input.category ?? "OTHER";
    const rules = CATEGORY_RULES[category];
    // The client sells one laminate size. Rather than trusting the form to
    // send it, the command states it — so a laminate is 8 x 4 no matter which
    // caller wrote it, and the CHECK constraint behind this agrees.
    const size = rules.fixedSizeTenth ?? {
      widthTenth: input.widthTenth ?? null,
      heightTenth: input.heightTenth ?? null,
    };

    // One transaction, two tables: the generic base and plywood's own
    // dimension/grade extension (ADR-018). The UI still sees one call.
    const product = await ctx.tx.tradingProduct.create({
      data: {
        tenantId: ctx.actor.tenantId,
        brandId: input.brandId,
        name: input.name,
        hsnCode: input.hsnCode,
        reorderLevelUnits: input.reorderLevelUnits ?? 0,
        unitLabel: input.unitLabel ?? "sheets",
        type: input.type ?? "PHYSICAL",
      },
    });
    await ctx.tx.plywoodProductDetail.create({
      data: {
        tenantId: ctx.actor.tenantId,
        productId: product.id,
        thicknessTenthMm: input.thicknessTenthMm ?? null,
        category,
        sizeUnit: rules.sizeUnit,
        widthTenth: size.widthTenth,
        heightTenth: size.heightTenth,
        grade: input.grade,
        sheetWeightGrams: input.sheetWeightGrams ?? null,
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
    category?: ProductCategory;
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
    /**
     * Correcting which family a product belongs to, for the same reason
     * `type` is correctable: a laminate filed as a board is a data-entry slip,
     * and being permanently stuck with it is not a rule anyone chose. Bounded
     * by the same two guards — nothing may have moved, and the unit the size
     * is quoted in may not change underneath a size that already exists.
     */
    category: z.enum(PRODUCT_CATEGORIES).optional(),
  }),
  handler: async (ctx, input) => {
    const before = await ctx.tx.tradingProduct.findUniqueOrThrow({
      where: { id: input.productId },
      include: { plywoodDetail: true },
    });
    const beforeDetail = before.plywoodDetail;

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

    // A family change moves the product between unit systems, so it carries
    // the same history guard as a type change, plus one of its own.
    let sizeChange: {
      category: ProductCategory;
      sizeUnit: SizeUnit;
      widthTenth: number | null;
      heightTenth: number | null;
    } | null = null;

    if (
      input.category !== undefined &&
      input.category !== beforeDetail?.category
    ) {
      const movements = await ctx.tx.stockLedgerEntry.count({
        where: { productId: input.productId },
      });
      if (movements > 0) {
        throw new ValidationError(
          `E_VALIDATION: ${before.name} already has ${movements} stock movement(s), ` +
            "so it cannot be moved to another product family. Withdraw it and add it again.",
        );
      }

      const rules = CATEGORY_RULES[input.category];
      const hasSize =
        beforeDetail?.widthTenth != null && beforeDetail?.heightTenth != null;

      // 8 ft is not 8 in. Re-labelling the unit while leaving the number alone
      // would turn a stated size into a different one without anyone typing a
      // digit, so the size has to go back through creation instead.
      if (
        hasSize &&
        rules.sizeUnit !== beforeDetail?.sizeUnit &&
        !rules.fixedSizeTenth
      ) {
        const fromUnit =
          beforeDetail?.sizeUnit === "FT"
            ? "feet"
            : beforeDetail?.sizeUnit === "IN"
              ? "inches"
              : "millimetres";
        throw new ValidationError(
          `E_VALIDATION: a ${rules.label.toLowerCase()} is sized in ` +
            `${rules.sizeUnit === "FT" ? "feet" : rules.sizeUnit === "IN" ? "inches" : "millimetres"}, ` +
            `and ${before.name} is recorded in ${fromUnit}. ` +
            "Withdraw it and add it again at the right size.",
        );
      }

      sizeChange = {
        category: input.category,
        sizeUnit: rules.sizeUnit,
        widthTenth: rules.fixedSizeTenth
          ? rules.fixedSizeTenth.widthTenth
          : (beforeDetail?.widthTenth ?? null),
        heightTenth: rules.fixedSizeTenth
          ? rules.fixedSizeTenth.heightTenth
          : (beforeDetail?.heightTenth ?? null),
      };
    }

    const after = await ctx.tx.tradingProduct.update({
      where: { id: input.productId },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.hsnCode === undefined ? {} : { hsnCode: input.hsnCode }),
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
    await ctx.tx.plywoodProductDetail.update({
      where: { productId: input.productId },
      data: {
        ...(sizeChange === null ? {} : sizeChange),
        ...(input.grade === undefined ? {} : { grade: input.grade }),
        ...(input.sheetWeightGrams === undefined
          ? {}
          : { sheetWeightGrams: input.sheetWeightGrams }),
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
          grade: beforeDetail?.grade,
          reorderLevelUnits: before.reorderLevelUnits,
          type: before.type,
          category: beforeDetail?.category,
        },
        {
          name: after.name,
          hsnCode: after.hsnCode,
          grade: input.grade ?? beforeDetail?.grade,
          reorderLevelUnits: after.reorderLevelUnits,
          type: after.type,
          category: input.category ?? beforeDetail?.category,
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
    const product = await ctx.tx.tradingProduct.update({
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

/* ================================= queries ================================= */

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
      category: ProductCategory;
      sizeUnit: SizeUnit;
      widthTenth: number | null;
      heightTenth: number | null;
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
    const brands = await ctx.tx.tradingBrand.findMany({
      where: {
        ...(input.includeInactive ? {} : { active: true }),
        ...(input.brandId ? { id: input.brandId } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        products: {
          where: input.includeInactive ? {} : { active: true },
          orderBy: [{ name: "asc" }],
          include: { plywoodDetail: true },
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
        thicknessTenthMm: product.plywoodDetail?.thicknessTenthMm ?? null,
        category: (product.plywoodDetail?.category ?? "OTHER") as ProductCategory,
        sizeUnit: (product.plywoodDetail?.sizeUnit ?? "MM") as SizeUnit,
        widthTenth: product.plywoodDetail?.widthTenth ?? null,
        heightTenth: product.plywoodDetail?.heightTenth ?? null,
        grade: product.plywoodDetail?.grade ?? "",
        unitLabel: product.unitLabel,
        reorderLevelUnits: product.reorderLevelUnits,
        active: product.active,
        type: product.type as ProductType,
      })),
    }));
  },
};

/**
 * `trading.stockOnHand`, augmented with plywood's `grade` — the one field
 * the stock board (`StockBoard.tsx`) actually renders per row that the
 * generic query cannot know about. Shadows the star-re-exported binding
 * from `../trading` (ES module semantics: a local export always wins over
 * one brought in by `export *`), so anything importing `stockOnHand` from
 * `@/server/capabilities/plywood` gets this version. Registered under its
 * own key — `verity.trading.stock_on_hand` is already taken by the
 * ungraded version `registerTradingCapability()` registers.
 */
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
  input: tradingStockOnHand.input,
  handler: async (ctx, input) => {
    const rows = await tradingStockOnHand.handler(ctx, input);
    if (rows.length === 0) return [];
    const details = await ctx.tx.plywoodProductDetail.findMany({
      where: { productId: { in: [...new Set(rows.map((r) => r.productId))] } },
      select: { productId: true, grade: true },
    });
    const gradeOf = new Map(details.map((d) => [d.productId, d.grade]));
    return rows.map((row) => ({
      ...row,
      grade: gradeOf.get(row.productId) ?? "",
    }));
  },
};

/* ============================== registration ============================== */

export function registerPlywoodCapability(): void {
  registerTradingCapability();

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
        // Gated on the LOCATION, not on racks. Racks were withdrawn, and a
        // menu entry that checks a permission for a feature nobody can reach
        // hides the page from whoever happens to lack a grant nothing uses.
        requiresEntity: "verity.location.location",
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
                FROM trading_product p
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
              FROM trading_product p
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
      {
        key: "verity.plywood.capture_metric_snapshot",
        label: "Capture today's business metrics for the trend history",
        // Daily — a metric snapshot is a business-day fact, not something
        // that needs frequent/hourly resolution. Task 100's own missing
        // prerequisite for a real sparkline: see captureMetricSnapshot's
        // module comment in trading/finance.ts for the full reasoning.
        cadence: "daily",
        run: async ({ tx, tenantId }) => captureMetricSnapshot(tx, tenantId),
      },
    ],
  });

  registerCommand(createProduct);
  registerCommand(editProduct);
  registerCommand(setProductActive);

  registerQuery(listCatalogue);
  registerQuery(productDetail);
  registerQuery(stockOnHand);
}
