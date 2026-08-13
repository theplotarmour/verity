import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { formatMenuPrice } from "@/lib/menu";
import {
  ACTIVE_ORDER_STATES,
  KITCHEN_QUEUE_STATES,
  istDayStart,
  orderTotal,
} from "@/lib/dining";
import { Nothing, Panel } from "./shared";
import { RestaurantFloor } from "./RestaurantFloor";

/**
 * Restaurant OS — a single location, live.
 *
 * The whole screen answers one question: where is the room right now. Counters
 * across the top, the floor as a grid, the day's money, and what just moved.
 *
 * The table grid scrolls inside its own panel rather than pushing the page — a
 * restaurant with forty tables must not put a scrollbar on the dashboard.
 */
export async function RestaurantDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const dayStart = istDayStart();

  const [tables, orderCounts, bills, recent] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { factoryId },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        capacity: true,
        state: true,
        orders: {
          where: { state: { in: ACTIVE_ORDER_STATES } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, state: true, items: { select: { quantity: true, unitPrice: true } } },
        },
      },
    }),
    // One grouped query for every live counter, rather than four counts.
    prisma.diningOrder.groupBy({
      by: ["state"],
      where: { factoryId, state: { in: ACTIVE_ORDER_STATES } },
      _count: { _all: true },
    }),
    prisma.diningBill.groupBy({
      by: ["paymentMethod"],
      where: { factoryId, paidAt: { gte: dayStart } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    /*
     * The activity feed.
     *
     * ponytail: orders by `updatedAt` with their current state — there is no
     * per-transition history table, and `advanceOrder` stamps `updatedAt` on every
     * step, so this is "the last ten things that moved" rather than "the last ten
     * transitions". Upgrade path is a DiningOrderEvent row written by advanceOrder,
     * worth it the day somebody asks how long a ticket sat at READY.
     */
    prisma.diningOrder.findMany({
      where: { factoryId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        state: true,
        updatedAt: true,
        table: { select: { number: true } },
      },
    }),
  ]);

  const countOf = (states: readonly string[]) =>
    orderCounts
      .filter((row) => states.includes(row.state))
      .reduce((n, row) => n + row._count._all, 0);

  const occupied = tables.filter((t) => t.state !== "AVAILABLE").length;
  const inKitchen = countOf(KITCHEN_QUEUE_STATES);
  const readyToServe = countOf(["READY"]);
  const awaitingPayment = countOf(["BILLED"]);

  const salesTotal = bills.reduce((n, row) => n + (row._sum.total ?? 0), 0);
  const billCount = bills.reduce((n, row) => n + row._count._all, 0);
  const byMethod = Object.fromEntries(
    bills.filter((row) => row.paymentMethod).map((row) => [row.paymentMethod!, row._sum.total ?? 0])
  ) as Record<string, number>;

  const floorTables = tables.map(({ orders, ...table }) => ({
    ...table,
    orderId: orders[0]?.id ?? null,
    orderState: orders[0]?.state ?? null,
    orderTotal: orders[0] ? orderTotal(orders[0].items) : null,
  }));

  const feed = recent.map((order) => ({
    id: order.id,
    state: order.state,
    table: order.table.number,
    at: order.updatedAt.toISOString(),
  }));

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader title={`Welcome ${firstName}`} />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric
          href="/owner/tables"
          label="Tables"
          value={`${occupied}/${tables.length}`}
          detail="Occupied"
          tone={occupied > 0 ? "amber" : "green"}
        />
        <Metric
          href="/owner/kitchen"
          label="In Kitchen"
          value={String(inKitchen)}
          detail="Being cooked"
          tone="blue"
        />
        <Metric
          href="/owner/serving"
          label="Ready"
          value={String(readyToServe)}
          detail="Waiting on the pass"
          tone={readyToServe > 0 ? "red" : "green"}
        />
        <Metric
          href="/owner/tables"
          label="To Pay"
          value={String(awaitingPayment)}
          detail="Billed, unsettled"
          tone="amber"
        />
      </section>

      <section className="grid w-full flex-1 items-stretch gap-4 xl:grid-cols-3 xl:gap-6">
        <Panel
          eyebrow="Floor"
          title="Tables"
          className="xl:col-span-2"
          action={
            <span className="shrink-0 font-mono text-[13px] text-text-tertiary">
              {tables.length} total
            </span>
          }
        >
          {floorTables.length === 0 ? (
            <Nothing href="/owner/tables" cta="Add tables">
              No tables yet. Lay out the room and orders can be taken against it.
            </Nothing>
          ) : (
            <RestaurantFloor tables={floorTables} />
          )}
        </Panel>

        <Panel eyebrow="Today" title="Takings">
          <div className="space-y-3">
            <div>
              <p className="font-display text-3xl font-bold tracking-[-0.04em] text-text-primary">
                {formatMenuPrice(salesTotal)}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {billCount} {billCount === 1 ? "bill" : "bills"}
                {billCount > 0
                  ? ` · ${formatMenuPrice(Math.round(salesTotal / billCount))} average`
                  : ""}
              </p>
            </div>

            <div className="grid grid-cols-3 items-stretch gap-2 border-t border-border/60 pt-3">
              {(["CASH", "UPI", "CARD"] as const).map((method) => (
                <div key={method} className="rounded-[12px] border border-border bg-surface-2 px-2 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
                    {method}
                  </p>
                  <p className="mt-1 font-mono text-[15px] font-semibold text-text-primary">
                    {formatMenuPrice(byMethod[method] ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <Panel eyebrow="Activity" title="Recent orders">
        {feed.length === 0 ? (
          <Nothing>Nothing has moved yet today.</Nothing>
        ) : (
          <FeedList feed={feed} />
        )}
      </Panel>
    </div>
  );
}

/** Static list — the refresh control lives on the floor grid, which is the live bit. */
function FeedList({ feed }: { feed: Array<{ id: string; state: string; table: string; at: string }> }) {
  return (
    <ol className="space-y-1.5">
      {feed.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface-2 px-3 py-2"
        >
          <span className="min-w-0 truncate text-[13px] text-text-primary">
            <span className="font-semibold">{row.table}</span>{" "}
            <span className="text-text-secondary">is {row.state.toLowerCase()}</span>
          </span>
          <time
            dateTime={row.at}
            className="shrink-0 font-mono text-[10px] text-text-tertiary"
            suppressHydrationWarning
          >
            {new Date(row.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </time>
        </li>
      ))}
    </ol>
  );
}
