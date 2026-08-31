import Link from "next/link";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Row,
  RowList,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { day, rupees, rupeesShort } from "@/components/ui/business/format";
import { PURCHASE_STATE, present } from "@/components/ui/business/states";
import { MOVEMENT_KIND, movementHref } from "@/components/ui/business/movements";
import { Related } from "@/components/ui/business/Related";

type Godown = NonNullable<
  Awaited<ReturnType<typeof import("@/server/capabilities/plywood").godownDetail.handler>>
>;

export function GodownView({ godown }: { godown: Godown }) {
  const lowStockCount = godown.stock.filter((row) => row.lowStock).length;

  return (
    <>
      <PageHeader
        title={godown.name}
        description="What is physically in this godown, what is promised out of it, and what is on its way. Every quantity here is the sum of recorded movements — nothing on this page is typed in directly."
      />

      <div className="flex flex-col gap-5">
        <StatRow cols={4}>
          <Stat label="Stock value" value={rupeesShort(godown.valuePaise)} hint="At average cost" />
          <Stat label="On hand" value={godown.onHandUnits.toLocaleString("en-IN")} />
          <Stat
            label="Available"
            value={godown.availableUnits.toLocaleString("en-IN")}
            hint={`${godown.reservedUnits.toLocaleString("en-IN")} reserved`}
          />
          <Stat
            label="Incoming"
            value={godown.incomingUnits.toLocaleString("en-IN")}
            hint="On open purchase orders"
          />
        </StatRow>

        <Panel
          flush
          title="Stock by product"
          action={
            lowStockCount > 0 ? (
              <span className="text-[12px] text-text-tertiary">
                {lowStockCount} at or below reorder level
              </span>
            ) : undefined
          }
        >
          {godown.stock.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="This godown is empty" />
            </div>
          ) : (
            <RowList>
              {godown.stock.map((row) => (
                <Row key={row.productId}>
                  <div className="min-w-0">
                    <Link
                      href={`/catalogue/${row.productId}`}
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      {row.productName}
                    </Link>
                    <p className="m-0 mt-0.5 flex items-center gap-2 text-[12px] text-text-tertiary">
                      <span>
                        {row.brandName} · {rupees(row.avgUnitCostPaise)} average cost
                      </span>
                      {row.lowStock && <Badge>Low stock</Badge>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <div>
                      <p className="tabular m-0 text-[14px] text-text">{row.availableUnits}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Available</p>
                    </div>
                    <div className="w-24">
                      <Link
                        href={`/stock/${row.productId}?godown=${godown.id}`}
                        className="tabular text-[14px] text-text no-underline hover:underline"
                      >
                        {row.onHandUnits}
                      </Link>
                      <p className="m-0 text-[12px] text-text-tertiary">On hand</p>
                    </div>
                    <div className="hidden w-28 sm:block">
                      <p className="tabular m-0 text-[14px] text-text">{rupees(row.valuePaise)}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Value</p>
                    </div>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel flush title="Racks">
            {godown.racks.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState
                  compact
                  title="No racks defined"
                  description="Stock can be held without racks; racks make a physical count faster."
                />
              </div>
            ) : (
              <RowList>
                {godown.racks.map((rack) => (
                  <Row key={rack.id}>
                    <span className="text-[14px] text-text">{rack.rackLabel}</span>
                    {rack.active ? <Badge tone="accent">In use</Badge> : <Badge>Retired</Badge>}
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>

          <Panel flush title="Expected deliveries">
            {godown.incoming.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="Nothing on its way" />
              </div>
            ) : (
              <RowList>
                {godown.incoming.map((order) => (
                  <Row key={order.orderId}>
                    <div className="min-w-0">
                      <Link
                        href={`/purchases/${order.orderId}`}
                        className="text-[14px] text-text no-underline hover:underline"
                      >
                        {order.reference ?? `Order ${order.orderId.slice(0, 8)}`}
                      </Link>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        <Link
                          href={`/suppliers/${order.supplierId}`}
                          className="text-text-tertiary no-underline hover:underline"
                        >
                          {order.supplierName}
                        </Link>{" "}
                        · {present(PURCHASE_STATE, order.state).label}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-[14px] text-text">
                      {order.qtyIncoming} incoming
                    </span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        </div>

        <Panel flush title="Recent movements">
          {godown.movements.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="Nothing has moved through this godown" />
            </div>
          ) : (
            <RowList>
              {godown.movements.slice(0, 15).map((movement) => {
                const href = movementHref(movement.sourceOrderType, movement.sourceOrderId);
                return (
                  <Row key={movement.id}>
                    <div className="min-w-0">
                      <Link
                        href={`/catalogue/${movement.productId}`}
                        className="text-[14px] text-text no-underline hover:underline"
                      >
                        {movement.productName}
                      </Link>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {day(movement.occurredAt)} ·{" "}
                        {href ? (
                          <Link href={href} className="text-text-tertiary no-underline hover:underline">
                            {MOVEMENT_KIND[movement.kind] ?? movement.kind}
                            {movement.sourceNumber ? ` ${movement.sourceNumber}` : ""}
                          </Link>
                        ) : (
                          (MOVEMENT_KIND[movement.kind] ?? movement.kind)
                        )}
                        {movement.rackLabel ? ` · rack ${movement.rackLabel}` : ""}
                        {movement.reason ? ` · ${movement.reason}` : ""}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-[14px] text-text">
                      {movement.qtyDeltaUnits > 0 ? "+" : ""}
                      {movement.qtyDeltaUnits}
                    </span>
                  </Row>
                );
              })}
            </RowList>
          )}
        </Panel>

        <Related
          links={[
            { href: "/godowns", label: "All godowns" },
            { href: "/stock", label: "Stock across godowns" },
            { href: "/purchases", label: "Purchases", note: `${godown.incoming.length} inbound` },
          ]}
        />
      </div>
    </>
  );
}
