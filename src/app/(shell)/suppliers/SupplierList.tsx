"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, Input, Panel, Row, RowList, Stat, StatRow } from "@/components/ui/primitives";
import { rupees, rupeesShort } from "@/components/ui/business/format";

type Supplier = {
  id: string;
  displayName: string;
  gstin: string | null;
  phone: string | null;
  stateCode: string | null;
  active: boolean;
  openOrders: number;
  outstandingPaise: number;
  openCommitmentPaise: number;
};

export function SupplierList({ suppliers }: { suppliers: Supplier[] }) {
  const [filter, setFilter] = useState("");

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return suppliers;
    // Name or GSTIN: a buyer looking one up has one or the other in front of
    // them, and which one depends on whether they are holding a bill.
    return suppliers.filter(
      (supplier) =>
        supplier.displayName.toLowerCase().includes(needle) ||
        (supplier.gstin ?? "").toLowerCase().includes(needle),
    );
  }, [suppliers, filter]);

  const totals = useMemo(
    () => ({
      outstanding: suppliers.reduce((sum, s) => sum + s.outstandingPaise, 0),
      committed: suppliers.reduce((sum, s) => sum + s.openCommitmentPaise, 0),
      openOrders: suppliers.reduce((sum, s) => sum + s.openOrders, 0),
    }),
    [suppliers],
  );

  if (suppliers.length === 0) {
    return (
      <EmptyState
        title="No suppliers yet"
        description="A supplier is created the first time you raise a purchase order, or here once the catalogue exists."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <StatRow cols={4}>
        <Stat label="Suppliers" value={suppliers.length} />
        <Stat label="Payable" value={rupeesShort(totals.outstanding)} hint="Invoices received, unpaid" />
        <Stat
          label="Committed"
          value={rupeesShort(totals.committed)}
          hint="Ordered, not yet billed"
        />
        <Stat label="Open orders" value={totals.openOrders} href="/purchases" />
      </StatRow>

      <Panel
        flush
        title="All suppliers"
        // Width on the wrapper, not the control: `Input` already sets
        // `w-full`, and two width utilities on one element resolve by
        // stylesheet order rather than by which was written last.
        action={
          <div className="w-56">
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Name or GSTIN"
              aria-label="Filter suppliers"
            />
          </div>
        }
      >
        {shown.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState compact title="No supplier matches that" />
          </div>
        ) : (
          <RowList>
            {shown.map((supplier) => (
              <Row key={supplier.id}>
                <div className="min-w-0">
                  {/* The name is the link. §71: never make someone search for
                      context they are already looking at. */}
                  <Link
                    href={`/suppliers/${supplier.id}`}
                    className="text-[14px] text-text no-underline hover:underline"
                  >
                    {supplier.displayName}
                  </Link>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    {supplier.gstin ?? "No GSTIN recorded"}
                    {supplier.phone ? ` · ${supplier.phone}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-8 text-right">
                  <div>
                    <p className="tabular m-0 text-[14px] text-text">
                      {rupees(supplier.outstandingPaise)}
                    </p>
                    <p className="m-0 text-[12px] text-text-tertiary">Outstanding</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="tabular m-0 text-[14px] text-text">
                      {rupees(supplier.openCommitmentPaise)}
                    </p>
                    <p className="m-0 text-[12px] text-text-tertiary">
                      {supplier.openOrders === 1 ? "1 open order" : `${supplier.openOrders} open orders`}
                    </p>
                  </div>
                </div>
              </Row>
            ))}
          </RowList>
        )}
      </Panel>
    </div>
  );
}
