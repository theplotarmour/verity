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
import { SALES_STATE, present } from "@/components/ui/business/states";
import { Related } from "@/components/ui/business/Related";
import { ActivityLog, type ActivityEntry } from "@/components/ui/business/ActivityLog";

type Customer = {
  id: string;
  displayName: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  stateCode: string | null;
  active: boolean;
  creditLimitPaise: number;
  exposurePaise: number;
  availableCreditPaise: number;
  outstandingPaise: number;
  openCommitmentPaise: number;
  openOrders: number;
  pricing: Array<{ productId: string; productName: string; customPricePaise: number }>;
  orders: Array<{
    id: string;
    reference: string | null;
    state: string;
    totalPricePaise: number;
    orderedUnits: number;
    reservedUnits: number;
    issuedUnits: number;
    createdAt: Date | string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    issuedAt: Date | string;
    totalPaise: number;
    paidPaise: number;
    balancePaise: number;
    salesOrderId: string | null;
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
  activity: ActivityEntry[];
};

const TABS = ["Overview", "Pricing", "Sales orders", "Invoices", "Payments", "Ledger", "Activity"] as const;
type Tab = (typeof TABS)[number];

/** Orders the business has committed to and not yet closed out. */
const OPEN_SALES_STATES = ["pending_credit", "approved", "dispatching"];

export function CustomerWorkspace({ customer }: { customer: Customer }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const overLimit = customer.exposurePaise > customer.creditLimitPaise;

  return (
    <>
      <PageHeader
        title={customer.displayName}
        description={
          customer.active
            ? "Everything this business has sold to this customer — what is on order, what has been billed, and how much more they may be sold."
            : "This customer is inactive. Their history is kept; new orders cannot be raised for them."
        }
      />

      <div className="flex flex-col gap-5">
        <StatRow cols={4}>
          <Stat label="Credit limit" value={rupeesShort(customer.creditLimitPaise)} />
          <Stat
            label="Exposure"
            value={rupeesShort(customer.exposurePaise)}
            hint="Owed plus committed"
          />
          <Stat
            label={overLimit ? "Over limit" : "Available"}
            value={
              overLimit
                ? `−${rupeesShort(customer.exposurePaise - customer.creditLimitPaise)}`
                : rupeesShort(customer.availableCreditPaise)
            }
            hint={overLimit ? "New orders will be held" : "May still be sold"}
          />
          <Stat label="Open orders" value={customer.openOrders} href="/sales" />
        </StatRow>

        <nav aria-label="Customer sections" className="flex flex-wrap gap-1 border-b border-line">
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
            <Panel title="Credit">
              <DefinitionList
                items={[
                  { term: "Credit limit", value: rupees(customer.creditLimitPaise) },
                  { term: "Exposure", value: rupees(customer.exposurePaise) },
                  {
                    term: overLimit ? "Over limit by" : "Available credit",
                    value: (
                      <span className={overLimit ? "text-danger" : undefined}>
                        {overLimit
                          ? rupees(customer.exposurePaise - customer.creditLimitPaise)
                          : rupees(customer.availableCreditPaise)}
                      </span>
                    ),
                  },
                  { term: "Outstanding on invoices", value: rupees(customer.outstandingPaise) },
                  { term: "Committed, not yet billed", value: rupees(customer.openCommitmentPaise) },
                ]}
              />
            </Panel>
            <Panel title="Identity">
              <DefinitionList
                items={[
                  { term: "GSTIN", value: customer.gstin ?? "Not recorded" },
                  { term: "State code", value: customer.stateCode ?? "Not recorded" },
                  { term: "Phone", value: customer.phone ?? "—" },
                  { term: "Email", value: customer.email ?? "—" },
                  {
                    term: "Status",
                    value: customer.active ? <Badge tone="accent">Active</Badge> : <Badge>Inactive</Badge>,
                  },
                ]}
              />
            </Panel>
            <div className="lg:col-span-2">
              <Related
                links={[
                  { href: "/sales", label: "Sales orders", note: `${customer.openOrders} open` },
                  { href: "/finance", label: "Invoices", note: `${customer.invoices.length} raised` },
                  { href: "/ledgers", label: "Ledgers", note: rupees(customer.outstandingPaise) },
                  { href: "/reports", label: "Reports", note: "Revenue and margin" },
                ]}
              />
            </div>
          </div>
        )}

        {tab === "Pricing" && (
          <Panel
            flush
            title="Customer price"
            action={
              <span className="text-[12px] text-text-tertiary">
                Prefills new orders; existing orders keep their own price
              </span>
            }
          >
            {customer.pricing.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState
                  compact
                  title="No customer prices"
                  description="Without one, an order prefills the product's standard sell price."
                />
              </div>
            ) : (
              <RowList>
                {customer.pricing.map((price) => (
                  <Row key={price.productId}>
                    <Link
                      href={`/catalogue/${price.productId}`}
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      {price.productName}
                    </Link>
                    <span className="tabular text-[14px] text-text">
                      {rupees(price.customPricePaise)}{" "}
                      <span className="text-text-tertiary">/ sheet</span>
                    </span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        )}

        {tab === "Sales orders" && (
          <Panel flush title="Sales orders">
            {customer.orders.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="No orders for this customer" />
              </div>
            ) : (
              <RowList>
                {customer.orders.map((order) => {
                  const state = present(SALES_STATE, order.state);
                  return (
                    <Row key={order.id}>
                      <div className="min-w-0">
                        <Link
                          href={`/sales/${order.id}`}
                          className="text-[14px] text-text no-underline hover:underline"
                        >
                          {order.reference ?? `Order ${order.id.slice(0, 8)}`}
                        </Link>
                        <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                          {day(order.createdAt)} · {sheets(order.orderedUnits)} ordered ·{" "}
                          {order.reservedUnits} reserved · {order.issuedUnits} issued
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-6">
                        <StateBadge category={state.category} label={state.label} />
                        <span className="tabular text-[14px] text-text">
                          {rupees(order.totalPricePaise)}
                        </span>
                      </div>
                    </Row>
                  );
                })}
              </RowList>
            )}
          </Panel>
        )}

        {tab === "Invoices" && (
          <Panel flush title="Tax invoices">
            {customer.invoices.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="No invoices raised" />
              </div>
            ) : (
              <RowList>
                {customer.invoices.map((invoice) => (
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
                        {invoice.salesOrderId ? " · from a sales order" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-8 text-right">
                      <div>
                        <p className="tabular m-0 text-[14px] text-text">{rupees(invoice.totalPaise)}</p>
                        <p className="m-0 text-[12px] text-text-tertiary">Invoiced</p>
                      </div>
                      <div>
                        <p className="tabular m-0 text-[14px] text-text">{rupees(invoice.balancePaise)}</p>
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
          <Panel flush title="Payments received">
            {customer.payments.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="No payments recorded" />
              </div>
            ) : (
              <RowList>
                {customer.payments.map((payment) => (
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
                  Balance {rupees(customer.outstandingPaise)}
                </span>
              }
            >
              {customer.ledger.length === 0 ? (
                <div className="px-5 py-6">
                  <EmptyState compact title="No ledger entries" />
                </div>
              ) : (
                <RowList>
                  {customer.ledger.map((entry) => (
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

            {/* §56 — open sales sit below the financial ledger, never inside
                it. A sales order is a promise to supply, not money owed. */}
            <Panel flush title="Open sales">
              {customer.orders.filter((order) => OPEN_SALES_STATES.includes(order.state)).length ===
              0 ? (
                <div className="px-5 py-6">
                  <EmptyState compact title="Nothing on order" />
                </div>
              ) : (
                <RowList>
                  {customer.orders
                    .filter((order) => OPEN_SALES_STATES.includes(order.state))
                    .map((order) => (
                      <Row key={order.id}>
                        <div className="min-w-0">
                          <Link
                            href={`/sales/${order.id}`}
                            className="text-[14px] text-text no-underline hover:underline"
                          >
                            {order.reference ?? `Order ${order.id.slice(0, 8)}`}
                          </Link>
                          <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                            {present(SALES_STATE, order.state).label}
                          </p>
                        </div>
                        <span className="tabular shrink-0 text-[14px] text-text">
                          {rupees(order.totalPricePaise)}
                        </span>
                      </Row>
                    ))}
                </RowList>
              )}
            </Panel>
          </div>
        )}

        {tab === "Activity" && <ActivityLog entries={customer.activity} />}
      </div>
    </>
  );
}
