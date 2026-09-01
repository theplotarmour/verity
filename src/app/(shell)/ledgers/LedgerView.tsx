"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EmptyState,
  Field,
  Panel,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";

type Entry = {
  id: string;
  entryType: string;
  amountPaise: number;
  narration: string | null;
  occurredAt: Date | string;
  runningBalancePaise: number;
};

/**
 * Which way a running balance points, in the reader's own words.
 *
 * The ledger stores debits positive and credits negative, which is correct and
 * is not something a plywood trader should have to know. For a supplier a
 * purchase invoice is a credit, so the balance goes negative precisely when the
 * business owes the most — the least intuitive possible reading.
 */
function balanceDirection(balancePaise: number, isSupplier: boolean): string {
  if (isSupplier) return balancePaise < 0 ? "we owe" : "in our favour";
  return balancePaise > 0 ? "they owe" : "in their favour";
}

/** Whole days since an instant. Module scope: `Date.now()` is impure, and a
 *  component that calls it during render can re-render to a different answer. */
function daysSince(value: Date | string | null): number | null {
  if (!value) return null;
  const then = typeof value === "string" ? new Date(value) : value;
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
}

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
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
export type Balance = {
  partyId: string;
  partyName: string;
  side: "customer" | "supplier";
  outstandingPaise: number;
  uninvoicedPaise: number;
  onAccountPaise: number;
  counterAdvancePaise: number;
  oldestOpenAt: Date | string | null;
  /** The same firm on the other side of the trade, when the two are linked. */
  sameBusinessAs: string | null;
};

/**
 * What this party's position comes to, signed from the business's view:
 * positive means they owe us, negative means we owe them.
 *
 * `counterAdvancePaise` — cash handed to a customer, or received from a
 * supplier — moves the balance the OPPOSITE way from a normal advance, which
 * is why it is a separate term rather than folded into onAccount.
 */
function net(row: Balance): number {
  const magnitude =
    row.outstandingPaise +
    row.uninvoicedPaise -
    row.onAccountPaise +
    row.counterAdvancePaise;
  return row.side === "customer" ? magnitude : -magnitude;
}

export function LedgerView({
  customers,
  suppliers,
  selectedCustomerId,
  selectedSupplierId,
  selectedName,
  ledger,
  balances,
}: {
  customers: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  selectedCustomerId: string | null;
  selectedSupplierId: string | null;
  selectedName: string | null;
  ledger: { balancePaise: number; entries: Entry[] } | null;
  balances: Balance[];
}) {
  const router = useRouter();
  const isSupplier = Boolean(selectedSupplierId);
  const selectedAny = Boolean(selectedCustomerId || selectedSupplierId);

  // The overview is the default view. Reported: choosing a party first meant
  // the page said nothing at all until you already knew whose name you wanted,
  // which is not what a "who owes what" screen is for.
  if (!selectedAny) {
    return <OwedOverview balances={balances} />;
  }

  return (
    <>
      <div className="mb-6">
        <Panel title="Choose a party">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Field label="Customer" htmlFor="ledger-customer">
                <Combobox
                  id="ledger-customer"
                  value={selectedCustomerId ?? ""}
                  placeholder="Search customers"
                  onChange={(value) =>
                    router.push(value ? `/ledgers?customer=${value}` : "/ledgers")
                  }
                  options={customers.map((customer) => ({
                    value: customer.id,
                    label: customer.name,
                  }))}
                />
              </Field>
            </div>
            <div className="min-w-[240px] flex-1">
              <Field label="Supplier" htmlFor="ledger-supplier">
                <Combobox
                  id="ledger-supplier"
                  value={selectedSupplierId ?? ""}
                  placeholder="Search suppliers"
                  onChange={(value) =>
                    router.push(value ? `/ledgers?supplier=${value}` : "/ledgers")
                  }
                  options={suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                  }))}
                />
              </Field>
            </div>
          </div>
          <p className="mb-0 mt-3 text-[12px] text-text-tertiary">
            One party at a time. A ledger of everybody at once is a journal, and
            answers a different question.
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
                <caption className="sr-only">
                  Ledger entries, oldest first
                </caption>
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
                        {entry.entryType === "debit"
                          ? rupees(entry.amountPaise)
                          : "—"}
                      </td>
                      <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                        {entry.entryType === "credit"
                          ? rupees(entry.amountPaise)
                          : "—"}
                      </td>
                      {/* A signed figure under business labels is a trap. The
                          columns say "We paid" and "We owe", and a balance
                          reading "₹-70,000" beside "We owe ₹70,000" leaves the
                          reader working out a sign convention nobody told them.
                          The amount is absolute and a word says which way it
                          points — the same treatment the summary above already
                          uses. */}
                      <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] text-text">
                        {entry.runningBalancePaise === 0 ? (
                          "Settled"
                        ) : (
                          <>
                            {rupees(Math.abs(entry.runningBalancePaise))}{" "}
                            <span className="text-[12px] text-text-tertiary">
                              {balanceDirection(
                                entry.runningBalancePaise,
                                isSupplier,
                              )}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mb-0 mt-3 text-[12px] text-text-tertiary">
              Append-only, enforced by the database. A correction is a new entry
              in the opposite direction, never an edit — which is why this
              column can be trusted.
            </p>
          </Panel>
        </>
      )}
    </>
  );
}


