"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Badge, Input } from "@/components/ui/primitives";
import { ProductionCard } from "@/components/factory/ProductionCard";
import { Search, FileCheck2, ExternalLink } from "lucide-react";

export function QCFloorClient({ inspections = [], workers = [], inspectors = [], totalCheckpoints = 1, passports = [] }: {
  inspections: any[];
  workers: any[];
  inspectors: any[];
  totalCheckpoints: number;
  passports?: any[];
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"active" | "completed">("active");

  const q = search.toLowerCase();
  const filtered = useMemo(() => inspections.filter((inspection: any) => {
    const text = `${inspection.batch?.batchNumber ?? ""} ${inspection.batch?.order?.orderNumber ?? ""} ${inspection.batch?.order?.customer?.name ?? ""} ${inspection.batch?.order?.worker?.name ?? ""}`.toLowerCase();
    return text.includes(q);
  }), [inspections, q]);

  const filteredPassports = useMemo(() => passports.filter((row: any) => {
    const text = `${row.verificationCode ?? ""} ${row.inspection?.batch?.order?.orderNumber ?? ""} ${row.inspection?.batch?.order?.itemName ?? ""}`.toLowerCase();
    return text.includes(q);
  }), [passports, q]);

  const stats = useMemo(() => ({
    waiting: inspections.filter((i: any) => i.status === "WAITING_QC").length,
    inProgress: inspections.filter((i: any) => i.status === "IN_PROGRESS" || i.status === "PENDING").length,
    approved: inspections.filter((i: any) => i.status === "APPROVED").length,
    rework: inspections.filter((i: any) => i.status === "REWORK_REQUIRED" || i.status === "REJECTED").length,
  }), [inspections]);

  return (
    <div className="flex lg:h-full flex-col space-y-6">
      <PageHeader
        eyebrow="Quality"
        title="QC Floor"
        description="Every inspection on the floor - track progress, reassign people, and follow batches through quality."
      />

      <div className="grid gap-4 md:grid-cols-4 shrink-0">
        <StatCard label="Awaiting review" value={String(stats.waiting)} hint="Submitted by workers" />
        <StatCard label="In progress" value={String(stats.inProgress)} hint="On the floor" />
        <StatCard label="Approved" value={String(stats.approved)} hint="Passed quality" />
        <StatCard label="Rework" value={String(stats.rework)} hint="Sent back" />
      </div>

      <Surface className="flex flex-col min-h-0 flex-1 overflow-hidden" allowFullscreen={true}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0 bg-surface-2/40">
          <div className="flex items-center gap-1">
            {([["active", `Active inspections`], ["completed", `Completed (${passports.length})`]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${tab === id ? "bg-[var(--brand)] text-white shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <Input className="w-64 pl-9" placeholder="Search batches..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {tab === "completed" ? (
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {filteredPassports.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-text-secondary">
                No verified passports yet — approved inspections appear here.
              </div>
            ) : filteredPassports.map((row: any) => (
              <div key={row.id} className="flex flex-col gap-3 rounded-[18px] border border-border bg-background p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-brand-soft text-brand-strong shrink-0"><FileCheck2 className="h-5 w-5" /></div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{row.inspection?.batch?.order?.orderNumber}</span>
                      <Badge className="bg-surface-2 text-text-secondary">{row.verificationCode}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {row.inspection?.batch?.order?.itemName || row.inspection?.batch?.order?.productName || row.inspection?.batch?.order?.orderNumber} · {new Date(row.createdAt).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <Link href={`/verify/${row.verificationCode}`} target="_blank">
                  <span className="inline-flex h-[40px] items-center justify-center gap-2 rounded-[12px] border border-border bg-background px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-2">View Passport<ExternalLink className="h-4 w-4" /></span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-6 bg-surface-2/40 dark:bg-transparent">
          {filtered.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-text-secondary">
              No inspections match your search.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((inspection: any) => (
                <ProductionCard
                  key={inspection.id}
                  id={inspection.id}
                  orderId={inspection.batch?.order?.id}
                  batchNumber={inspection.batch?.batchNumber || "N/A"}
                  orderNumber={inspection.batch?.order?.orderNumber || "N/A"}
                  vehicleName={inspection.batch?.order?.itemName || inspection.batch?.order?.productName || ""}
                  quantity={inspection.batch?.quantity || 1}
                  workerName={inspection.batch?.order?.worker?.name}
                  workerAvatar={null}
                  workerId={inspection.batch?.order?.workerId}
                  inspectorName={inspection.batch?.order?.inspector?.name}
                  inspectorAvatar={null}
                  inspectorId={inspection.batch?.order?.inspectorId}
                  workers={workers}
                  inspectors={inspectors}
                  status={inspection.status}
                  submissions={inspection.submissions || []}
                  totalCheckpoints={totalCheckpoints}
                  hasReport={!!inspection.report}
                  stages={inspection.batch?.stageSequence?.stages ?? []}
                  currentStage={inspection.batch?.stageSequence?.currentStage ?? null}
                />
              ))}
            </div>
          )}
        </div>
        )}
      </Surface>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Surface className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-[-0.06em] text-text-primary">{value}</p>
        <p className="pb-1 text-sm text-text-secondary">{hint}</p>
      </div>
    </Surface>
  );
}
