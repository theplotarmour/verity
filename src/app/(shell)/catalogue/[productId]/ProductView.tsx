import Link from "next/link";
import {
  Badge,
  DefinitionList,
  EmptyState,
  PageHeader,
  Panel,
  Row,
  RowList,
  Stat,
  StatRow,
  StateBadge,
} from "@/components/ui/primitives";
import { day, rupees, rupeesShort, sheets } from "@/components/ui/business/format";
import { PURCHASE_STATE, SALES_STATE, present } from "@/components/ui/business/states";
import { MOVEMENT_KIND, movementHref } from "@/components/ui/business/movements";
import { Related } from "@/components/ui/business/Related";
import {
  CATEGORY_RULES,
  formatProductSize,
  type ProductCategory,
} from "@/server/capabilities/plywood/product";

type Product = Awaited<
  ReturnType<typeof import("@/server/capabilities/plywood").productDetail.handler>
>;

/** Millimetre tenths are how thickness is stored; 18mm is how it is spoken. */
function millimetres(tenths: number | null): string | null {
  return tenths === null ? null : `${(tenths / 10).toLocaleString("en-IN")}mm`;
}

export function ProductView({ product }: { product: NonNullable<Product> }) {
  // The size carries its own unit, because this business trades in three of
  // them: feet for boards, plywood and laminates, inches for louvres, and
  // millimetres for anything entered before the families were modelled.
  const size =
    product.widthTenth && product.heightTenth
      ? formatProductSize(product)
      : null;
  const family = CATEGORY_RULES[product.category as ProductCategory]?.label;

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.brandName}${family ? ` · ${family}` : ""} · ${product.grade}${size ? ` · ${size}` : ""}${
          millimetres(product.thicknessTenthMm) ? ` · ${millimetres(product.thicknessTenthMm)}` : ""
        }`}
      />

      <div className="flex flex-col gap-5">
        <StatRow cols={4}>
          <Stat label="On hand" value={product.onHandUnits.toLocaleString("en-IN")} />
          <Stat label="Reserved" value={product.reservedUnits.toLocaleString("en-IN")} />
          <Stat
            label="Available"
            value={product.availableUnits.toLocaleString("en-IN")}
            hint="On hand less reserved"
          />
          <Stat
            label="Incoming"
            value={product.incomingUnits.toLocaleString("en-IN")}
            hint="On open purchase orders"
          />
        </StatRow>

        {product.lowStock && (
          // §17 and §72 — a notification that says what to do, not that
          // something is wrong. The action is one click from the alert.
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-warning/25 bg-warning-subtle px-5 py-4">
            <p className="m-0 text-[14px] text-text">
              {product.name} is at or below its reorder level —{" "}
              {sheets(product.availableUnits)} available, threshold{" "}
              {product.reorderLevelUnits}.
            </p>
            <Link
              href="/purchases"
              className="shrink-0 text-[13px] text-accent-ink no-underline hover:underline"
            >
              Create a purchase order →
            </Link>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Identity">
            <DefinitionList
              items={[
                {
                  term: "Brand",
                  value: (
                    <Link href="/catalogue" className="text-text no-underline hover:underline">
                      {product.brandName}
                    </Link>
                  ),
                },
                { term: "HSN code", value: product.hsnCode },
                { term: "Grade", value: product.grade },
                { term: "Size", value: size ?? "—" },
                { term: "Thickness", value: millimetres(product.thicknessTenthMm) ?? "—" },
                {
                  term: "Reorder level",
                  value:
                    product.reorderLevelUnits > 0
                      ? sheets(product.reorderLevelUnits)
                      : "Not set — no low-stock alerts",
                },
                {
                  term: "Status",
                  value: product.active ? <Badge tone="accent">Active</Badge> : <Badge>Inactive</Badge>,
                },
              ]}
            />
          </Panel>

          <Panel title="Valuation">
            <DefinitionList
              items={[
                { term: "Average cost", value: `${rupees(product.avgUnitCostPaise)} / sheet` },
                { term: "Stock value", value: rupees(product.valuePaise) },
                {
                  term: "Last sold at",
                  value:
                    product.lastSoldPricePaise === null
                      ? "Never sold"
                      : `${rupees(product.lastSoldPricePaise)} / sheet`,
                },
              ]}
            />
            {/* Naming the method matters. An owner reading a valuation is
                entitled to know which of three possible numbers it is. */}
            <p className="m-0 mt-3 text-[12px] text-text-tertiary">
              Valued at weighted average cost, recalculated on every receipt — not at what it
              might sell for.
            </p>
          </Panel>
        </div>

        <Panel flush title="Stock by godown">
          {product.byGodown.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="No stock in any godown" />
            </div>
          ) : (
            <RowList>
              {product.byGodown.map((row) => (
                <Row key={row.locationId}>
                  <div className="min-w-0">
                    <Link
                      href={`/godowns/${row.locationId}`}
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      {row.locationName}
                    </Link>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      {row.reservedUnits} reserved · {rupees(row.avgUnitCostPaise)} average cost
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <div>
                      <p className="tabular m-0 text-[14px] text-text">{row.availableUnits}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Available</p>
                    </div>
                    <div className="w-24">
                      <Link
                        href={`/stock/${product.id}?godown=${row.locationId}`}
                        className="tabular text-[14px] text-text no-underline hover:underline"
                      >
                        {row.onHandUnits}
                      </Link>
                      <p className="m-0 text-[12px] text-text-tertiary">On hand</p>
                    </div>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel flush title="Supplier pricing">
            {product.supplierPricing.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="No negotiated costs" />
              </div>
            ) : (
              <RowList>
                {product.supplierPricing.map((price) => (
                  <Row key={price.supplierId}>
                    <Link
                      href={`/suppliers/${price.supplierId}`}
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      {price.supplierName}
                    </Link>
                    <span className="tabular text-[14px] text-text">{rupees(price.costPaise)}</span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>

          <Panel flush title="Customer pricing">
            {product.customerPricing.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState
                  compact
                  title="No agreed prices"
                  description="Without one, a sales order needs an explicit price."
                />
              </div>
            ) : (
              <RowList>
                {product.customerPricing.map((price) => (
                  <Row key={price.customerId}>
                    <Link
                      href={`/customers/${price.customerId}`}
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      {price.customerName}
                    </Link>
                    <span className="tabular text-[14px] text-text">{rupees(price.pricePaise)}</span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel flush title="Open purchases">
            {product.openPurchases.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="Nothing on order" />
              </div>
            ) : (
              <RowList>
                {product.openPurchases.map((order) => (
                  <Row key={order.orderId}>
                    <div className="min-w-0">
                      <Link
                        href={`/purchases/${order.orderId}`}
                        className="text-[14px] text-text no-underline hover:underline"
                      >
                        {order.reference ?? `Order ${order.orderId.slice(0, 8)}`}
                      </Link>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {order.supplierName} ·{" "}
                        {present(PURCHASE_STATE, order.state).label}
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

          <Panel flush title="Open sales">
            {product.openSales.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="Nothing promised out" />
              </div>
            ) : (
              <RowList>
                {product.openSales.map((order) => (
                  <Row key={order.orderId}>
                    <div className="min-w-0">
                      <Link
                        href={`/sales/${order.orderId}`}
                        className="text-[14px] text-text no-underline hover:underline"
                      >
                        {order.reference ?? `Order ${order.orderId.slice(0, 8)}`}
                      </Link>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {order.customerName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-6">
                      <StateBadge
                        category={present(SALES_STATE, order.state).category}
                        label={present(SALES_STATE, order.state).label}
                      />
                      <span className="tabular text-[14px] text-text">{order.qtyOrdered}</span>
                    </div>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        </div>

        <Panel
          flush
          title="Recent movements"
          action={
            <Link
              href={`/stock/${product.id}`}
              className="text-[13px] text-accent-ink no-underline hover:underline"
            >
              Full movement ledger →
            </Link>
          }
        >
          {product.movements.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="No movements recorded" />
            </div>
          ) : (
            <RowList>
              {product.movements.slice(0, 12).map((movement) => {
                const href = movementHref(movement.sourceOrderType, movement.sourceOrderId);
                const label = MOVEMENT_KIND[movement.kind] ?? movement.kind;
                return (
                  <Row key={movement.id}>
                    <div className="min-w-0">
                      {href ? (
                        <Link href={href} className="text-[14px] text-text no-underline hover:underline">
                          {label}
                          {movement.sourceNumber ? ` · ${movement.sourceNumber}` : ""}
                        </Link>
                      ) : (
                        <span className="text-[14px] text-text">{label}</span>
                      )}
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {day(movement.occurredAt)} · {movement.locationName}
                        {movement.rackLabel ? ` · rack ${movement.rackLabel}` : ""}
                        {movement.reason ? ` · ${movement.reason}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        "tabular shrink-0 text-[14px] " +
                        (movement.qtyDeltaUnits >= 0 ? "text-text" : "text-text-secondary")
                      }
                    >
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
            { href: "/stock", label: "Stock", note: `${product.onHandUnits} on hand` },
            { href: "/purchases", label: "Purchases", note: `${product.openPurchases.length} open` },
            { href: "/sales", label: "Sales", note: `${product.openSales.length} open` },
            { href: `/stock/${product.id}`, label: "Movement ledger", note: "Every change" },
          ]}
        />
      </div>
    </>
  );
}
