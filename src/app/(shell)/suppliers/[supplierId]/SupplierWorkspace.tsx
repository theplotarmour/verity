"use client";

import { useState } from "react";
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
import { PURCHASE_STATE, present } from "@/components/ui/business/states";
import { Related } from "@/components/ui/business/Related";

type Supplier = {
  id: string;
  displayName: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  stateCode: string | null;
  active: boolean;
  outstandingPaise: number;
  openCommitmentPaise: number;
  openOrders: number;
  incomingUnits: number;
  pricing: Array<{ productId: string; productName: string; negotiatedCostPaise: number }>;
  orders: Array<{
    id: string;
    reference: string | null;
    state: string;
    totalCostPaise: number;
    orderedUnits: number;
    receivedUnits: number;
    createdAt: Date | string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    issuedAt: Date | string;
    totalPaise: number;
    paidPaise: number;
    balancePaise: number;
    purchaseOrderId: string | null;
  }>;
  payments: Array<{
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    method: string;
    amountPaise: number;
    reference: string | null;
    receivedAt: Date | string;
  }>;
  ledger: Array<{
    id: string;
    entryType: string;
    amountPaise: number;
    narration: string | null;
    occurredAt: Date | string;
    invoiceId: string | null;
    runningBalancePaise: number;
  }>;
};

const TABS = ["Overview", "Pricing", "Purchase orders", "Invoices", "Payments", "Ledger"] as const;
type Tab = (typeof TABS)[number];

