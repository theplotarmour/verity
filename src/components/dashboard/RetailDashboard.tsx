import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { BarRow, Nothing, Panel, StatRow } from "./shared";

/**
 * Retail OS — a single shop.
 *
 * Distinct from the franchise retail dashboard, which reports a network. Here the
 * questions are today's till, what is about to run out, and what is actually
 * selling — all answerable about one room.
 */
export async function RetailDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  // Derived from the day boundary rather than `Date.now()` — the lint rule bans
  // the impure call during render, and a week that starts at midnight is the more
  // useful window anyway: "last 7 days" should not shift with the clock.
  const weekAgo = new Date(dayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [todaysSales, lowStock, topSellers, pendingPOs, newCustomers, returningCustomers] =
    await Promise.all([
      prisma.serviceInvoice.aggregate({
        where: { factoryId, status: "PAID", paidAt: { gte: dayStart } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      /*
       * Below reorder level.
       *
       * ponytail: filtered in the database on `minStockLevel`, then sorted here —
       * Prisma cannot order by "stock minus level", and a shop's catalogue is
       * small enough that sorting a handful of rows in memory is not worth a raw
       * query. Upgrade path is a computed column the day a tenant carries
       * thousands of SKUs.
       */
      prisma.itemMaster.findMany({
        where: { factoryId, minStockLevel: { gt: 0 } },
        select: { id: true, name: true, minStockLevel: true, binBalances: { select: { stockAvailable: true } } },
        take: 200,
      }),
      prisma.salesOrderItem.groupBy({
        by: ["itemId"],
        where: { salesOrder: { factoryId, orderDate: { gte: weekAgo } }, itemId: { not: null } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.purchaseOrder.count({ where: { factoryId, status: { in: ["DRAFT", "SENT"] } } }),
      prisma.customer.count({ where: { factoryId, createdAt: { gte: monthStart } } }),
      // A returning customer is one who existed before this month and has ordered
      // in it — the count that says whether the shop keeps people.
      prisma.customer.count({
        where: {
          factoryId,
          createdAt: { lt: monthStart },
          salesOrders: { some: { orderDate: { gte: monthStart } } },
        },
      }),
    ]);

  const short = lowStock
    .map((item) => ({
      id: item.id,
      name: item.name,
      onHand: item.binBalances.reduce((n, b) => n + b.stockAvailable, 0),
      level: item.minStockLevel,
    }))
    .filter((item) => item.onHand < item.level)
    // Worst first: the biggest hole relative to what the shelf should hold.
    .sort((a, b) => a.onHand / (a.level || 1) - b.onHand / (b.level || 1))
    .slice(0, 5);

  const sellerNames = new Map<string, string>();
  if (topSellers.length > 0) {
    const items = await prisma.itemMaster.findMany({
      where: { factoryId, id: { in: topSellers.map((s) => s.itemId!).filter(Boolean) } },
      select: { id: true, name: true },
    });
    for (const item of items) sellerNames.set(item.id, item.name);
  }
  const sellers = topSellers.map((row) => ({
    label: sellerNames.get(row.itemId ?? "") ?? "Unnamed item",
    value: row._sum.quantity ?? 0,
  }));
  const bestSeller = Math.max(1, ...sellers.map((s) => s.value));

  const sales = todaysSales._sum.total ?? 0;

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader title={`Welcome ${firstName}`} />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric
          href="/owner/billing"
          label="Today's Sales"
          value={`₹${Math.round(sales).toLocaleString("en-IN")}`}
          detail={`${todaysSales._count._all} paid`}
          tone="green"
        />
        <Metric
          href="/owner/inventory"
          label="Low Stock"
          value={String(short.length)}
          detail="Below reorder level"
          tone={short.length > 0 ? "red" : "green"}
        />
        <Metric href="/owner/purchase" label="Open POs" value={String(pendingPOs)} detail="Draft or sent" tone="amber" />
        <Metric
          href="/owner/customers"
          label="Customers"
          value={`${newCustomers}/${returningCustomers}`}
          detail="New vs returning"
          tone="blue"
        />
      </section>

      <section className="grid w-full flex-1 items-stretch gap-4 xl:grid-cols-3 xl:gap-6">
        <Panel eyebrow="Last 7 days" title="Selling fastest" className="xl:col-span-2">
          {sellers.length === 0 ? (
            <Nothing href="/owner/inventory" cta="Open inventory">
              Nothing sold in the last week. Once orders come through, the fastest movers rank
              here.
            </Nothing>
          ) : (
            <div className="space-y-3">
              {sellers.map((seller) => (
                <BarRow
                  key={seller.label}
                  label={seller.label}
                  value={seller.value}
                  max={bestSeller}
                  tone="good"
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Reorder" title="Running out">
          {short.length === 0 ? (
            <Nothing href="/owner/inventory" cta="Set reorder levels">
              Nothing below its reorder level. Items you set a level for appear here when the
              shelf runs down.
            </Nothing>
          ) : (
            <div className="space-y-2">
              {short.map((item) => (
                <StatRow
                  key={item.id}
                  label={item.name}
                  value={item.onHand}
                  detail={`of ${item.level} minimum`}
                  tone="bad"
                />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}
