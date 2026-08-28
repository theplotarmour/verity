"use client";

import { useRouter } from "next/navigation";
import { EmptyState, Field, Panel, Select, Stat, StatRow } from "@/components/ui/primitives";

type Entry = {
  id: string;
  entryType: string;
  amountPaise: number;
  narration: string | null;
  occurredAt: Date | string;
  runningBalancePaise: number;
};

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

/**
 * One party's ledger.
 *
 * Debit and credit are named from this business's point of view throughout, and
 * the columns say so — "they owe" and "they paid" for a customer, "we owe" and
 * "we paid" for a supplier. A ledger that flips perspective between the two is
 * unreadable, and a column headed "Debit" makes the reader do the flip in their
 * head.
 *
 * The running balance is the last column because that is the number the
 * conversation is about, and it is computed here from the entries rather than
 * read from anywhere (P3).
 */
export function LedgerView({
  customers,
  suppliers,
  selectedCustomerId,
  selectedSupplierId,
  selectedName,
  ledger,
}: {
  customers: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  selectedCustomerId: string | null;
  selectedSupplierId: string | null;
  selectedName: string | null;
  ledger: { balancePaise: number; entries: Entry[] } | null;
}) {
  const router = useRouter();
  const isSupplier = Boolean(selectedSupplierId);

  return (
    <>
      <div className="mb-6">
        <Panel title="Choose a party">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Field label="Customer" htmlFor="ledger-customer">
                <Select
                  id="ledger-customer"
                  value={selectedCustomerId ?? ""}
                  onChange={(event) =>
                    router.push(
                      event.target.value ? `/ledgers?customer=${event.target.value}` : "/ledgers",
                    )
                  }
                >
                  <option value="">—</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="min-w-[240px] flex-1">
              <Field label="Supplier" htmlFor="ledger-supplier">
                <Select
                  id="ledger-supplier"
                  value={selectedSupplierId ?? ""}
                  onChange={(event) =>
                    router.push(
                      event.target.value ? `/ledgers?supplier=${event.target.value}` : "/ledgers",
                    )
                  }
                >
                  <option value="">—</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <p className="mb-0 mt-3 text-[12px] text-text-tertiary">
            One party at a time. A ledger of everybody at once is a journal, and answers a different
            question.
          </p>
        </Panel>
      </div>

      {!ledger ? (
        <Panel flush>
          <EmptyState
            compact
            title="No party chosen"
            description="Pick a customer or a supplier to see every movement of money against them."
          />
        </Panel>
      ) : (
        <>
          <div className="mb-6">
            <StatRow cols={3}>
              <Stat
                label={isSupplier ? "We owe" : "They owe"}
                value={rupees(Math.abs(ledger.balancePaise))}
                hint={
                  ledger.balancePaise === 0
                    ? "Settled"
                    : ledger.balancePaise > 0
                      ? "Outstanding against us"
                      : "In credit"
                }
              />
              <Stat label="Entries" value={String(ledger.entries.length)} />
              <Stat
                label="Party"
                value={selectedName ?? "—"}
                hint={isSupplier ? "Supplier" : "Customer"}
              />
            </StatRow>
          </div>

          <Panel title="Ledger" flush={ledger.entries.length === 0}>
            {ledger.entries.length === 0 ? (
              <EmptyState
                compact
                title="Nothing recorded yet"
                description="An entry appears when an invoice is raised or a payment is taken."
              />
            ) : (
              <table className="w-full border-collapse">
                <caption className="sr-only">Ledger entries, oldest first</caption>
                <thead>
                  <tr>
                    {[
                      "Date",
                      "Particulars",
                      isSupplier ? "We paid" : "They owe",
                      isSupplier ? "We owe" : "They paid",
                      "Balance",
                    ].map((heading, index) => (
                      <th
                        key={heading}
                        className={
                          "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                          (index <= 1 ? "text-left" : "text-right")
                        }
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="tabular border-b border-line px-3 py-2 text-[13px] text-text-secondary">
                        {shortDate(entry.occurredAt)}
                      </td>
                      <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                        {entry.narration ?? "—"}
                      </td>
                      <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                        {entry.entryType === "debit" ? rupees(entry.amountPaise) : "—"}
                      </td>
                      <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                        {entry.entryType === "credit" ? rupees(entry.amountPaise) : "—"}
                      </td>
                      <td className="tabular border-b border-line px-3 py-2 text-right text-[14px] text-text">
                        {rupees(entry.runningBalancePaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mb-0 mt-3 text-[12px] text-text-tertiary">
              Append-only, enforced by the database. A correction is a new entry in the opposite
              direction, never an edit — which is why this column can be trusted.
            </p>
          </Panel>
        </>
      )}
    </>
  );
}
