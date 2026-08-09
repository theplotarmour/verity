"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import type { InvoiceStatus, PayrollStatus } from "@prisma/client";

import { PageHeader } from "@/components/design/PageHeader";
import { Button, EmptyState, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  Field,
  FilterPills,
  FormGrid,
  OptionalSelect,
  Select,
  Stat,
  StatStrip,
  StatusPill,
  TextArea,
  formatDay,
  formatMoney,
  humanise,
} from "@/components/service/kit";
import {
  buildInvoiceFromWork,
  createInvoice,
  deleteInvoice,
  exportPayrollCsv,
  generatePayrollInputs,
  setInvoiceStatus,
  setPayrollStatus,
} from "@/server/actions/billing";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  siteId: string | null;
  siteName: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAt: string | null;
  notes: string | null;
  lineCount: number;
  overdue: boolean;
};

type PayrollRow = {
  id: string;
  userId: string;
  userName: string;
  periodStart: string;
  periodEnd: string;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;
  totalHours: number;
  status: PayrollStatus;
  exportedAt: string | null;
  notes: string | null;
};

type Line = { description: string; quantity: string; unitPrice: string; taxRate: string };

const INVOICE_STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];
const PAYROLL_STATUSES: PayrollStatus[] = ["DRAFT", "FINALISED", "EXPORTED"];
const BLANK_LINE: Line = { description: "", quantity: "1", unitPrice: "", taxRate: "0" };

function monthBounds() {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) };
}

/**
 * Billing, in two tabs.
 *
 * Invoices bill the client; payroll inputs summarise what to pay staff. They
 * share a screen because they are the same act from two sides — turning work
 * that already happened into money — and both draw from the same operational
 * records rather than from anything typed twice.
 */
