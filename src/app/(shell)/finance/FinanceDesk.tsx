"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormRow,
  Input,
  Panel,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";
import { Modal, ModalCancel } from "@/components/ui/Modal";
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
  provisional: boolean;
};

export type Balance = {
  partyId: string;
  partyName: string;
  side: "customer" | "supplier";
  invoicedPaise: number;
  settledPaise: number;
  outstandingPaise: number;
  uninvoicedPaise: number;
  onAccountPaise: number;
  counterAdvancePaise: number;
  oldestOpenAt: Date | string | null;
  provisionalBills: number;
};

/**
 * What one party's position comes to, signed from this business's point of
 * view: positive means they owe us, negative means we owe them.
 *
 * A customer's advance and a supplier's bill both push it negative, which is
 * the whole point — one number, one direction, whichever side of the trade the
 * party sits on.
 */
function netOf(row: Balance): number {
  const magnitude =
    row.outstandingPaise +
    row.uninvoicedPaise -
    row.onAccountPaise +
    row.counterAdvancePaise;
  return row.side === "customer" ? magnitude : -magnitude;
}

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
 * The finance desk — the DOCUMENTS.
 *
 * Money moving lives on /transactions and who owes what lives on /ledgers.
 * This screen is about the paperwork behind those numbers: which invoices and
 * bills exist, which supplier bills are still waiting on their document, and
 * which movements failed to produce one at all.
 *
 * Recording a payment was here and is not any more. Reported: "the transaction
 * page is the only page where we can record that we received a payment or we
 * sent a payment." Two doors onto the same act is how the same cheque gets
 * entered twice.
 *
 *
 * REBUILT FOR TASK 71 ITEM 10 — "finance is completely useless right now,
 * nothing is linked to it, whenever I try to raise an invoice or supplier bill
 * it always shows some kind of error."
 *
 * Both halves of that were true and they were the same fault. The desk's main
 * actions were *raise a sales invoice* and *raise a supplier bill*, which are
 * accounting operations, not things a plywood merchant does. Each was refused
 * unless goods had already moved — correctly, since an invoice for goods that
 * have not gone out is a bill for nothing — so the ordinary path through the
 * screen was an error message.
 *
 * Nobody raises a document here any more. Selling and delivering raises the
 * customer's invoice; receiving raises the supplier's bill. What is left is the
 * only question this screen ever needed to answer — who owes money, and who is
 * owed — plus the one action a merchant actually performs: recording that money
 * moved.
 *
 * Raising by hand survives only as a RETRY, on an order whose automatic
 * document was refused, with the reason shown. That is a repair, and it is
 * presented as one.
 */
