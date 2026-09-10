import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import {
  registerCommand,
  ValidationError,
  type CommandContext,
  type CommandDefinition,
} from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { recordActivity } from "@/server/platform/audit";

/**
 * CAPABILITY: Recipe — `verity.capability.recipe` (Colonel Kebabz Phase 1)
 *
 * Authority: `clients/colonel-kebabz/prd.md` §14-16 (Recipe Management,
 * Recipe BOM, Food Cost) via `clients/colonel-kebabz/phase-plan.md`'s
 * 2026-09-10 decision. Recipe/BOM is the load-bearing abstraction between
 * `dinein.MenuItem` (what's sold) and `inventory.InventoryItem` (what's
 * stocked): a Recipe lists the ingredients and quantities one portion of a
 * MenuItem consumes.
 *
 * SCOPE BUILT: Recipe CRUD (whole-BOM replace, not incremental line edits —
 * matches how a kitchen actually revises a recipe), a cost/food-cost-%
 * query, and `postConsumptionForOrder` — a plain internal function, NOT a
 * registered command, called by `dinein.settle_bill`'s own handler under
 * that command's single `authorize()` (same posture as settle_bill's
 * existing direct writes to Bill/DiningOrder/DiningTable: one authorized
 * command has several natural side effects, not several separately
 * authorized ones). This deliberately does not reuse
 * `inventory.recordStockMovement`'s negative-stock guard: theoretical
 * consumption must post even when it would take a balance negative,
 * because that very gap is what PRD §16's Food Cost variance report exists
 * to surface. A real negative-stock guard still applies to a human issuing
 * stock by hand through `inventory.recordStockMovement` directly.
 *
 * NOT BUILT (left for a later slice): the §16 theoretical-vs-actual
 * variance report itself (Opening + Purchases - Closing vs. recipe-derived
 * expected consumption) — this capability only posts the consumption side
 * of that ledger; per-variant recipes; recipe versioning/history.
 */

export const RECIPE_CAPABILITY = "verity.capability.recipe";
export const ENTITY_RECIPE = "verity.recipe.recipe";

/* ================================== recipe ================================== */

const ingredientInput = z.object({
  inventoryItemId: z.string().uuid(),
  qty: z.number().positive(),
  unitLabel: z.string().min(1).max(30),
});

export const saveRecipe: CommandDefinition<
  { menuItemId: string; yieldQty?: number; ingredients: Array<z.infer<typeof ingredientInput>> },
  { recipeId: string }
> = {
  key: "verity.recipe.save_recipe",
  entity: ENTITY_RECIPE,
  verb: "Edit",
  input: z.object({
    menuItemId: z.string().uuid(),
    yieldQty: z.number().int().positive().optional(),
    ingredients: z.array(ingredientInput).min(1),
  }),
  preconditions: async (ctx, input) => {
    const menuItem = await ctx.tx.menuItem.findUnique({ where: { id: input.menuItemId } });
    if (!menuItem) throw new ValidationError("E_VALIDATION: menu item not found in this tenant");

    const ids = input.ingredients.map((i) => i.inventoryItemId);
    if (new Set(ids).size !== ids.length) {
      throw new ValidationError("E_VALIDATION: an ingredient appears more than once in this recipe");
    }
    const items = await ctx.tx.inventoryItem.findMany({ where: { id: { in: ids } } });
    if (items.length !== ids.length) {
      throw new ValidationError("E_VALIDATION: one or more ingredients are not inventory items in this tenant");
    }
  },
  handler: async (ctx, input) => {
    const recipe = await ctx.tx.recipe.upsert({
      where: { tenantId_menuItemId: { tenantId: ctx.actor.tenantId, menuItemId: input.menuItemId } },
      create: {
        tenantId: ctx.actor.tenantId,
        menuItemId: input.menuItemId,
        yieldQty: input.yieldQty ?? 1,
      },
      update: {
        yieldQty: input.yieldQty ?? 1,
        version: { increment: 1 },
      },
    });

    // Whole-BOM replace: delete every existing line, then recreate. A recipe
    // edit is "here is the new BOM," not a diff of individual lines.
    await ctx.tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    await ctx.tx.recipeIngredient.createMany({
      data: input.ingredients.map((ing) => ({
        tenantId: ctx.actor.tenantId,
        recipeId: recipe.id,
        inventoryItemId: ing.inventoryItemId,
        qty: ing.qty,
        unitLabel: ing.unitLabel,
      })),
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_RECIPE,
      entityId: recipe.id,
      commandKey: "verity.recipe.save_recipe",
      changes: [{ field: "ingredientCount", oldValue: null, newValue: input.ingredients.length }],
    });

    return {
      result: { recipeId: recipe.id },
      events: [{ name: "verity.recipe.recipe_saved", entityId: recipe.id }],
    };
  },
};

export const setRecipeActive: CommandDefinition<{ recipeId: string; active: boolean }, { id: string }> = {
  key: "verity.recipe.set_recipe_active",
  entity: ENTITY_RECIPE,
  verb: "Edit",
  input: z.object({ recipeId: z.string().uuid(), active: z.boolean() }),
  handler: async (ctx, input) => {
    const recipe = await ctx.tx.recipe.update({
      where: { id: input.recipeId },
      data: { active: input.active, version: { increment: 1 } },
    });
    return {
      result: { id: recipe.id },
      events: [
        {
          name: input.active ? "verity.recipe.recipe_activated" : "verity.recipe.recipe_deactivated",
          entityId: recipe.id,
        },
      ],
    };
  },
};

