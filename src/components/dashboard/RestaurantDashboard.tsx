import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { formatMenuPrice } from "@/lib/menu";
import { Nothing, Panel, StatRow } from "./shared";

/**
 * Restaurant OS — a single location.
 *
 * Deliberately small, and only as large as the modules that exist. Without it a
 * restaurant tenant fell through `page.tsx`'s default and landed on the auto
 * components dashboard: "Today Production", "QC Pass Rate", "Seat sets". That is
 * the exact failure the per-vertical switch exists to prevent, and a placeholder
 * that says less is worth more than a screen that confidently says the wrong thing.
 *
 * It grows as Tables, Kitchen and Serving land — covers, ticket times, table turn.
 * Until then it reports the menu, because the menu is what a restaurant on this
 * product currently has.
 */
export async function RestaurantDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const [categories, itemCount, unavailable, priciest, staffCount] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { factoryId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, _count: { select: { items: true } } },
    }),
    prisma.menuItem.count({ where: { factoryId } }),
    // The number that matters during service: what is off the menu right now.
    prisma.menuItem.findMany({
      where: { factoryId, available: false },
      orderBy: { name: "asc" },
      take: 10,
      select: { id: true, name: true, price: true },
    }),
    prisma.menuItem.findFirst({
      where: { factoryId, available: true },
      orderBy: { price: "desc" },
      select: { name: true, price: true },
    }),
    prisma.user.count({ where: { factoryId, isActive: true } }),
  ]);

  const emptyCategories = categories.filter((c) => c._count.items === 0).length;

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader title={`Welcome ${firstName}`} />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric href="/owner/menu" label="Menu Items" value={String(itemCount)} detail="On the card" tone="blue" />
        <Metric
          href="/owner/menu"
          label="Off Menu"
          value={String(unavailable.length)}
          detail="Marked unavailable"
          tone={unavailable.length > 0 ? "red" : "green"}
        />
        <Metric href="/owner/menu" label="Categories" value={String(categories.length)} detail="Menu sections" tone="amber" />
        <Metric href="/owner/team" label="Staff" value={String(staffCount)} detail="Active" tone="green" />
      </section>

      <section className="grid w-full flex-1 gap-4 xl:grid-cols-2 xl:gap-6">
        <Panel eyebrow="Right now" title="Off the menu">
          {unavailable.length === 0 ? (
            <Nothing href="/owner/menu" cta="Open the menu">
              Everything on the card is available. Items you mark unavailable during service
              appear here.
            </Nothing>
          ) : (
            <div className="space-y-2">
              {unavailable.map((item) => (
                <StatRow key={item.id} label={item.name} value={formatMenuPrice(item.price)} tone="warn" />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          eyebrow="Menu"
          title="Sections"
          action={
            priciest ? (
              <span className="shrink-0 font-mono text-[13px] text-text-tertiary">
                top {formatMenuPrice(priciest.price)}
              </span>
            ) : null
          }
        >
          {categories.length === 0 ? (
            <Nothing href="/owner/menu" cta="Build the menu">
              No menu yet. Start with a section — Starters, Mains, Breads — and add items to it.
            </Nothing>
          ) : (
            <>
              <div className="space-y-2">
                {categories.map((category) => (
                  <StatRow
                    key={category.id}
                    label={category.name}
                    value={category._count.items}
                    detail={category._count.items === 0 ? "No items yet" : undefined}
                    tone={category._count.items === 0 ? "warn" : "neutral"}
                  />
                ))}
              </div>
              {emptyCategories > 0 ? (
                <p className="mt-4 text-[11px] text-text-tertiary">
                  {emptyCategories} {emptyCategories === 1 ? "section has" : "sections have"} no
                  items, so {emptyCategories === 1 ? "it" : "they"} will print blank.
                </p>
              ) : null}
            </>
          )}
        </Panel>
      </section>
    </div>
  );
}
