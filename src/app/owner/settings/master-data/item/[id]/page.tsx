import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { resolveGroupBomMode } from "@/lib/server/bomEdits";
import { getItemUsedIn, loadRefLabels } from "@/server/queries/spec";
import { DeleteItemButton } from "@/components/spec/DeleteItemButton";
import { ItemBomEditor } from "@/components/spec/ItemBomEditor";
import { ContributionEditor } from "@/components/spec/ContributionEditor";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dbUser = await getOwnerUser();
  if (!(await canUser(dbUser, "ACCESS_MASTER_DATA"))) redirect("/unauthorized");

  const { id } = await params;
  const item = await prisma.itemMaster.findFirst({
    where: { id, factoryId: dbUser.factoryId },
    include: {
      group: true,
      specValues: {
        include: {
          field: { select: { name: true, unitSuffix: true, sortOrder: true } },
          option: { select: { label: true } },
          valueItem: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!item) return <div className="p-8 text-sm text-text-secondary">Item not found.</div>;

  // The BOM itself is loaded by ItemBomEditor, which also has to refetch after
  // every edit — fetching it here too would just be a wasted round trip.
  const [usedIn, refLabels, bomMode] = await Promise.all([
    getItemUsedIn(id),
    loadRefLabels(
      item.specValues.map((v) => v.valueRefId).filter((x): x is string => Boolean(x))
    ),
    item.groupId
      ? resolveGroupBomMode(dbUser.factoryId, item.groupId)
      : Promise.resolve("OFF" as const),
  ]);

  const specs = [...item.specValues].sort((a, b) => a.field.sortOrder - b.field.sortOrder);

  // Which BOM editor this item gets is the category's decision, not a guess.
  //
  // This used to be inferred: producible AND stocked AND not bought meant
  // "recipe"; units-off OR referenced-by-a-spec-column meant "contributes".
  // The inference was defensible but it was still the code deciding what the
  // factory meant, and there was no way to disagree with it — a raw material
  // that genuinely has a recipe could not be given one.
  //
  // Resolved above through the category tree, not read off this item's own
  // group: a subcategory that states no mode follows its parent.
  const showRecipe = bomMode === "RECIPE";
  const showContributions = bomMode === "INGREDIENTS";

  const display = (v: (typeof specs)[number]) => {
    if (v.option) return v.option.label;
    if (v.valueItem) return v.valueItem.name;
    if (v.valueRefId) return refLabels.get(v.valueRefId) ?? "-";
    if (v.valueNumber !== null) return `${v.valueNumber}${v.field.unitSuffix ?? ""}`;
    if (v.valueBool !== null) return v.valueBool ? "Yes" : "No";
    return v.valueText || "-";
  };

  return (
    <div className="space-y-8 p-8 text-text-primary">
      <header>
        <Link
          href={`/owner/master-data?group=${item.groupId ?? ""}`}
          className="text-sm text-text-secondary hover:underline"
        >
          Back to {item.group?.name ?? "Master data"}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-text-primary">
          {item.name}
          {item.status === "DRAFT" && (
            <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              DRAFT
            </span>
          )}
        </h1>
        <p className="font-mono text-xs text-text-secondary">{item.itemCode}</p>
        <p className="mt-1 text-xs text-text-secondary">
          {item.itemType} / {item.manufacturingType} / {item.defaultUOM}
          {item.aliasName && <> / alias &quot;{item.aliasName}&quot;</>}
        </p>
        <div className="mt-4">
          <DeleteItemButton
            itemId={item.id}
            itemName={item.name}
            returnTo={`/owner/master-data?group=${item.groupId ?? ""}`}
          />
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Spec</h2>
        {specs.length === 0 ? (
          <p className="text-sm text-text-secondary">No spec answers stored.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            {specs.map((v) => (
              <div key={v.id}>
                <dt className="text-xs text-text-secondary">{v.field.name}</dt>
                <dd>{display(v)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Set per category in Configure → BOM. Recipe for something assembled;
          Ingredients for something other items pick and inherit from; Off for a
          raw material that is only ever bought and consumed. */}
      {showRecipe && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-text-primary">Bill of materials</h2>
          <ItemBomEditor itemId={item.id} itemName={item.name} />
        </section>
      )}

      {showContributions && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-text-primary">Contributes to items using it</h2>
          <p className="mb-2 text-xs text-text-secondary">
            Components any item inherits by choosing {item.name} in its specification.
          </p>
          <ContributionEditor owner={{ kind: "ITEM", id: item.id }} ownerLabel={item.name} />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Used in ({usedIn.length})</h2>
        <ul className="text-sm">
          {usedIn.map((i) => (
            <li key={i.id}>
              <Link href={`/owner/settings/master-data/item/${i.id}`} className="hover:underline">
                {i.name}
              </Link>
            </li>
          ))}
          {usedIn.length === 0 && (
            <li className="text-text-secondary">Not used by any item yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
