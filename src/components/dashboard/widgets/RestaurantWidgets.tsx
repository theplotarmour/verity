import prisma from "@/lib/prisma";
import { Metric } from "@/components/design/Metric";
import { formatMenuPrice } from "@/lib/menu";
import {
  ACTIVE_ORDER_STATES,
  KITCHEN_QUEUE_STATES,
  istDayStart,
  orderTotal,
} from "@/lib/dining";
import { Nothing, Panel } from "../shared";
import { RestaurantFloor } from "../RestaurantFloor";

export interface WidgetProps {
  factoryId: string;
}

export async function RestaurantMetricsWidget({ factoryId }: WidgetProps) {
  const [tables, orderCounts] = await Promise.all([
    prisma.restaurantTable.count({ where: { factoryId } }),
    prisma.diningOrder.groupBy({
      by: ["state"],
      where: { factoryId, state: { in: ACTIVE_ORDER_STATES } },
      _count: { _all: true },
    }),
  ]);

  const occupied = await prisma.restaurantTable.count({
    where: { factoryId, state: { not: "AVAILABLE" } },
  });

  const countOf = (states: readonly string[]) =>
    orderCounts
      .filter((row) => states.includes(row.state))
      .reduce((n, row) => n + row._count._all, 0);

  const inKitchen = countOf(KITCHEN_QUEUE_STATES);
  const readyToServe = countOf(["READY"]);
  const awaitingPayment = countOf(["BILLED"]);

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4 w-full">
      <Metric
        href="/owner/tables"
        label="Tables"
        value={`${occupied}/${tables}`}
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
    </div>
  );
}

export async function RestaurantFloorWidget({ factoryId }: WidgetProps) {
  const tables = await prisma.restaurantTable.findMany({
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
  });

  const floorTables = tables.map(({ orders, ...table }) => ({
    ...table,
    orderId: orders[0]?.id ?? null,
    orderState: orders[0]?.state ?? null,
    orderTotal: orders[0] ? orderTotal(orders[0].items) : null,
  }));

  return (
    <Panel
      eyebrow="Floor"
      title="Tables"
      className="w-full h-full"
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
  );
}

export async function RestaurantTakingsWidget({ factoryId }: WidgetProps) {
  const dayStart = istDayStart();
  const bills = await prisma.diningBill.groupBy({
    by: ["paymentMethod"],
    where: { factoryId, paidAt: { gte: dayStart } },
    _sum: { total: true },
    _count: { _all: true },
  });

  const salesTotal = bills.reduce((n, row) => n + (row._sum.total ?? 0), 0);
  const billCount = bills.reduce((n, row) => n + row._count._all, 0);
  const byMethod = Object.fromEntries(
    bills.filter((row) => row.paymentMethod).map((row) => [row.paymentMethod!, row._sum.total ?? 0])
  ) as Record<string, number>;

  return (
    <Panel eyebrow="Today" title="Takings" className="w-full">
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
  );
}

export async function RestaurantRecentOrdersWidget({ factoryId }: WidgetProps) {
  const recent = await prisma.diningOrder.findMany({
    where: { factoryId },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      state: true,
      updatedAt: true,
      table: { select: { number: true } },
    },
  });

  const feed = recent.map((order) => ({
    id: order.id,
    state: order.state,
    table: order.table.number,
    at: order.updatedAt.toISOString(),
  }));

  return (
    <Panel eyebrow="Activity" title="Recent orders" className="w-full">
      {feed.length === 0 ? (
        <Nothing>Nothing has moved yet today.</Nothing>
      ) : (
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
      )}
    </Panel>
  );
}