export const getRecipeCost: QueryDefinition<
  { menuItemId: string },
  {
    recipeId: string;
    yieldQty: number;
    sellingPriceMinor: number;
    ingredients: Array<{
      inventoryItemId: string;
      name: string;
      qty: number;
      unitLabel: string;
      unitCostPaise: number | null;
      lineCostPaise: number | null;
    }>;
    totalCostPaise: number | null;
    foodCostPercent: number | null;
  } | null
> = {
  key: "verity.recipe.get_recipe_cost",
  entity: ENTITY_RECIPE,
  input: z.object({ menuItemId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const menuItem = await ctx.tx.menuItem.findUnique({ where: { id: input.menuItemId } });
    if (!menuItem) throw new ValidationError("E_VALIDATION: menu item not found in this tenant");

    const recipe = await ctx.tx.recipe.findUnique({
      where: { tenantId_menuItemId: { tenantId: ctx.actor.tenantId, menuItemId: input.menuItemId } },
      include: { ingredients: { include: { inventoryItem: { select: { name: true, avgUnitCostPaise: true } } } } },
    });
    if (!recipe) return null;

    let totalCostPaise: number | null = 0;
    const ingredients = recipe.ingredients.map((ing) => {
      const qty = Number(ing.qty);
      const unitCostPaise = ing.inventoryItem.avgUnitCostPaise;
      const lineCostPaise = unitCostPaise === null ? null : Math.round(unitCostPaise * qty);
      if (lineCostPaise === null) totalCostPaise = null;
      else if (totalCostPaise !== null) totalCostPaise += lineCostPaise;
      return {
        inventoryItemId: ing.inventoryItemId,
        name: ing.inventoryItem.name,
        qty,
        unitLabel: ing.unitLabel,
        unitCostPaise,
        lineCostPaise,
      };
    });

    const perPortionCostPaise = totalCostPaise === null ? null : totalCostPaise / recipe.yieldQty;
    const foodCostPercent =
      perPortionCostPaise === null || menuItem.priceMinor === 0
        ? null
        : Math.round((perPortionCostPaise / menuItem.priceMinor) * 10000) / 100;

    return {
      recipeId: recipe.id,
      yieldQty: recipe.yieldQty,
      sellingPriceMinor: menuItem.priceMinor,
      ingredients,
      totalCostPaise: perPortionCostPaise,
      foodCostPercent,
    };
  },
};

/* ============================ order consumption ============================ */

/**
 * Posts theoretical ingredient consumption for one settled order — the
 * `ORDER COMPLETED -> Inventory Consumption` chain PRD §128 names. Called
 * by `dinein.settle_bill`'s handler, inside that command's own transaction
 * and `authorize()` — see the module doc for why this is a plain function,
 * not a second registered command.
 *
 * Silently does nothing for a line whose MenuItem has no active Recipe —
 * not every dish needs a BOM before this ships, and a missing recipe is a
 * data-completeness gap, not an error to block settlement over.
 */
export async function postConsumptionForOrder(ctx: CommandContext, orderId: string): Promise<void> {
  const order = await ctx.tx.diningOrder.findUniqueOrThrow({ where: { id: orderId } });
  const lines = await ctx.tx.orderLine.findMany({
    where: { orderId, state: { not: "voided" } },
  });
  if (lines.length === 0) return;

  const menuItemIds = [...new Set(lines.map((l) => l.itemId))];
  const recipes = await ctx.tx.recipe.findMany({
    where: { menuItemId: { in: menuItemIds }, active: true },
    include: { ingredients: true },
  });
  if (recipes.length === 0) return;

  const recipeByMenuItem = new Map(recipes.map((r) => [r.menuItemId, r]));
  const consumptionByIngredient = new Map<string, number>();

  for (const line of lines) {
    const recipe = recipeByMenuItem.get(line.itemId);
    if (!recipe) continue;
    const portions = line.qty / recipe.yieldQty;
    for (const ing of recipe.ingredients) {
      const consumed = Number(ing.qty) * portions;
      consumptionByIngredient.set(
        ing.inventoryItemId,
        (consumptionByIngredient.get(ing.inventoryItemId) ?? 0) + consumed,
      );
    }
  }
  if (consumptionByIngredient.size === 0) return;

  for (const [inventoryItemId, qty] of consumptionByIngredient) {
    // Rounded to the nearest whole unit: InventoryStockMovement.qty is Int
    // (same convention as inventory's own recordStockMovement). Fractional
    // ingredient quantities accumulate at the recipe/BOM layer above; only
    // the posted ledger movement rounds.
    const roundedQty = Math.round(qty);
    if (roundedQty === 0) continue;

    await ctx.tx.inventoryStockMovement.create({
      data: {
        tenantId: ctx.actor.tenantId,
        itemId: inventoryItemId,
        locationId: order.locationId,
        kind: "Issue",
        qty: -roundedQty,
        reference: `dining_order:${orderId}`,
        movedById: ctx.actor.userId,
      },
    });
    await ctx.tx.inventoryStockBalance.upsert({
      where: {
        tenantId_itemId_locationId: {
          tenantId: ctx.actor.tenantId,
          itemId: inventoryItemId,
          locationId: order.locationId,
        },
      },
      create: {
        tenantId: ctx.actor.tenantId,
        itemId: inventoryItemId,
        locationId: order.locationId,
        qty: -roundedQty,
      },
      update: { qty: { decrement: roundedQty } },
    });
  }
}

/* ============================== registration ============================== */

export function registerRecipeCapability(): void {
  registerContribution({
    capabilityId: RECIPE_CAPABILITY,
    navigation: [
      {
        href: "/recipes",
        label: "Recipes",
        group: "Inventory",
        order: 21,
        icon: "book",
        requiresEntity: ENTITY_RECIPE,
        shells: ["platform", "operations"],
      },
    ],
  });
  registerCommand(saveRecipe);
  registerCommand(setRecipeActive);
  registerQuery(getRecipeCost);
}
