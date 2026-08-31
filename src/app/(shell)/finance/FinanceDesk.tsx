"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  Select,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Invoice = {
  id: string;
  invoiceNumber: string;
  partyName: string;
  direction: "sales" | "purchase";
  issuedAt: Date | string;
  totalPaise: number;
  outstandingPaise: number;
};

type Receivable = {
  customerId: string;
  customerName: string;
  invoicedPaise: number;
  receivedPaise: number;
  outstandingPaise: number;
  oldestUnpaidAt: Date | string | null;
};

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function daysSince(value: Date | string | null): number | null {
  if (!value) return null;
  const then = typeof value === "string" ? new Date(value) : value;
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
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
 * The finance desk.
 *
 * Receivables lead and invoices follow, because a paid invoice is a record while
 * an unpaid one is a phone call somebody has to make today. Each receivable
 * carries the age of its oldest unpaid invoice rather than only an amount — the
 * age is what decides whether the call happens this week.
 */
export function FinanceDesk({
  invoices,
  receivables,
  invoiceableOrders,
  invoiceablePurchases,
}: {
  invoices: Invoice[];
  receivables: Receivable[];
  invoiceableOrders: Array<{
    id: string;
    customerName: string;
    totalPricePaise: number;
  }>;
  invoiceablePurchases: Array<{
    id: string;
    supplierName: string;
    totalCostPaise: number;
  }>;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [raising, setRaising] = useState(false);
  const [raisingPurchase, setRaisingPurchase] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [crediting, setCrediting] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totals = useMemo(() => {
    const owedToUs = receivables.reduce(
      (sum, row) => sum + row.outstandingPaise,
      0,
    );
    const owedByUs = invoices
      .filter((invoice) => invoice.direction === "purchase")
      .reduce((sum, invoice) => sum + invoice.outstandingPaise, 0);
    const oldest = receivables.reduce<number | null>((worst, row) => {
      const age = daysSince(row.oldestUnpaidAt);
      return age !== null && (worst === null || age > worst) ? age : worst;
    }, null);
    return { owedToUs, owedByUs, oldest };
  }, [invoices, receivables]);

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/finance");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

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

      <div className="mb-6">
        <StatRow cols={3}>
          <Stat
            label="Owed to us"
            value={rupees(totals.owedToUs)}
            hint="Receivables"
          />
          <Stat
            label="Owed by us"
            value={rupees(totals.owedByUs)}
            hint="Payables"
          />
          <Stat
            label="Oldest unpaid"
            value={totals.oldest === null ? "—" : `${totals.oldest}d`}
            hint={
              totals.oldest === null
                ? "Nothing outstanding"
                : "Since the invoice was raised"
            }
          />
        </StatRow>
      </div>

      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href="/ledgers">
          <Button>Ledgers</Button>
        </Link>
        {invoiceablePurchases.length > 0 && (
          <Button onClick={() => setRaisingPurchase((open) => !open)}>
            {raisingPurchase ? "Cancel" : "Record supplier bill"}
          </Button>
        )}
        {invoiceableOrders.length > 0 && (
          <Button variant="primary" onClick={() => setRaising((open) => !open)}>
            {raising ? "Cancel" : "Raise invoice"}
          </Button>
        )}
      </div>

      {raisingPurchase && (
        <div className="mb-6">
          <Panel title="Record what a supplier billed">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.raise_purchase_invoice",
                  {
                    purchaseOrderId: String(
                      formData.get("purchaseOrderId") ?? "",
                    ),
                    supplierInvoiceTotalPaise: Math.round(
                      Number(formData.get("total") ?? 0) * 100,
                    ),
                  },
                  () => setRaisingPurchase(false),
                )
              }
            >
              <div className="min-w-[300px] flex-1">
                <Field
                  label="Purchase order"
                  htmlFor="purchase-invoice-order"
                  required
                >
                  <Select
                    id="purchase-invoice-order"
                    name="purchaseOrderId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose an order
                    </option>
                    {invoiceablePurchases.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.supplierName} — {rupees(order.totalCostPaise)}{" "}
                        ordered
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="w-[190px]">
                <Field
                  label="Amount billed (₹)"
                  htmlFor="purchase-invoice-total"
                  required
                  hint="As the supplier wrote it"
                >
                  <Input
                    id="purchase-invoice-total"
                    name="total"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Record
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                Recorded as given rather than recomputed from the order. What
                this business owes is what the supplier billed, and a
                disagreement with the order is a conversation to have — not a
                correction to make silently.
              </p>
            </form>
          </Panel>
        </div>
      )}

      {raising && (
        <div className="mb-6">
          <Panel title="Raise a tax invoice">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.raise_sales_invoice",
                  { salesOrderId: String(formData.get("salesOrderId") ?? "") },
                  () => setRaising(false),
                )
              }
            >
              <div className="min-w-[320px] flex-1">
                <Field label="Order" htmlFor="invoice-order" required>
                  <Select
                    id="invoice-order"
                    name="salesOrderId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose an order
                    </option>
                    {invoiceableOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.customerName} — {rupees(order.totalPricePaise)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Raise
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                The number is taken from the series counter inside the same
                transaction, so a failure returns it rather than leaving a gap.
                Tax is decided by the customer&apos;s state against this
                business&apos;s — CGST and SGST at home, IGST across a border.
              </p>
            </form>
          </Panel>
        </div>
      )}

      {receivables.length > 0 && (
        <div className="mb-4">
          <Panel title="Outstanding">
            <div className="-mx-3 overflow-x-auto px-3">
              <table className="w-full min-w-[600px] border-collapse">
                <caption className="sr-only">
                  Outstanding receivables by customer
                </caption>
                <thead>
                  <tr>
                    {[
                      "Customer",
                      "Invoiced",
                      "Received",
                      "Outstanding",
                      "Oldest",
                    ].map((heading, index) => (
                      <th
                        key={heading}
                        className={
                          "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                          (index === 0 ? "text-left" : "text-right")
                        }
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((row) => {
                    const age = daysSince(row.oldestUnpaidAt);
                    return (
                      <tr key={row.customerId}>
                        <td className="border-b border-line px-3 py-2 text-[14px]">
                          <Link
                            href={`/ledgers?customer=${row.customerId}`}
                            className="text-text no-underline hover:underline"
                          >
                            {row.customerName}
                          </Link>
                        </td>
                        <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                          {rupees(row.invoicedPaise)}
                        </td>
                        <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                          {rupees(row.receivedPaise)}
                        </td>
                        <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                          {rupees(row.outstandingPaise)}
                        </td>
                        {/* Age, not date: how long it has been owed is what decides
                          whether the call happens this week. */}
                        <td
                          className={
                            "tabular border-b border-line px-3 py-2 text-right text-[13px] " +
                            (age !== null && age > 30
                              ? "text-warning"
                              : "text-text-secondary")
                          }
                        >
                          {age === null ? "—" : `${age}d`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      <Panel title="Invoices" flush={invoices.length === 0}>
        {invoices.length === 0 ? (
          <EmptyState
            compact
            title="No invoices yet"
            description="Raise one against an approved order and it appears here."
          />
        ) : (
          <div className="-mx-3 overflow-x-auto px-3">
            <table className="w-full min-w-[600px] border-collapse">
              <caption className="sr-only">Invoices</caption>
              <thead>
                <tr>
                  {[
                    "Number",
                    "Party",
                    "Issued",
                    "Total",
                    "Outstanding",
                    "",
                  ].map((heading, index) => (
                    <th
                      key={heading || index}
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
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="tabular border-b border-line px-3 py-2 text-[14px]">
                      <Link
                        href={`/finance/${invoice.id}`}
                        className="text-text no-underline hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="border-b border-line px-3 py-2 text-[14px] text-text-secondary">
                      {invoice.partyName}
                      <span className="ml-2 text-[12px] text-text-tertiary">
                        {invoice.direction === "sales" ? "sale" : "purchase"}
                      </span>
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                      {shortDate(invoice.issuedAt)}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                      {rupees(invoice.totalPaise)}
                    </td>
                    <td
                      className={
                        "tabular border-b border-line px-3 py-2 text-right text-[14px] " +
                        (invoice.outstandingPaise === 0 ? "text-success" : "")
                      }
                    >
                      {invoice.outstandingPaise === 0
                        ? "Paid"
                        : rupees(invoice.outstandingPaise)}
                    </td>
                    <td className="flex justify-end gap-2 border-b border-line px-3 py-2 text-right">
                      {invoice.outstandingPaise > 0 && (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            setPaying(paying === invoice.id ? null : invoice.id)
                          }
                        >
                          {paying === invoice.id ? "Close" : "Record payment"}
                        </Button>
                      )}
                      {/*
                      A posted invoice cannot be edited (slice 1), so the only
                      way to correct one is a note. Offered beside the payment
                      rather than hidden on a detail page, because the moment
                      somebody notices an invoice is wrong is the moment they
                      are looking at this list.
                    */}
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() =>
                          setCrediting(
                            crediting === invoice.id ? null : invoice.id,
                          )
                        }
                      >
                        {crediting === invoice.id ? "Close" : "Credit note"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paying && (
          <PaymentForm
            invoice={invoices.find((invoice) => invoice.id === paying)!}
            pending={pending}
            onSubmit={(input) =>
              run("verity.plywood.record_payment", input, () => setPaying(null))
            }
          />
        )}

        {crediting && (
          <NoteForm
            invoice={invoices.find((invoice) => invoice.id === crediting)!}
            pending={pending}
            onSubmit={(input) =>
              run("verity.plywood.raise_invoice_note", input, () =>
                setCrediting(null),
              )
            }
          />
        )}
      </Panel>
    </>
  );
}

/**
 * Recording money received.
 *
 * The amount defaults to what is outstanding, because a full settlement is the
 * common case and typing the figure again is a chance to get it wrong. More than
 * is owed is refused by the command — an overpayment is an advance or a refund,
 * not a larger payment.
 */
function PaymentForm({
  invoice,
  pending,
  onSubmit,
}: {
  invoice: Invoice;
  pending: boolean;
  onSubmit: (input: unknown) => void;
}) {
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
      action={(formData) =>
        onSubmit({
          invoiceId: invoice.id,
          // Rupees in, paise out. The server never sees a decimal amount.
          amountPaise: Math.round(Number(formData.get("amount") ?? 0) * 100),
          method: String(formData.get("method") ?? "cash"),
          ...(formData.get("reference")
            ? { reference: String(formData.get("reference")) }
            : {}),
        })
      }
    >
      <div className="w-[170px]">
        <Field label="Amount (₹)" htmlFor={`pay-amount-${invoice.id}`} required>
          <Input
            id={`pay-amount-${invoice.id}`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            autoFocus
            defaultValue={(invoice.outstandingPaise / 100).toFixed(2)}
          />
        </Field>
      </div>
      <div className="w-[150px]">
        <Field label="Method" htmlFor={`pay-method-${invoice.id}`} required>
          <Select
            id={`pay-method-${invoice.id}`}
            name="method"
            required
            defaultValue="bank"
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank transfer</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
          </Select>
        </Field>
      </div>
      <div className="min-w-[220px] flex-1">
        <Field
          label="Reference"
          htmlFor={`pay-ref-${invoice.id}`}
          hint="UTR, UPI id or cheque number"
        >
          <Input id={`pay-ref-${invoice.id}`} name="reference" />
        </Field>
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        Record
      </Button>
      <p className="m-0 w-full text-[12px] text-text-tertiary">
        {rupees(invoice.outstandingPaise)} outstanding on{" "}
        {invoice.invoiceNumber}. More than that is refused — an overpayment is
        an advance or a refund, and absorbing it here would leave money the
        ledger cannot explain.
      </p>
    </form>
  );
}

/**
 * A credit or debit note against a posted invoice.
 *
 * The taxable amount is asked for, never the total: the tax follows the
 * invoice's own rates, and letting somebody type a total would let the two
 * disagree on a document that has to be filed.
 *
 * The reason is required by the command and by the database. A note nobody can
 * explain is the one a tax officer asks about.
 */
function NoteForm({
  invoice,
  pending,
  onSubmit,
}: {
  invoice: { id: string; invoiceNumber: string; outstandingPaise: number };
  pending: boolean;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          invoiceId: invoice.id,
          noteType: String(data.get("noteType") ?? "credit"),
          taxablePaise: Math.round(Number(data.get("taxableRupees")) * 100),
          reason: String(data.get("reason") ?? "").trim(),
        });
      }}
    >
      <Field htmlFor="noteType" label="Note">
        <Select id="noteType" name="noteType" defaultValue="credit">
          <option value="credit">Credit note — reduces what they owe</option>
          <option value="debit">Debit note — increases what they owe</option>
        </Select>
      </Field>
      <Field
        htmlFor="taxableRupees"
        label="Taxable amount"
        hint="Tax follows the invoice's own rates."
      >
        <Input
          id="taxableRupees"
          name="taxableRupees"
          type="number"
          min="1"
          step="0.01"
          required
        />
      </Field>
      <Field htmlFor="reason" label="Reason">
        <Input
          id="reason"
          name="reason"
          required
          minLength={3}
          placeholder="Short-supplied 4 sheets"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        Raise against {invoice.invoiceNumber}
      </Button>
    </form>
  );
}