export function BillingClient({
  invoices,
  payroll,
  customers,
  sites,
  stats,
}: {
  invoices: InvoiceRow[];
  payroll: PayrollRow[];
  customers: { id: string; name: string; companyName?: string | null }[];
  sites: { id: string; name: string; siteCode: string }[];
  stats: { draft: number; outstanding: number; overdue: number; paidThisMonth: number } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"Invoices" | "Payroll">("Invoices");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [creating, setCreating] = useState(false);
  const [building, setBuilding] = useState(false);

  const bounds = monthBounds();
  const [form, setForm] = useState({
    customerId: "",
    siteId: "",
    dueDate: "",
    notes: "",
    lines: [{ ...BLANK_LINE }] as Line[],
  });
  const [buildForm, setBuildForm] = useState({
    customerId: "",
    siteId: "",
    periodStart: bounds.start,
    periodEnd: bounds.end,
  });
  const [period, setPeriod] = useState({ start: bounds.start, end: bounds.end });

  const shownInvoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((i) => {
      if (status && i.status !== status) return false;
      if (!q) return true;
      return [i.invoiceNumber, i.customerName, i.siteName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [invoices, query, status]);

  const draftTotals = useMemo(() => {
    const subtotal = form.lines.reduce(
      (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
      0,
    );
    const tax = form.lines.reduce((sum, l) => {
      const amount = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      return sum + (amount * (Number(l.taxRate) || 0)) / 100;
    }, 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [form.lines]);

  function run(action: () => Promise<{ error?: string }>, done?: string) {
    start(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (done) toast.success(done);
      router.refresh();
    });
  }

  function setLine(index: number, patch: Partial<Line>) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));
  }

  function submitInvoice() {
    if (!form.customerId) {
      toast.error("Pick a customer.");
      return;
    }
    const lineItems = form.lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description,
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        taxRate: Number(l.taxRate) || 0,
      }));
    if (lineItems.length === 0) {
      toast.error("Add at least one line item.");
      return;
    }

    start(async () => {
      const result = await createInvoice({
        customerId: form.customerId,
        siteId: form.siteId || null,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        lineItems,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice drafted.");
      setCreating(false);
      setForm({ customerId: "", siteId: "", dueDate: "", notes: "", lines: [{ ...BLANK_LINE }] });
      router.refresh();
    });
  }

  function submitBuild() {
    if (!buildForm.customerId) {
      toast.error("Pick a customer.");
      return;
    }
    start(async () => {
      const result = await buildInvoiceFromWork({
        customerId: buildForm.customerId,
        siteId: buildForm.siteId || null,
        periodStart: buildForm.periodStart,
        periodEnd: buildForm.periodEnd,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice drafted from completed work.");
      setBuilding(false);
      router.refresh();
    });
  }

  async function removeInvoice(row: InvoiceRow) {
    const ok = await confirmDialog({
      title: `Delete ${row.invoiceNumber}?`,
      description: "Only a draft can be deleted. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) run(() => deleteInvoice(row.id), "Invoice deleted.");
  }

  function generate() {
    start(async () => {
      const result = await generatePayrollInputs({
        periodStart: period.start,
        periodEnd: period.end,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      const written = "written" in result ? (result.written ?? 0) : 0;
      const skipped = "skipped" in result ? (result.skipped ?? 0) : 0;
      toast.success(
        skipped > 0
          ? `${written} summarised, ${skipped} left alone (already finalised).`
          : `${written} employees summarised.`,
      );
      router.refresh();
    });
  }

  function exportCsv() {
    start(async () => {
      const result = await exportPayrollCsv({
        periodStart: period.start,
        periodEnd: period.end,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if (!("csv" in result) || !result.csv) return;

      // Built and downloaded in the browser: the CSV is already in hand from
      // the action, and a round trip through a route handler would only give
      // it a second chance to disagree with what was marked exported.
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename ?? "payroll.csv";
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success("Exported.");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        eyebrow="Finance"
        title="Billing"
        description="Invoices out to clients, and payroll inputs from attendance and timesheets."
        actions={
          tab === "Invoices" ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBuilding(true)}>
                <Sparkles className="h-3.5 w-3.5" />
                From work
              </Button>
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                New invoice
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={generate} disabled={pending}>
                Recompute period
              </Button>
              <Button onClick={exportCsv} disabled={pending}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          )
        }
      />

      {stats ? (
        <StatStrip>
          <Stat label="Drafts" value={stats.draft} />
          <Stat label="Outstanding" value={formatMoney(stats.outstanding)} tone="warning" />
          <Stat label="Overdue" value={stats.overdue} tone={stats.overdue ? "danger" : "success"} />
          <Stat label="Paid this month" value={formatMoney(stats.paidThisMonth)} tone="success" />
        </StatStrip>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(["Invoices", "Payroll"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "rounded-full border border-transparent bg-[var(--brand)] px-3 py-1.5 text-[11px] font-semibold text-white"
                  : "rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
              }
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Invoices" ? (
          <div className="flex flex-wrap items-center gap-3">
            <FilterPills options={INVOICE_STATUSES} value={status} onChange={setStatus} />
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="Search invoices..."
                className="pl-9"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Field label="From">
              <Input
                type="date"
                value={period.start}
                onChange={(e) => setPeriod({ ...period, start: e.currentTarget.value })}
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={period.end}
                onChange={(e) => setPeriod({ ...period, end: e.currentTarget.value })}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] border border-border bg-surface">
        {tab === "Invoices" ? (
          shownInvoices.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No invoices"
                description={
                  invoices.length === 0
                    ? "Draft one by hand, or build one from completed work."
                    : "No invoice matches that filter."
                }
              />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
                <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shownInvoices.map((i) => (
                  <tr key={i.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link href={`/owner/billing/${i.id}`} className="block min-w-0">
                        <span className="block font-mono text-xs font-semibold text-text-primary">
                          {i.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-text-tertiary">
                          {i.lineCount} line{i.lineCount === 1 ? "" : "s"}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <span className="block truncate">{i.customerName}</span>
                      {i.siteName ? (
                        <span className="block truncate text-[11px] text-text-tertiary">
                          {i.siteName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDay(i.issueDate)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          i.overdue ? "text-xs font-semibold text-danger" : "text-xs text-text-secondary"
                        }
                      >
                        {formatDay(i.dueDate)}
                        {i.overdue ? " · overdue" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-text-primary">
                      {formatMoney(i.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-32">
                        <Select
                          value={i.status}
                          onChange={(e) =>
                            run(
                              () => setInvoiceStatus(i.id, e.currentTarget.value as InvoiceStatus),
                              "Status updated.",
                            )
                          }
                        >
                          {INVOICE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {humanise(s)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.status === "DRAFT" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => removeInvoice(i)}
                          disabled={pending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : payroll.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No payroll inputs"
              description="Pick a period and press Recompute to summarise attendance and hours."
            />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Present</th>
                <th className="px-4 py-3 text-right">Absent</th>
                <th className="px-4 py-3 text-right">Leave</th>
                <th className="px-4 py-3 text-right">OT hrs</th>
                <th className="px-4 py-3 text-right">Total hrs</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payroll.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-surface-2/60">
                  <td className="px-4 py-3 font-medium text-text-primary">{p.userName}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatDay(p.periodStart)} — {formatDay(p.periodEnd)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-primary">
                    {p.presentDays}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary">
                    {p.absentDays}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary">
                    {p.leaveDays}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary">
                    {p.overtimeHours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-primary">
                    {p.totalHours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-32">
                      <Select
                        value={p.status}
                        onChange={(e) =>
                          run(
                            () => setPayrollStatus(p.id, e.currentTarget.value as PayrollStatus),
                            "Updated.",
                          )
                        }
                      >
                        {PAYROLL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {humanise(s)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual invoice */}
      <Dialog isOpen={creating} onClose={() => setCreating(false)} className="max-w-3xl">
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          New invoice
        </h2>
        <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <FormGrid>
            <Field label="Client">
              <OptionalSelect
                value={form.customerId}
                onChange={(v) => setForm({ ...form, customerId: v })}
                placeholder="Pick a client"
                options={customers.map((c) => ({ value: c.id, label: c.companyName ?? c.name }))}
              />
            </Field>
            <Field label="Site">
              <OptionalSelect
                value={form.siteId}
                onChange={(v) => setForm({ ...form, siteId: v })}
                placeholder="No site"
                disabled={sites.length === 0}
                options={sites.map((s) => ({ value: s.id, label: `${s.name} (${s.siteCode})` }))}
              />
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.currentTarget.value })}
              />
            </Field>
          </FormGrid>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Line items
            </p>
            <div className="space-y-2">
              {form.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-5">
                    <Input
                      value={line.description}
                      onChange={(e) => setLine(index, { description: e.currentTarget.value })}
                      placeholder="Description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => setLine(index, { quantity: e.currentTarget.value })}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => setLine(index, { unitPrice: e.currentTarget.value })}
                      placeholder="Rate"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.taxRate}
                      onChange={(e) => setLine(index, { taxRate: e.currentTarget.value })}
                      placeholder="Tax %"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-danger"
                      disabled={form.lines.length === 1}
                      onClick={() =>
                        setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, { ...BLANK_LINE }] }))}
            >
              <Plus className="h-3.5 w-3.5" />
              Add line
            </Button>
          </div>

          <Field label="Notes">
            <TextArea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })}
            />
          </Field>

          <div className="rounded-[12px] border border-border bg-surface-2 p-3 text-sm">
            <Row label="Subtotal" value={formatMoney(draftTotals.subtotal)} />
            <Row label="Tax" value={formatMoney(draftTotals.tax)} />
            <Row label="Total" value={formatMoney(draftTotals.total)} strong />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreating(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submitInvoice} disabled={pending}>
            {pending ? "Saving..." : "Create draft"}
          </Button>
        </div>
      </Dialog>

      {/* Build from work */}
      <Dialog isOpen={building} onClose={() => setBuilding(false)}>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          Draft from completed work
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Pulls completed work orders and approved billable hours in the period into a draft
          invoice. Nothing is sent — review the lines and prices first.
        </p>
        <div className="mt-5 space-y-4">
          <FormGrid>
            <Field label="Client">
              <OptionalSelect
                value={buildForm.customerId}
                onChange={(v) => setBuildForm({ ...buildForm, customerId: v })}
                placeholder="Pick a client"
                options={customers.map((c) => ({ value: c.id, label: c.companyName ?? c.name }))}
              />
            </Field>
            <Field label="Site" hint="Leave blank for every site.">
              <OptionalSelect
                value={buildForm.siteId}
                onChange={(v) => setBuildForm({ ...buildForm, siteId: v })}
                placeholder="All sites"
                disabled={sites.length === 0}
                options={sites.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
            <Field label="From">
              <Input
                type="date"
                value={buildForm.periodStart}
                onChange={(e) => setBuildForm({ ...buildForm, periodStart: e.currentTarget.value })}
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={buildForm.periodEnd}
                onChange={(e) => setBuildForm({ ...buildForm, periodEnd: e.currentTarget.value })}
              />
            </Field>
          </FormGrid>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setBuilding(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submitBuild} disabled={pending}>
            {pending ? "Building..." : "Build draft"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span
        className={
          strong
            ? "font-mono text-sm font-bold text-text-primary"
            : "font-mono text-sm text-text-secondary"
        }
      >
        {value}
      </span>
    </div>
  );
}
