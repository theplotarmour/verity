"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Download, Printer, ExternalLink, FileCheck2, Calendar } from "lucide-react";
import { getReportsData } from "@/server/actions/reports";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Metric } from "@/components/design/Metric";
import { Badge, Button, Input } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import dayjs from "dayjs";

type Tab = "overview" | "production" | "employees" | "orders" | "dispatch" | "quality" | "inventory" | "passports";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "production", label: "Production" },
  { id: "employees", label: "Employees" },
  { id: "orders", label: "Orders" },
  { id: "dispatch", label: "Dispatch" },
  { id: "quality", label: "Quality" },
  { id: "inventory", label: "Inventory" },
  { id: "passports", label: "Passports" },
];

function download(name: string, rows: any[]) {
  if (!rows || rows.length === 0) return;
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

const th = "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary";
const td = "px-4 py-2.5 text-sm";

export function ReportsPackClient({ initialData, passports }: { initialData: any; passports: any[] }) {
  const [data, setData] = useState<any>(initialData);
  const [tab, setTab] = useState<Tab>("overview");
  const [from, setFrom] = useState<string>(initialData?.range?.from ?? dayjs().subtract(30, "day").format("YYYY-MM-DD"));
  const [to, setTo] = useState<string>(initialData?.range?.to ?? dayjs().format("YYYY-MM-DD"));
  const [pending, start] = useTransition();

  const apply = () => start(async () => { const d = await getReportsData(from, to); setData(d); });

  const q = data?.quality ?? {};
  const inv = data?.inventory?.summary ?? {};
  const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Reports"
        title="Factory Reports"
        description="Production, quality, inventory and dispatch reporting with CSV export."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-[12px] border border-border bg-surface px-3 py-1.5">
              <Calendar className="h-4 w-4 text-text-tertiary" />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none" />
              <span className="text-text-tertiary">→</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none" />
            </div>
            <Button onClick={apply} disabled={pending} className="h-10">{pending ? "Loading…" : "Apply"}</Button>
            <Button variant="secondary" className="h-10 gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
          </div>
        }
      />

      <div className="flex items-center gap-5 overflow-x-auto border-b border-border px-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap pb-3 text-sm font-semibold transition-colors ${tab === t.id ? "border-b-2 border-brand text-brand" : "text-text-secondary hover:text-text-primary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Metric label="Units produced" value={String(Math.round(data?.production?.totalUnits ?? 0))} detail={`${data?.production?.totalCards ?? 0} cards done`} tone="green" />
          <Metric label="QC pass rate" value={q.passRate === null || q.passRate === undefined ? "—" : `${q.passRate}%`} detail={`${q.pass ?? 0}/${q.total ?? 0} checks`} tone="blue" />
          <Metric label="Raw stock value" value={fmt(inv.rawValue)} detail="At latest cost" tone="amber" />
          <Metric label="Low-stock items" value={String(inv.lowStockCount ?? 0)} detail="At/under minimum" tone="red" />
        </section>
      )}

      {tab === "production" && (
        <ReportBlock title="Daily production" onExport={() => download(`production_${from}_${to}.csv`, data?.production?.daily ?? [])} empty={(data?.production?.daily ?? []).length === 0}>
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-border"><th className={th}>Date</th><th className={`${th} text-right`}>Cards completed</th><th className={`${th} text-right`}>Units</th></tr></thead>
            <tbody className="divide-y divide-border/70">
              {(data?.production?.daily ?? []).map((r: any) => (
                <tr key={r.date}><td className={`${td} text-text-primary`}>{r.date}</td><td className={`${td} text-right`}>{r.cards}</td><td className={`${td} text-right font-semibold`}>{r.units}</td></tr>
              ))}
            </tbody>
          </table>
        </ReportBlock>
      )}

      {tab === "employees" && (
        <ReportBlock title="Employee productivity" onExport={() => download(`employees_${from}_${to}.csv`, data?.employees ?? [])} empty={(data?.employees ?? []).length === 0}>
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-border"><th className={th}>Employee</th><th className={`${th} text-right`}>Completed</th><th className={`${th} text-right`}>Rework</th><th className={`${th} text-right`}>Hours</th></tr></thead>
            <tbody className="divide-y divide-border/70">
              {(data?.employees ?? []).map((e: any, i: number) => (
                <tr key={i}><td className={`${td} font-semibold text-text-primary`}>{e.name}</td><td className={`${td} text-right`}>{e.completed}</td><td className={`${td} text-right ${e.rework > 0 ? "text-danger" : ""}`}>{e.rework}</td><td className={`${td} text-right`}>{(e.minutes / 60).toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
        </ReportBlock>
      )}

      {tab === "orders" && (
        <div className="space-y-4">
          <ReportBlock title={`Pending orders (${(data?.orders?.pending ?? []).length})`} onExport={() => download(`pending_orders_${to}.csv`, data?.orders?.pending ?? [])} empty={(data?.orders?.pending ?? []).length === 0}>
            <OrdersTable rows={data?.orders?.pending ?? []} />
          </ReportBlock>
          <ReportBlock title={`Completed orders (${(data?.orders?.completed ?? []).length})`} onExport={() => download(`completed_orders_${from}_${to}.csv`, data?.orders?.completed ?? [])} empty={(data?.orders?.completed ?? []).length === 0}>
            <OrdersTable rows={data?.orders?.completed ?? []} />
          </ReportBlock>
        </div>
      )}

      {tab === "dispatch" && (
        <ReportBlock title="Dispatch report" onExport={() => download(`dispatch_${from}_${to}.csv`, data?.dispatch ?? [])} empty={(data?.dispatch ?? []).length === 0}>
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-border"><th className={th}>Order</th><th className={th}>Destination</th><th className={th}>Transporter</th><th className={th}>Status</th><th className={th}>Dispatched</th><th className={th}>Delivered</th></tr></thead>
            <tbody className="divide-y divide-border/70">
              {(data?.dispatch ?? []).map((d: any, i: number) => (
                <tr key={i}>
                  <td className={`${td} font-semibold text-text-primary`}>{d.soNumber}</td>
                  <td className={`${td} text-text-secondary`}>{d.destination}</td>
                  <td className={`${td} text-text-secondary`}>{d.transporter}</td>
                  <td className={td}><Badge className={d.status === "DELIVERED" ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}>{d.status.replace("_", " ")}</Badge></td>
                  <td className={`${td} text-text-secondary`}>{dayjs(d.dispatchedAt).format("MMM D")}</td>
                  <td className={`${td} text-text-secondary`}>{d.deliveredAt ? dayjs(d.deliveredAt).format("MMM D") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportBlock>
      )}

      {tab === "quality" && (
        <div className="space-y-4">
          <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Metric label="Pass rate" value={q.passRate === null || q.passRate === undefined ? "—" : `${q.passRate}%`} detail="Checkpoints" tone="green" />
            <Metric label="Passed" value={String(q.pass ?? 0)} detail="Checks" tone="blue" />
            <Metric label="Failed" value={String(q.fail ?? 0)} detail="Checks" tone="red" />
            <Metric label="Total checks" value={String(q.total ?? 0)} detail="In range" tone="amber" />
          </section>
          <ReportBlock title="Rejection reasons" onExport={() => download(`rejection_reasons_${from}_${to}.csv`, q.rejectionReasons ?? [])} empty={(q.rejectionReasons ?? []).length === 0}>
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-border"><th className={th}>Reason</th><th className={`${th} text-right`}>Count</th></tr></thead>
              <tbody className="divide-y divide-border/70">
                {(q.rejectionReasons ?? []).map((r: any, i: number) => (<tr key={i}><td className={`${td} text-text-primary`}>{r.reason}</td><td className={`${td} text-right font-semibold`}>{r.count}</td></tr>))}
              </tbody>
            </table>
          </ReportBlock>
          <ReportBlock title="Rework by stage" onExport={() => download(`rework_by_stage.csv`, q.reworkByStage ?? [])} empty={(q.reworkByStage ?? []).length === 0}>
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-border"><th className={th}>Stage</th><th className={`${th} text-right`}>Rework count</th></tr></thead>
              <tbody className="divide-y divide-border/70">
                {(q.reworkByStage ?? []).map((r: any, i: number) => (<tr key={i}><td className={`${td} text-text-primary`}>{r.stage}</td><td className={`${td} text-right font-semibold`}>{r.count}</td></tr>))}
              </tbody>
            </table>
          </ReportBlock>
        </div>
      )}

      {tab === "inventory" && (
        <ReportBlock title="Stock valuation" onExport={() => download(`inventory_valuation_${to}.csv`, data?.inventory?.valuation ?? [])} empty={(data?.inventory?.valuation ?? []).length === 0}>
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-border"><th className={th}>Item</th><th className={th}>SKU</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Rate</th><th className={`${th} text-right`}>Value</th></tr></thead>
            <tbody className="divide-y divide-border/70">
              {(data?.inventory?.valuation ?? []).map((v: any) => (
                <tr key={v.id}><td className={`${td} font-semibold text-text-primary`}>{v.name}</td><td className={`${td} font-mono text-xs text-text-secondary`}>{v.sku}</td><td className={`${td} text-right`}>{v.netStock} {v.uom}</td><td className={`${td} text-right`}>₹{v.rate.toFixed(2)}</td><td className={`${td} text-right font-semibold`}>{fmt(v.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </ReportBlock>
      )}

      {tab === "passports" && (
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4"><p className="text-sm font-semibold text-text-primary">Quality passports ({passports.length})</p></div>
          <div className="max-h-[520px] space-y-3 overflow-y-auto p-5">
            {passports.length === 0 ? <p className="text-sm text-text-tertiary">No passports issued yet.</p> : passports.map((row: any) => (
              <div key={row.id} className="flex flex-col gap-3 rounded-[18px] border border-border bg-background p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-brand-soft text-brand-strong shrink-0"><FileCheck2 className="h-5 w-5" /></div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{row.inspection?.batch?.order?.orderNumber}</span>
                      <Badge className="bg-surface-2 text-text-secondary">{row.verificationCode}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">{row.inspection?.batch?.order?.itemName || row.inspection?.batch?.order?.productName || row.inspection?.batch?.order?.orderNumber} · {formatDate(row.createdAt)}</p>
                  </div>
                </div>
                <Link href={`/verify/${row.verificationCode}`} target="_blank">
                  <span className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] border border-border bg-background px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-2">View Passport<ExternalLink className="h-4 w-4" /></span>
                </Link>
              </div>
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
}

function ReportBlock({ title, onExport, empty, children }: { title: string; onExport: () => void; empty: boolean; children: React.ReactNode }) {
  return (
    <Surface className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <Button variant="secondary" className="h-9 text-xs gap-1.5" onClick={onExport} disabled={empty}><Download className="h-3.5 w-3.5" />Export CSV</Button>
      </div>
      {empty ? <div className="p-8 text-center text-sm text-text-tertiary">No data in this range.</div> : <div className="overflow-x-auto">{children}</div>}
    </Surface>
  );
}

function OrdersTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead><tr className="border-b border-border"><th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Status</th><th className={th}>Date</th></tr></thead>
      <tbody className="divide-y divide-border/70">
        {rows.map((o: any, i: number) => (
          <tr key={i}><td className={`${td} font-semibold text-text-primary`}>{o.soNumber}</td><td className={`${td} text-text-secondary`}>{o.customer}</td><td className={td}><Badge className="bg-surface-2 text-text-secondary">{o.status}</Badge></td><td className={`${td} text-text-secondary`}>{dayjs(o.date).format("MMM D, YYYY")}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
