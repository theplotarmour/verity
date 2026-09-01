"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Panel,
  Row,
  RowList,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { NewCustomerModal } from "@/components/ui/business/NewCustomerModal";
import { rupees, rupeesShort } from "@/components/ui/business/format";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Customer = {
  id: string;
  displayName: string;
  gstin: string | null;
  phone: string | null;
  stateCode: string | null;
  creditLimitPaise: number;
  exposurePaise: number;
  availableCreditPaise: number;
  active: boolean;
};

export function CustomerList({ customers }: { customers: Customer[] }) {
  const [filter, setFilter] = useState("");
  // Reported: creating a customer lived on Sales only, so the page anyone opens
  // to look a customer up could not make one.
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      (customer) =>
        customer.displayName.toLowerCase().includes(needle) ||
        (customer.gstin ?? "").toLowerCase().includes(needle),
    );
  }, [customers, filter]);

  const totals = useMemo(
    () => ({
      exposure: customers.reduce((sum, c) => sum + c.exposurePaise, 0),
      // Customers over their limit are the working list for a sales manager;
      // everyone else needs no decision.
      overLimit: customers.filter((c) => c.exposurePaise > c.creditLimitPaise).length,
      headroom: customers.reduce((sum, c) => sum + c.availableCreditPaise, 0),
    }),
    [customers],
  );

  function create(input: unknown) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.plywood.create_customer",
        input,
        "/customers",
      );
      if (result.ok) {
        setCreating(false);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const dialog = (
    <NewCustomerModal
      open={creating}
      pending={pending}
      onClose={() => setCreating(false)}
      onSubmit={create}
    />
  );

  if (customers.length === 0) {
    return (
      <>
        {failure && (
          <div className="mb-4">
            <ErrorState
              title="That was refused"
              message={failure.message}
              issues={failure.issues}
              retryable={failure.retryable}
            />
          </div>
        )}
        <EmptyState
          title="No customers yet"
          description="Add the first one here, or let a sales order create them."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              New customer
            </Button>
          }
        />
        {dialog}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {failure && (
        <ErrorState
          title="That was refused"
          message={failure.message}
          issues={failure.issues}
          retryable={failure.retryable}
        />
      )}
      <StatRow cols={4}>
        <Stat label="Customers" value={customers.length} />
        <Stat label="Exposure" value={rupeesShort(totals.exposure)} hint="Owed plus committed" />
        <Stat label="Headroom" value={rupeesShort(totals.headroom)} hint="Credit still available" />
        <Stat
          label="Over limit"
          value={totals.overLimit}
          hint={totals.overLimit === 0 ? "Nobody" : "Need a decision"}
        />
      </StatRow>

      <Panel
        flush
        title="All customers"
        action={
          <div className="flex items-center gap-2">
            <div className="w-56">
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Name or GSTIN"
                aria-label="Filter customers"
              />
            </div>
            <Button variant="primary" onClick={() => setCreating(true)}>
              New customer
            </Button>
          </div>
        }
      >
        {shown.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState compact title="No customer matches that" />
          </div>
        ) : (
          <RowList>
            {shown.map((customer) => {
              const over = customer.exposurePaise > customer.creditLimitPaise;
              return (
                <Row key={customer.id}>
                  <div className="min-w-0">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      {customer.displayName}
                    </Link>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      {customer.gstin ?? "No GSTIN recorded"}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <div>
                      <p className="tabular m-0 text-[14px] text-text">
                        {rupees(customer.exposurePaise)}
                      </p>
                      <p className="m-0 text-[12px] text-text-tertiary">
                        of {rupees(customer.creditLimitPaise)}
                      </p>
                    </div>
                    <div className="w-28">
                      {/* Over-limit is stated in words rather than by colour
                          alone — colour is not information to a reader who
                          cannot see it, and this is the row that stops a sale. */}
                      <p
                        className={
                          "tabular m-0 text-[14px] " + (over ? "text-danger" : "text-text")
                        }
                      >
                        {over
                          ? `−${rupees(customer.exposurePaise - customer.creditLimitPaise)}`
                          : rupees(customer.availableCreditPaise)}
                      </p>
                      <p className="m-0 text-[12px] text-text-tertiary">
                        {over ? "Over limit" : "Available"}
                      </p>
                    </div>
                  </div>
                </Row>
              );
            })}
          </RowList>
        )}
      </Panel>
      {dialog}
    </div>
  );
}
