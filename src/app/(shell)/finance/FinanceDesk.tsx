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
  oldestOpenAt: Date | string | null;
  provisionalBills: number;
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
  customers,
  suppliers,
  unbilledSales,
  unbilledPurchases,
}: {
  invoices: Invoice[];
  balances: Balance[];
  customers: Array<{ id: string; displayName: string }>;
  suppliers: Array<{ id: string; displayName: string }>;
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
  const [payment, setPayment] = useState<
    | { side: "customer" | "supplier"; partyId: string; partyName: string }
    | null
  >(null);
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
      owedToUs: receivable.reduce(
        (sum, row) => sum + row.outstandingPaise - row.onAccountPaise,
        0,
      ),
      owedByUs: payable.reduce(
        (sum, row) =>
          sum + row.outstandingPaise + row.uninvoicedPaise - row.onAccountPaise,
        0,
      ),
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
          label="Owed to us"
          value={rupees(totals.owedToUs)}
          hint="Customers, net of anything paid in advance"
        />
        <Stat
          label="We owe"
          value={rupees(totals.owedByUs)}
          hint="Suppliers, including goods received not yet billed"
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
                    run("verity.plywood.raise_purchase_invoice", {
                      purchaseOrderId: order.id,
                      supplierInvoiceTotalPaise: order.valuePaise,
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

      <BalanceTable
        title="Customers owe us"
        emptyTitle="Nobody owes anything"
        emptyDescription="A delivery raises the invoice, and it appears here until it is paid."
        rows={receivable}
        pending={pending}
        actionLabel="Record money received"
        onAct={(row) =>
          setPayment({
            side: "customer",
            partyId: row.partyId,
            partyName: row.partyName,
          })
        }
      />

      <BalanceTable
        title="We owe suppliers"
        emptyTitle="Nothing owed to suppliers"
        emptyDescription="Receiving a delivery raises the supplier's bill, and it appears here until it is paid."
        rows={payable}
        pending={pending}
        actionLabel="Record payment made"
        onAct={(row) =>
          setPayment({
            side: "supplier",
            partyId: row.partyId,
            partyName: row.partyName,
          })
        }
      />

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
                  <tr key={invoice.id}>
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

      <RecordPaymentModal
        party={payment}
        customers={customers}
        suppliers={suppliers}
        pending={pending}
        onClose={() => setPayment(null)}
        onSubmit={(input) =>
          run("verity.plywood.record_party_payment", input, () =>
            setPayment(null),
          )
        }
      />

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
 * One side of the ledger.
 *
 * `Not yet billed` is its own column rather than folded into the outstanding
 * figure. Goods received against a part-delivered order are genuinely owed for,
 * but no document exists, and a single total that hid the difference would be a
 * number the business could not reconcile against any piece of paper.
 */
function BalanceTable({
  title,
  emptyTitle,
  emptyDescription,
  rows,
  pending,
  actionLabel,
  onAct,
}: {
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  rows: Balance[];
  pending: boolean;
  actionLabel: string;
  onAct: (row: Balance) => void;
}) {
  const supplierSide = rows.some((row) => row.side === "supplier");

  return (
    <Panel title={title} flush={rows.length === 0}>
      {rows.length === 0 ? (
        <EmptyState
          compact
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="-mx-3 overflow-x-auto px-3">
          <table className="w-full min-w-[720px] border-collapse">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {[
                  "Party",
                  "Billed",
                  "Settled",
                  ...(supplierSide ? ["Not yet billed"] : []),
                  "On account",
                  "Outstanding",
                  "",
                ].map((heading, index) => (
                  <th
                    key={heading || index}
                    className={
                      "whitespace-nowrap border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                      (index === 0 ? "text-left" : "text-right")
                    }
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const age = daysSince(row.oldestOpenAt);
                return (
                  <tr key={row.partyId}>
                    <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                      <Link
                        href={
                          row.side === "customer"
                            ? `/customers/${row.partyId}`
                            : `/suppliers/${row.partyId}`
                        }
                        className="text-text no-underline hover:underline"
                      >
                        {row.partyName}
                      </Link>
                      {age !== null && age > 30 && (
                        <span className="mt-0.5 block text-[12px] text-warning">
                          Oldest unpaid {age} days
                        </span>
                      )}
                      {row.provisionalBills > 0 && (
                        <span className="mt-0.5 block text-[12px] text-text-tertiary">
                          {row.provisionalBills === 1
                            ? "1 bill awaiting their document"
                            : `${row.provisionalBills} bills awaiting their document`}
                        </span>
                      )}
                    </td>
                    <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] text-text-secondary">
                      {rupees(row.invoicedPaise)}
                    </td>
                    <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] text-text-secondary">
                      {rupees(row.settledPaise)}
                    </td>
                    {supplierSide && (
                      <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] text-text-secondary">
                        {row.uninvoicedPaise === 0
                          ? "—"
                          : rupees(row.uninvoicedPaise)}
                      </td>
                    )}
                    <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px]">
                      {row.onAccountPaise === 0 ? (
                        "—"
                      ) : (
                        <Badge tone="accent">
                          {rupees(row.onAccountPaise)}
                        </Badge>
                      )}
                    </td>
                    <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] text-text">
                      {rupees(row.outstandingPaise + row.uninvoicedPaise)}
                    </td>
                    <td className="border-b border-line px-3 py-2 text-right">
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => onAct(row)}
                      >
                        {actionLabel}
                      </Button>
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

/**
 * Money moved.
 *
 * TASK 71 ITEM 11, as asked for: did it come in or go out, whose money was it,
 * how much, and by what means. Nothing about invoices — the allocation happens
 * on the server, oldest first, and anything left over sits on the party's
 * account as an advance rather than being refused.
 *
 * Opened from a row, so the party and the direction are already right. It can
 * also be opened cold, which is why both pickers are here: a refund to a
 * customer is money OUT against a customer, and the person recording it should
 * not have to find a different screen to say so.
 */
function RecordPaymentModal({
  party,
  customers,
  suppliers,
  pending,
  onClose,
  onSubmit,
}: {
  party:
    | { side: "customer" | "supplier"; partyId: string; partyName: string }
    | null;
  customers: Array<{ id: string; displayName: string }>;
  suppliers: Array<{ id: string; displayName: string }>;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: unknown) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [reference, setReference] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [partyId, setPartyId] = useState("");

  // Opening from a row pre-answers both questions, so the state is seeded from
  // the row each time the modal opens rather than held independently of it.
  const side = party?.side ?? "customer";
  const effectivePartyId = party?.partyId ?? partyId;
  const effectiveDirection = party ? (side === "customer" ? "in" : "out") : direction;

  const parsed = Number.parseFloat(amount);
  const canSave =
    effectivePartyId !== "" && Number.isFinite(parsed) && parsed > 0;

  return (
    <Modal
      open={party !== null}
      onClose={onClose}
      title={
        party
          ? side === "customer"
            ? `Money received from ${party.partyName}`
            : `Payment made to ${party.partyName}`
          : "Record a payment"
      }
      description="It settles the oldest open documents first. Anything left over stays on their account as an advance."
      footer={
        <>
          <ModalCancel onClose={onClose} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || !canSave}
            onClick={() => {
              onSubmit({
                party:
                  side === "customer"
                    ? { customerId: effectivePartyId }
                    : { supplierId: effectivePartyId },
                direction: effectiveDirection,
                amountPaise: Math.round(parsed * 100),
                method,
                ...(reference.trim() ? { reference: reference.trim() } : {}),
              });
              setAmount("");
              setReference("");
            }}
          >
            {pending ? "Recording…" : "Record"}
          </Button>
        </>
      }
    >
      <FormRow columns="minmax(0,1fr) 150px minmax(0,1fr)">
        {!party && (
          <Field
            label={side === "customer" ? "Customer" : "Supplier"}
            htmlFor="pay-party"
            required
          >
            <Combobox
              id="pay-party"
              value={partyId}
              onChange={setPartyId}
              required
              placeholder="Search"
              options={(side === "customer" ? customers : suppliers).map(
                (row) => ({ value: row.id, label: row.displayName }),
              )}
            />
          </Field>
        )}
        <Field label="Amount (₹)" htmlFor="pay-amount" required>
          <Input
            id="pay-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus
          />
        </Field>
        <Field label="How" htmlFor="pay-method" required>
          <Combobox
            id="pay-method"
            value={method}
            onChange={setMethod}
            required
            options={[
              { value: "cash", label: "Cash" },
              { value: "bank", label: "Bank transfer" },
              { value: "upi", label: "UPI" },
              { value: "cheque", label: "Cheque" },
            ]}
          />
        </Field>
        <Field
          label="Reference"
          htmlFor="pay-reference"
          hint="UTR, UPI id or cheque number"
        >
          <Input
            id="pay-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </Field>
        {!party && (
          <Field label="Direction" htmlFor="pay-direction" required>
            <Combobox
              id="pay-direction"
              value={direction}
              onChange={(value) => setDirection(value as "in" | "out")}
              required
              options={[
                { value: "in", label: "Money received" },
                { value: "out", label: "Money paid" },
              ]}
            />
          </Field>
        )}
      </FormRow>
    </Modal>
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
