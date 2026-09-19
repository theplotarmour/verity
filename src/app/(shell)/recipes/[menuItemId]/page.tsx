import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { RECIPE_CAPABILITY } from "@/server/capabilities/recipe";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { runQuery } from "@/server/actions/platform";
import { PageHeader, DefinitionList, Panel, EmptyState, ErrorState } from "@/components/ui/primitives";
import { RecipeForm } from "./RecipeForm";

export const dynamic = "force-dynamic";

type RecipeCost = {
  recipeId: string; yieldQty: number; sellingPriceMinor: number;
  ingredients: Array<{ inventoryItemId: string; name: string; qty: number; unitLabel: string; unitCostPaise: number | null; lineCostPaise: number | null }>;
  totalCostPaise: number | null; foodCostPercent: number | null;
} | null;

function formatRupees(minor: number): string {
  return (minor / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

/** §14-16 — Recipe/BOM for one menu item: food cost, ingredients, whole-BOM edit. */
async function RecipePage({ params }: { params: Promise<{ menuItemId: string }> }) {
  const { menuItemId } = await params;
  const actor = await requireActor();

  const [menuItem, inventoryItems, result] = await Promise.all([
    withTenant(actor.tenantId, (tx) => tx.menuItem.findUnique({ where: { id: menuItemId } })),
    withTenant(actor.tenantId, (tx) => tx.inventoryItem.findMany({ select: { id: true, name: true } })),
    runQuery<RecipeCost>("verity.recipe.get_recipe_cost", { menuItemId }),
  ]);

  if (!menuItem) return <EmptyState title="Menu item not found" description="No menu item with this id in your scope." />;
  if (!result.ok) return <ErrorState title="Could not load recipe" message={result.message} issues={result.issues} retryable={result.retryable} />;
  const recipe = result.data;

  return (
    <>
      <PageHeader title={`Recipe — ${menuItem.name}`} description="What's consumed to produce this item, and its food cost." />

      {recipe && (
        <Panel title="Food cost" className="mb-6">
          <DefinitionList
            items={[
              { term: "Selling price", value: formatRupees(recipe.sellingPriceMinor) },
              { term: "Total cost", value: recipe.totalCostPaise === null ? "Unpriced ingredient" : formatRupees(recipe.totalCostPaise) },
              { term: "Food cost %", value: recipe.foodCostPercent === null ? "—" : `${recipe.foodCostPercent.toFixed(1)}%` },
            ]}
          />
        </Panel>
      )}

      <RecipeForm
        menuItemId={menuItemId}
        recipeId={recipe?.recipeId}
        yieldQty={recipe?.yieldQty ?? 1}
        ingredients={recipe?.ingredients.map((i) => ({ inventoryItemId: i.inventoryItemId, qty: i.qty, unitLabel: i.unitLabel })) ?? []}
        inventoryItems={inventoryItems}
      />
    </>
  );
}

export default withCapabilityPageAccess(RECIPE_CAPABILITY, RecipePage);
