"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";

import { Button } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Select, StatusPill, formatDay, formatMoney, humanise } from "@/components/service/kit";
import { setInvoiceStatus } from "@/server/actions/billing";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    billingAddress: string | null;
    gstNumber: string | null;
    email: string | null;
    phone: string | null;
  };
  site: { id: string; name: string; address: string | null } | null;
  lineItems: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }[];
};

const STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];

/**
 * One invoice, rendered as the document itself.
 *
 * PDF generation is `window.print()` against a print stylesheet rather than a
 * PDF library. The browser already has a typesetter and a PDF writer; adding a
 * second one would mean maintaining a layout that has to be kept in sync with
 * the one on screen, and getting it wrong on the copy the client receives.
 */
export function InvoiceDetailClient({
  invoice,
  issuerName,
  issuerAddress,
}: {
  invoice: Invoice;
  issuerName: string;
  issuerAddress: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function changeStatus(next: InvoiceStatus) {
    start(async () => {
      const result = await setInvoiceStatus(invoice.id, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              #invoice-sheet, #invoice-sheet * { visibility: visible; }
              #invoice-sheet {
                position: absolute; inset: 0; margin: 0;
                border: none; box-shadow: none; border-radius: 0;
                background: white; color: black;
              }
              @page { margin: 18mm; }
            }
          `,
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <Link
            href="/owner/billing"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Billing
          </Link>
          <h1 className="mt-2 font-mono text-[clamp(22px,2.4vw,30px)] font-semibold tracking-[-0.03em] text-text-primary">
            {invoice.invoiceNumber}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={invoice.status} />
            {invoice.paidAt ? (
              <span className="text-xs text-success">Paid {formatDay(invoice.paidAt)}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select
              value={invoice.status}
              onChange={(e) => changeStatus(e.currentTarget.value as InvoiceStatus)}
              disabled={pending}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanise(s)}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          id="invoice-sheet"
          className="mx-auto w-full max-w-3xl rounded-[20px] border border-border bg-surface p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                Invoice
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[-0.03em] text-text-primary">
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-semibold text-text-primary">{issuerName}</p>
              {issuerAddress ? (
                <p className="mt-1 whitespace-pre-wrap text-xs text-text-secondary">
                  {issuerAddress}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Bill to
              </p>
              <p className="mt-2 text-sm font-semibold text-text-primary">
                {invoice.customer.companyName ?? invoice.customer.name}
              </p>
              {invoice.customer.billingAddress ? (
                <p className="mt-1 whitespace-pre-wrap text-xs text-text-secondary">
                  {invoice.customer.billingAddress}
                </p>
              ) : null}
              {invoice.customer.gstNumber ? (
                <p className="mt-1 text-xs text-text-secondary">GST {invoice.customer.gstNumber}</p>
              ) : null}
              {invoice.site ? (
                <p className="mt-2 text-xs text-text-secondary">Site: {invoice.site.name}</p>
              ) : null}
            </div>
            <div className="sm:text-right">
              <Meta label="Issued" value={formatDay(invoice.issueDate)} />
              <Meta label="Due" value={formatDay(invoice.dueDate)} />
              <Meta label="Status" value={humanise(invoice.status)} />
            </div>
          </div>

          <table className="mt-8 w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Tax</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.lineItems.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 pr-3 text-text-primary">{l.description}</td>
                  <td className="py-2.5 text-right font-mono text-text-secondary">{l.quantity}</td>
                  <td className="py-2.5 text-right font-mono text-text-secondary">
                    {formatMoney(l.unitPrice)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-text-secondary">
                    {l.taxRate ? `${l.taxRate}%` : "—"}
                  </td>
                  <td className="py-2.5 text-right font-mono text-text-primary">
                    {formatMoney(l.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-1">
              <Total label="Subtotal" value={invoice.subtotal} />
              <Total label="Tax" value={invoice.taxAmount} />
              <div className="border-t border-border pt-2">
                <Total label="Total" value={invoice.total} strong />
              </div>
            </div>
          </div>

          {invoice.notes ? (
            <div className="mt-8 border-t border-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Notes
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-text-secondary">
                {invoice.notes}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-text-secondary">
      <span className="text-text-tertiary">{label}: </span>
      {value}
    </p>
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span
        className={
          strong
            ? "font-mono text-base font-bold text-text-primary"
            : "font-mono text-sm text-text-secondary"
        }
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