export function SupplierWorkspace({ supplier }: { supplier: Supplier }) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <>
      <PageHeader
        title={supplier.displayName}
        description={
          supplier.active
            ? "Everything this business has bought from this supplier — what is on order, what has been billed, and what is still owed."
            : "This supplier is inactive. Their history is kept; new orders cannot be placed against them."
        }
      />

      <div className="flex flex-col gap-5">
        <StatRow cols={4}>
          <Stat
            label="Outstanding"
            value={rupeesShort(supplier.outstandingPaise)}
            hint="Billed and unpaid"
          />
          <Stat
            label="Committed"
            value={rupeesShort(supplier.openCommitmentPaise)}
            hint="Ordered, not yet billed"
          />
          <Stat label="Open orders" value={supplier.openOrders} />
          <Stat
            label="Incoming"
            value={supplier.incomingUnits.toLocaleString("en-IN")}
            hint="Sheets on the way"
          />
        </StatRow>

        {/* Tabs, not six stacked panels: a supplier has six views and a reader
            wants one of them at a time. State is local because switching tab
            changes nothing on the server and a URL per tab would make the back
            button undo a glance. */}
        <nav
          aria-label="Supplier sections"
          className="flex flex-wrap gap-1 border-b border-line"
        >
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              aria-current={tab === name ? "page" : undefined}
              className={
                "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors " +
                (tab === name
                  ? "border-accent text-text"
                  : "border-transparent text-text-tertiary hover:text-text")
              }
            >
              {name}
            </button>
          ))}
        </nav>

        {tab === "Overview" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Identity">
              <DefinitionList
                items={[
                  { term: "GSTIN", value: supplier.gstin ?? "Not recorded" },
                  { term: "State code", value: supplier.stateCode ?? "Not recorded" },
                  { term: "Phone", value: supplier.phone ?? "—" },
                  { term: "Email", value: supplier.email ?? "—" },
                  {
                    term: "Status",
                    value: supplier.active ? <Badge tone="accent">Active</Badge> : <Badge>Inactive</Badge>,
                  },
                ]}
              />
            </Panel>
            <Related
              title="Related"
              links={[
                { href: "/purchases", label: "Purchase orders", note: `${supplier.openOrders} open` },
                { href: "/finance", label: "Invoices", note: `${supplier.invoices.length} raised` },
                { href: "/ledgers", label: "Ledgers", note: rupees(supplier.outstandingPaise) },
                { href: "/stock", label: "Stock", note: `${supplier.incomingUnits} incoming` },
              ]}
            />
          </div>
        )}

        {tab === "Pricing" && (
          <Panel
            flush
            title="Negotiated cost"
            action={<span className="text-[12px] text-text-tertiary">Prefills new purchase orders</span>}
          >
            {supplier.pricing.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState
                  compact
                  title="No negotiated prices"
                  description="Set a price on a purchase order and it is remembered here for the next one."
                />
              </div>
            ) : (
              <RowList>
                {supplier.pricing.map((price) => (
                  <Row key={price.productId}>
                    <Link
                      href={`/catalogue/${price.productId}`}
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      {price.productName}
                    </Link>
                    <span className="tabular text-[14px] text-text">
                      {rupees(price.negotiatedCostPaise)} <span className="text-text-tertiary">/ sheet</span>
                    </span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        )}

        {tab === "Purchase orders" && (
          <Panel flush title="Purchase orders">
            {supplier.orders.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="No orders placed with this supplier" />
              </div>
            ) : (
              <RowList>
                {supplier.orders.map((order) => (
                  <Row key={order.id}>
                    <div className="min-w-0">
                      <Link
                        href={`/purchases/${order.id}`}
                        className="text-[14px] text-text no-underline hover:underline"
                      >
                        {order.reference ?? `Order ${order.id.slice(0, 8)}`}
                      </Link>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {day(order.createdAt)} · {sheets(order.orderedUnits)} ordered,{" "}
                        {order.receivedUnits.toLocaleString("en-IN")} received
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-6">
                      <StateBadge
                        category={present(PURCHASE_STATE, order.state).category}
                        label={present(PURCHASE_STATE, order.state).label}
                      />
                      <span className="tabular text-[14px] text-text">
                        {rupees(order.totalCostPaise)}
                      </span>
                    </div>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        )}

        {tab === "Invoices" && (
          <Panel flush title="Supplier invoices">
            {supplier.invoices.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState
                  compact
                  title="No invoices recorded"
                  description="A supplier invoice is recorded from its purchase order, so the lines are already known."
                />
              </div>
            ) : (
              <RowList>
                {supplier.invoices.map((invoice) => (
                  <Row key={invoice.id}>
                    <div className="min-w-0">
                      <Link
                        href={`/finance/${invoice.id}`}
                        className="text-[14px] text-text no-underline hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {day(invoice.issuedAt)}
                        {invoice.purchaseOrderId ? " · from a purchase order" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-8 text-right">
                      <div>
                        <p className="tabular m-0 text-[14px] text-text">{rupees(invoice.totalPaise)}</p>
                        <p className="m-0 text-[12px] text-text-tertiary">Invoiced</p>
                      </div>
                      <div>
                        <p className="tabular m-0 text-[14px] text-text">
                          {rupees(invoice.balancePaise)}
                        </p>
                        <p className="m-0 text-[12px] text-text-tertiary">Balance</p>
                      </div>
                    </div>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        )}

        {tab === "Payments" && (
          <Panel flush title="Payments made">
            {supplier.payments.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="No payments recorded" />
              </div>
            ) : (
              <RowList>
                {supplier.payments.map((payment) => (
                  <Row key={payment.id}>
                    <div className="min-w-0">
                      <Link
                        href={`/finance/${payment.invoiceId}`}
                        className="text-[14px] text-text no-underline hover:underline"
                      >
                        {payment.invoiceNumber}
                      </Link>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {day(payment.receivedAt)} · {payment.method}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-[14px] text-text">
                      {rupees(payment.amountPaise)}
                    </span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        )}

        {tab === "Ledger" && (
          <div className="flex flex-col gap-5">
            <Panel
              flush
              title="Financial ledger"
              action={
                <span className="tabular text-[13px] text-text">
                  Balance {rupees(supplier.outstandingPaise)}
                </span>
              }
            >
              {supplier.ledger.length === 0 ? (
                <div className="px-5 py-6">
                  <EmptyState compact title="No ledger entries" />
                </div>
              ) : (
                <RowList>
                  {supplier.ledger.map((entry) => (
                    <Row key={entry.id}>
                      <div className="min-w-0">
                        {entry.invoiceId ? (
                          <Link
                            href={`/finance/${entry.invoiceId}`}
                            className="text-[14px] text-text no-underline hover:underline"
                          >
                            {entry.narration ?? entry.entryType}
                          </Link>
                        ) : (
                          <span className="text-[14px] text-text">
                            {entry.narration ?? entry.entryType}
                          </span>
                        )}
                        <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                          {day(entry.occurredAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-8 text-right">
                        <span className="tabular text-[14px] text-text">
                          {entry.entryType === "debit" ? "+" : "−"}
                          {rupees(entry.amountPaise)}
                        </span>
                        <span className="tabular w-28 text-[13px] text-text-tertiary">
                          {rupees(entry.runningBalancePaise)}
                        </span>
                      </div>
                    </Row>
                  ))}
                </RowList>
              )}
            </Panel>

            {/* §54 and §55 — commitments sit BELOW the financial ledger and
                outside it. An open purchase order is not a payable, and a
                section that mixed them would tell the accountant the business
                owes money it has not been billed for. */}
            <Panel flush title="Open purchases" >
              {supplier.orders.filter((order) => ["submitted", "receiving"].includes(order.state))
                .length === 0 ? (
                <div className="px-5 py-6">
                  <EmptyState compact title="Nothing on order" />
                </div>
              ) : (
                <RowList>
                  {supplier.orders
                    .filter((order) => ["submitted", "receiving"].includes(order.state))
                    .map((order) => (
                      <Row key={order.id}>
                        <div className="min-w-0">
                          <Link
                            href={`/purchases/${order.id}`}
                            className="text-[14px] text-text no-underline hover:underline"
                          >
                            {order.reference ?? `Order ${order.id.slice(0, 8)}`}
                          </Link>
                          <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                            {present(PURCHASE_STATE, order.state).label}
                          </p>
                        </div>
                        <span className="tabular shrink-0 text-[14px] text-text">
                          {rupees(order.totalCostPaise)}
                        </span>
                      </Row>
                    ))}
                </RowList>
              )}
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
