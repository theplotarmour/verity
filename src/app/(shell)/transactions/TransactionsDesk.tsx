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

type Payment = {
  id: string;
  direction: "in" | "out";
  partyId: string;
  partyName: string;
  partySide: "customer" | "supplier";
  method: string;
  reference: string | null;
  amountPaise: number;
  allocatedPaise: number;
  receivedAt: Date | string;
  settled: string[];
};

type Party = { id: string; displayName: string };

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function shortDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
};

/**
 * The cash book.
 *
 * One list, both directions, newest first — because the question a proprietor
 * asks at the end of a day is "what money moved today", not "what happened with
 * Sharma Timber". The per-party view is a click away on the name.
 *
 * Money in is shown as received FROM someone and money out as sent TO someone,
 * in those words. A column headed "Debit" makes the reader work out the
 * direction from a sign convention they never agreed to.
 */
export function TransactionsDesk({
  payments,
  customers,
  suppliers,
}: {
  payments: Payment[];
  customers: Party[];
  suppliers: Party[];
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [recording, setRecording] = useState<"in" | "out" | null>(null);
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();

  function record(input: unknown) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.plywood.record_party_payment",
        input,
        "/transactions",
      );
      if (result.ok) {
        setRecording(null);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return payments;
    return payments.filter(
      (payment) =>
        payment.partyName.toLowerCase().includes(needle) ||
        (payment.reference ?? "").toLowerCase().includes(needle) ||
        payment.settled.some((number) =>
          number.toLowerCase().includes(needle),
        ),
    );
  }, [payments, filter]);

  const totals = useMemo(
    () => ({
      in: payments
        .filter((payment) => payment.direction === "in")
        .reduce((sum, payment) => sum + payment.amountPaise, 0),
      out: payments
        .filter((payment) => payment.direction === "out")
        .reduce((sum, payment) => sum + payment.amountPaise, 0),
    }),
    [payments],
  );

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

      <StatRow cols={3}>
        <Stat
          label="Money received"
          value={rupees(totals.in)}
          hint="From customers, all time"
        />
        <Stat
          label="Money sent"
          value={rupees(totals.out)}
          hint="To suppliers, all time"
        />
        <Stat
          label="Net"
          value={rupees(totals.in - totals.out)}
          hint="Received less sent"
        />
      </StatRow>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="primary" onClick={() => setRecording("in")}>
          We received money
        </Button>
        <Button onClick={() => setRecording("out")}>We sent money</Button>
      </div>

      <Panel
        flush={shown.length === 0}
        title="All payments"
        action={
          <div className="w-56">
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Name, reference or invoice"
              aria-label="Filter payments"
            />
          </div>
        }
      >
        {shown.length === 0 ? (
          <EmptyState
            compact
            title={
              payments.length === 0
                ? "No payments recorded yet"
                : "Nothing matches that"
            }
            description={
              payments.length === 0
                ? "Every rupee in and out is entered here, and only here."
                : undefined
            }
          />
        ) : (
          <div className="-mx-3 overflow-x-auto px-3">
            <table className="w-full min-w-[820px] border-collapse">
              <caption className="sr-only">
                Payments received and sent, newest first
              </caption>
              <thead>
                <tr>
                  {["Date", "What happened", "How", "Amount", "Settled"].map(
                    (heading, index) => (
                      <th
                        key={heading}
                        className={
                          "whitespace-nowrap border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                          (index >= 3 ? "text-right" : "text-left")
                        }
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {shown.map((payment) => {
                  const unallocated =
                    payment.amountPaise - payment.allocatedPaise;
                  return (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap border-b border-line px-3 py-2 text-[13px] text-text-secondary">
                        {shortDate(payment.receivedAt)}
                      </td>
                      <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                        {/* The sentence, not a sign. */}
                        {payment.direction === "in"
                          ? "Received from "
                          : "Sent to "}
                        <Link
                          href={
                            payment.partySide === "customer"
                              ? `/ledgers?customer=${payment.partyId}`
                              : `/ledgers?supplier=${payment.partyId}`
                          }
                          className="text-text no-underline hover:underline"
                        >
                          {payment.partyName}
                        </Link>
                        {payment.reference && (
                          <span className="mt-0.5 block text-[12px] text-text-tertiary">
                            {payment.reference}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-2 text-[13px] text-text-secondary">
                        {METHOD_LABEL[payment.method] ?? payment.method}
                      </td>
                      <td
                        className={
                          "tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] " +
                          (payment.direction === "in"
                            ? "text-success"
                            : "text-text")
                        }
                      >
                        {payment.direction === "in" ? "+" : "−"}
                        {rupees(payment.amountPaise)}
                      </td>
                      <td className="border-b border-line px-3 py-2 text-right text-[12px] text-text-tertiary">
                        {payment.settled.length > 0 && (
                          <span className="block">
                            {payment.settled.join(", ")}
                          </span>
                        )}
                        {unallocated > 0 && (
                          // "On account" is accountant's language. What it
                          // means to a merchant is that this much of the money
                          // is not against any bill yet.
                          <Badge tone="accent">
                            {rupees(unallocated)}{" "}
                            {payment.direction === "in"
                              ? "paid in advance"
                              : "advance to them"}
                          </Badge>
                        )}
                        {payment.settled.length === 0 && unallocated === 0 && "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <RecordPaymentModal
        direction={recording}
        customers={customers}
        suppliers={suppliers}
        pending={pending}
        onClose={() => setRecording(null)}
        onSubmit={record}
      />
    </div>
  );
}

/**
 * Recording that money moved.
 *
 * The direction is chosen before the dialog opens, by which button was pressed,
 * so the form never asks "in or out?" — a question whose wrong answer silently
 * reverses a balance. What it asks is who, how much and how.
 *
 * Which side the party is on is still a real choice: money can come back from a
 * supplier and go out to a customer, and a form that only allowed
 * customer-in/supplier-out would make a refund unrecordable.
 */
function RecordPaymentModal({
  direction,
  customers,
  suppliers,
  pending,
  onClose,
  onSubmit,
}: {
  direction: "in" | "out" | null;
  customers: Party[];
  suppliers: Party[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: unknown) => void;
}) {
  const [side, setSide] = useState<"customer" | "supplier">("customer");
  const [partyId, setPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [reference, setReference] = useState("");
  const [when, setWhen] = useState("");

  const parsed = Number.parseFloat(amount);
  const canSave = partyId !== "" && Number.isFinite(parsed) && parsed > 0;
  const parties = side === "customer" ? customers : suppliers;

  // The ordinary case for each direction, offered first: money in is usually
  // from a customer, money out usually to a supplier.
  const effectiveSide = direction === "out" && side === "customer" && partyId === ""
    ? "supplier"
    : side;

  return (
    <Modal
      open={direction !== null}
      onClose={onClose}
      title={direction === "in" ? "We received money" : "We sent money"}
      description={
        direction === "in"
          ? "It clears their oldest open invoices first. Anything left over stays on their account as an advance."
          : "It clears the oldest bills we owe first. Anything left over stays with them as an advance."
      }
      footer={
        <>
          <ModalCancel onClose={onClose} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || !canSave}
            onClick={() => {
              onSubmit({
                party:
                  effectiveSide === "customer"
                    ? { customerId: partyId }
                    : { supplierId: partyId },
                direction,
                amountPaise: Math.round(parsed * 100),
                method,
                ...(reference.trim() ? { reference: reference.trim() } : {}),
                ...(when ? { receivedAt: new Date(when).toISOString() } : {}),
              });
              setPartyId("");
              setAmount("");
              setReference("");
              setWhen("");
            }}
          >
            {pending ? "Recording…" : "Record"}
          </Button>
        </>
      }
    >
      <FormRow columns="150px minmax(0,1.4fr) 150px">
        <Field label="Who with" htmlFor="tx-side" required>
          <Combobox
            id="tx-side"
            value={effectiveSide}
            onChange={(value) => {
              setSide(value as "customer" | "supplier");
              setPartyId("");
            }}
            required
            options={[
              { value: "customer", label: "A customer" },
              { value: "supplier", label: "A supplier" },
            ]}
          />
        </Field>
        <Field
          label={effectiveSide === "customer" ? "Customer" : "Supplier"}
          htmlFor="tx-party"
          required
        >
          <Combobox
            id="tx-party"
            value={partyId}
            onChange={setPartyId}
            required
            placeholder="Search"
            options={parties.map((row) => ({
              value: row.id,
              label: row.displayName,
            }))}
          />
        </Field>
        <Field label="Amount (₹)" htmlFor="tx-amount" required>
          <Input
            id="tx-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field label="How" htmlFor="tx-method" required>
          <Combobox
            id="tx-method"
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
          htmlFor="tx-reference"
          hint="UTR, UPI id or cheque number"
        >
          <Input
            id="tx-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </Field>
        <Field label="When" htmlFor="tx-when" hint="Blank means now">
          <Input
            id="tx-when"
            type="date"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
          />
        </Field>
      </FormRow>
    </Modal>
  );
}