/**
 * Everyone the business trades with, and which way the money points.
 *
 * REPORTED: "it is very difficult to tell whether we owe the suppliers
 * something or do they owe us. Make it simpler, use language like they need to
 * send us x amount or we need to send them y amount."
 *
 * So the direction is a SENTENCE, not a sign, a colour or a column heading.
 * The underlying ledger stores debits positive and credits negative, which is
 * correct double-entry and is not something a plywood trader agreed to learn —
 * for a supplier the balance goes most negative exactly when the business owes
 * the most, which is the least intuitive reading available.
 *
 * Two groups rather than one sorted list: "money coming to us" and "money we
 * have to send" are different jobs on different days, and interleaving them
 * makes each harder to work through.
 */
function OwedOverview({ balances }: { balances: Balance[] }) {
  // A firm we both buy from and sell to appears twice, once on each side. The
  // two rows are shown as one line with a note, because "they need to send us
  // X" and "we need to send them Y" about the same firm on two different lines
  // is not two facts, it is one fact told confusingly.
  const byId = new Map(balances.map((row) => [row.partyId, row]));
  const paired = new Set<string>();
  const lines: Balance[] = [];
  for (const row of balances) {
    if (paired.has(row.partyId)) continue;
    const other = row.sameBusinessAs ? byId.get(row.sameBusinessAs) : undefined;
    if (!other) {
      lines.push(row);
      continue;
    }
    paired.add(row.partyId);
    paired.add(other.partyId);
    // The side with the larger obligation carries the line, so the sentence
    // reads in the direction the money actually has to travel.
    lines.push(Math.abs(net(row)) >= Math.abs(net(other)) ? row : other);
  }

  const owedToUs = lines.filter((row) => net(row) > 0);
  const weOwe = lines.filter((row) => net(row) <= 0);

  const totalIn = owedToUs.reduce((sum, row) => sum + net(row), 0);
  const totalOut = weOwe.reduce((sum, row) => sum + Math.abs(net(row)), 0);

  return (
    <div className="flex flex-col gap-5">
      <StatRow cols={2}>
        <Stat
          label="They need to send us"
          value={rupees(totalIn)}
          hint="Across every customer and supplier"
        />
        <Stat
          label="We need to send them"
          value={rupees(totalOut)}
          hint="Including goods received but not yet billed"
        />
      </StatRow>

      {/* Advances need naming once, where they first confuse someone: a payment
          that is not against any bill is not an error and not a debt, and
          "on account" is the accountant's word for it, not a merchant's. */}
      <p className="m-0 text-[12px] text-text-tertiary">
        A payment that has not been matched to a bill yet is money paid ahead of
        one. It still counts — it reduces what the party owes, or increases what
        they are owed — and it clears itself against the next invoice raised.
      </p>

      <OwedTable
        title="They need to send us"
        empty="Nobody owes the business anything."
        rows={owedToUs}
        lead={(row) => `${row.partyName} needs to send us`}
      />
      <OwedTable
        title="We need to send them"
        empty="The business owes nobody anything."
        rows={weOwe}
        lead={(row) => `We need to send ${row.partyName}`}
      />
    </div>
  );
}

function OwedTable({
  title,
  empty,
  rows,
  lead,
}: {
  title: string;
  empty: string;
  rows: Balance[];
  lead: (row: Balance) => string;
}) {
  return (
    <Panel title={title} flush={rows.length === 0}>
      {rows.length === 0 ? (
        <EmptyState compact title={empty} />
      ) : (
        <div className="-mx-3 overflow-x-auto px-3">
          <table className="w-full min-w-[640px] border-collapse">
            <caption className="sr-only">{title}</caption>
            <tbody>
              {rows
                .slice()
                .sort((a, b) => Math.abs(net(b)) - Math.abs(net(a)))
                .map((row) => {
                  const amount = Math.abs(net(row));
                  const age = daysSince(row.oldestOpenAt);
                  return (
                    <tr key={`${row.side}-${row.partyId}`}>
                      <td className="border-b border-line px-3 py-2.5 text-[14px] text-text">
                        <Link
                          href={
                            row.side === "customer"
                              ? `/ledgers?customer=${row.partyId}`
                              : `/ledgers?supplier=${row.partyId}`
                          }
                          className="text-text no-underline hover:underline"
                        >
                          {lead(row)}
                        </Link>
                        <span className="mt-0.5 block text-[12px] text-text-tertiary">
                          {row.sameBusinessAs
                            ? "Customer and supplier"
                            : row.side === "customer"
                              ? "Customer"
                              : "Supplier"}
                          {row.uninvoicedPaise > 0 &&
                            ` · ${rupees(row.uninvoicedPaise)} delivered, not yet billed`}
                          {row.onAccountPaise > 0 &&
                            (row.side === "customer"
                              ? ` · ${rupees(row.onAccountPaise)} already paid, not against any bill yet`
                              : ` · ${rupees(row.onAccountPaise)} we have already paid them, not against any bill yet`)}
                          {row.counterAdvancePaise > 0 &&
                            (row.side === "customer"
                              ? ` · ${rupees(row.counterAdvancePaise)} we sent them, not against any bill yet`
                              : ` · ${rupees(row.counterAdvancePaise)} they sent us, not against any bill yet`)}
                          {age !== null && age > 30 && ` · oldest ${age} days`}
                        </span>
                      </td>
                      <td className="tabular whitespace-nowrap border-b border-line px-3 py-2.5 text-right text-[15px] text-text">
                        {rupees(amount)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