export function FinanceDesk({
  invoices,
  balances,
  unbilledSales,
  unbilledPurchases,
}: {
  invoices: Invoice[];
  balances: Balance[];
  /** Goods issued, no invoice — the automatic one did not go through. */
  unbilledSales: Array<{
    id: string;
    customerName: string;
    reference: string | null;
    valuePaise: number;
  }>;
  /** Goods received, no bill, order complete — same situation, buying side. */
  unbilledPurchases: Array<{
    id: string;
    supplierName: string;
    reference: string | null;
    valuePaise: number;
  }>;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [confirming, setConfirming] = useState<Invoice | null>(null);
  const [pending, startTransition] = useTransition();

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

  const receivable = balances.filter((row) => row.side === "customer");
  const payable = balances.filter((row) => row.side === "supplier");

  const totals = useMemo(
    () => ({
      // Summed PER PARTY, and only the parties who actually owe.
      //
      // REPORTED: finance showed a negative figure instead of saying who owed
      // whom. It summed `outstanding - advance` across every customer, so one
      // customer who had paid ahead subtracted from what the others owed, and a
      // big enough advance turned the total negative — a headline reading
      // "They need to send us -₹4,000", which is not a sentence about money.
      //
      // A party who has overpaid is not negative debt. They are owed a refund,
      // which belongs on the other side of the screen, and that is where the
      // ledger already puts them.
      owedToUs: receivable.reduce(
        (sum, row) => sum + Math.max(0, netOf(row)),
        0,
      ),
      owedByUs:
        payable.reduce((sum, row) => sum + Math.max(0, -netOf(row)), 0) +
        // A customer in credit is money the business has and will have to give
        // back or supply against. It belongs with what is owed out.
        receivable.reduce((sum, row) => sum + Math.max(0, -netOf(row)), 0),
      overdue: receivable.reduce((sum, row) => {
        const age = daysSince(row.oldestOpenAt);
        return sum + (age !== null && age > 30 ? row.outstandingPaise : 0);
      }, 0),
      provisional: payable.reduce((sum, row) => sum + row.provisionalBills, 0),
    }),
    [receivable, payable],
  );

  const unbilled = unbilledSales.length + unbilledPurchases.length;

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
        <Stat
          label="They need to send us"
          value={rupees(totals.owedToUs)}
          hint="Customers with unpaid invoices"
          href="/ledgers"
        />
        <Stat
          label="We need to send them"
          value={rupees(totals.owedByUs)}
          hint="Suppliers, plus goods received not yet billed and any advance a customer has paid"
          href="/ledgers"
        />
        <Stat
          label="Overdue"
          value={rupees(totals.overdue)}
          hint="Oldest unpaid invoice past 30 days"
        />
        <Stat
          label="Awaiting supplier bill"
          value={totals.provisional}
          hint="Raised from the order; their document not recorded"
        />
      </StatRow>

      {unbilled > 0 && (
        <Panel title="Goods moved without a document">
          <p className="m-0 mb-3 text-[13px] text-text-secondary">
            These normally raise themselves — a delivery raises the customer&apos;s
            invoice, a receipt raises the supplier&apos;s bill. Something stopped
            each of these, usually a missing GST state code on the party.
            Raising one here retries it and shows the reason if it fails again.
          </p>
          <div className="flex flex-col divide-y divide-line">
            {unbilledSales.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="m-0 text-[14px] text-text">
                    {order.reference ?? "Sales order"} · {order.customerName}
                  </p>
                  <p className="m-0 text-[12px] text-text-tertiary">
                    Delivered {rupees(order.valuePaise)}, not invoiced
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run("verity.plywood.raise_sales_invoice", {
                      salesOrderId: order.id,
                    })
                  }
                >
                  Raise invoice
                </Button>
              </div>
            ))}
            {unbilledPurchases.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="m-0 text-[14px] text-text">
                    {order.reference ?? "Purchase order"} · {order.supplierName}
                  </p>
                  <p className="m-0 text-[12px] text-text-tertiary">
                    Received {rupees(order.valuePaise)}, not billed
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run("verity.plywood.raise_purchase_bill_from_order", {
                      purchaseOrderId: order.id,
                    })
                  }
                >
                  Raise bill
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Documents" flush={invoices.length === 0}>
        {invoices.length === 0 ? (
          <EmptyState
            compact
            title="No invoices yet"
            description="They are raised by delivering goods and by receiving them."
          />
        ) : (
          <div className="-mx-3 overflow-x-auto px-3">
            <table className="w-full min-w-[760px] border-collapse">
              <caption className="sr-only">
                Invoices and supplier bills, newest first
              </caption>
              <thead>
                <tr>
                  {["Document", "Party", "Date", "Total", "Outstanding", ""].map(
                    (heading, index) => (
                      <th
                        key={heading || index}
                        className={
                          "whitespace-nowrap border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                          (index <= 2 ? "text-left" : "text-right")
                        }
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-accent-subtle/40">
                    <td className="border-b border-line px-3 py-2 text-[14px]">
                      <Link
                        href={`/finance/${invoice.id}`}
                        className="whitespace-nowrap text-text no-underline hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <span className="mt-0.5 block text-[12px] text-text-tertiary">
                        {invoice.direction === "sales"
                          ? "Sales invoice"
                          : "Supplier bill"}
                        {invoice.provisional && " · awaiting their document"}
                      </span>
                    </td>
                    <td className="border-b border-line px-3 py-2 text-[14px] text-text-secondary">
                      {invoice.partyName}
                    </td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-2 text-[13px] text-text-secondary">
                      {shortDate(invoice.issuedAt)}
                    </td>
                    <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] text-text-secondary">
                      {rupees(invoice.totalPaise)}
                    </td>
                    <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px]">
                      {invoice.outstandingPaise === 0
                        ? "Settled"
                        : rupees(invoice.outstandingPaise)}
                    </td>
                    <td className="border-b border-line px-3 py-2 text-right">
                      {invoice.provisional && (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => setConfirming(invoice)}
                        >
                          Record their bill…
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ConfirmBillModal
        invoice={confirming}
        pending={pending}
        onClose={() => setConfirming(null)}
        onSubmit={(input) =>
          run("verity.plywood.confirm_purchase_bill", input, () =>
            setConfirming(null),
          )
        }
      />
    </div>
  );
}

/**
 * The supplier's own document, arriving after the bill was already raised.
 *
 * This does not edit the bill — a posted invoice is immutable, by database
 * trigger. It records what their paper says, which is what makes the input
 * credit claimable. A difference between the two figures is reported and left
 * for a credit or debit note, because a supplier who has billed the wrong
 * amount is a conversation, not a silent adjustment.
 */
function ConfirmBillModal({
  invoice,
  pending,
  onClose,
  onSubmit,
}: {
  invoice: Invoice | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: unknown) => void;
}) {
  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [taxable, setTaxable] = useState("");
  const [cgst, setCgst] = useState("");
  const [sgst, setSgst] = useState("");
  const [igst, setIgst] = useState("");

  const parse = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  };
  const total =
    parse(taxable) + parse(cgst) + parse(sgst) + parse(igst);
  const difference = invoice ? total - invoice.totalPaise : 0;
  const canSave =
    invoice !== null && number.trim() !== "" && date !== "" && total > 0;

  return (
    <Modal
      open={invoice !== null}
      onClose={onClose}
      title={`Record the supplier's bill for ${invoice?.invoiceNumber ?? ""}`}
      description="Their number and their figures, as written. We raised this from the order when the goods arrived; this is what makes the tax on it claimable."
      footer={
        <>
          {total > 0 && (
            <span className="tabular mr-auto text-[13px] text-text-secondary">
              Their total {rupees(total)}
              {difference !== 0 && (
                <span className="text-warning">
                  {" "}
                  · {difference > 0 ? "over" : "under"} ours by{" "}
                  {rupees(Math.abs(difference))}
                </span>
              )}
            </span>
          )}
          <ModalCancel onClose={onClose} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || !canSave}
            onClick={() =>
              onSubmit({
                invoiceId: invoice!.id,
                supplierInvoiceNumber: number.trim(),
                supplierInvoiceDate: date,
                taxablePaise: parse(taxable),
                cgstPaise: parse(cgst),
                sgstPaise: parse(sgst),
                igstPaise: parse(igst),
                totalPaise: total,
              })
            }
          >
            {pending ? "Recording…" : "Record"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormRow columns="minmax(0,1fr) 170px">
          <Field label="Their invoice number" htmlFor="bill-number" required>
            <Input
              id="bill-number"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Their invoice date" htmlFor="bill-date" required>
            <Input
              id="bill-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </FormRow>
        <FormRow columns="repeat(4, minmax(0,1fr))">
          <Field label="Taxable (₹)" htmlFor="bill-taxable" required>
            <Input
              id="bill-taxable"
              type="number"
              min="0"
              step="0.01"
              value={taxable}
              onChange={(event) => setTaxable(event.target.value)}
            />
          </Field>
          <Field
            label="CGST (₹)"
            htmlFor="bill-cgst"
            hint="Leave blank if interstate"
          >
            <Input
              id="bill-cgst"
              type="number"
              min="0"
              step="0.01"
              value={cgst}
              onChange={(event) => setCgst(event.target.value)}
            />
          </Field>
          <Field label="SGST (₹)" htmlFor="bill-sgst">
            <Input
              id="bill-sgst"
              type="number"
              min="0"
              step="0.01"
              value={sgst}
              onChange={(event) => setSgst(event.target.value)}
            />
          </Field>
          <Field
            label="IGST (₹)"
            htmlFor="bill-igst"
            hint="Only for interstate"
          >
            <Input
              id="bill-igst"
              type="number"
              min="0"
              step="0.01"
              value={igst}
              onChange={(event) => setIgst(event.target.value)}
            />
          </Field>
        </FormRow>
      </div>
    </Modal>
  );
}
