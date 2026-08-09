"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Camera } from "lucide-react";
import { Surface } from "@/components/design/Surface";

// Categorized work history. Each row opens the full record: order spec, the
// responses that were submitted and the photos that went with them.

type Bucket = "all" | "active" | "awaiting" | "completed" | "rework";

const TABS: { id: Bucket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "awaiting", label: "Awaiting approval" },
  { id: "rework", label: "Rework" },
  { id: "completed", label: "Completed" },
];

const BUCKET_TONE: Record<string, string> = {
  active: "bg-brand-soft text-brand-strong",
  awaiting: "bg-warning-soft text-warning",
  rework: "bg-danger-soft text-danger",
  completed: "bg-success-soft text-success",
};

const BUCKET_LABEL: Record<string, string> = {
  active: "In progress",
  awaiting: "Awaiting approval",
  rework: "Rework",
  completed: "Completed",
};

export function HistoryClient({ jobs, scope, basePath }: { jobs: any[]; scope: string; basePath: string }) {
  const [tab, setTab] = useState<Bucket>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: jobs.length, active: 0, awaiting: 0, completed: 0, rework: 0 };
    for (const j of jobs) c[j.bucket] = (c[j.bucket] ?? 0) + 1;
    return c;
  }, [jobs]);

  const shown = tab === "all" ? jobs : jobs.filter((j) => j.bucket === tab);

  return (
    <div className="space-y-4 overflow-x-hidden">
      <Surface className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">History</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
          {scope === "department" ? "Department work" : scope === "factory" ? "All work" : "My work"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{jobs.length} job{jobs.length === 1 ? "" : "s"} on record</p>
      </Surface>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
              tab === t.id
                ? "border-transparent bg-[var(--brand)] text-white"
                : "border-border bg-transparent text-text-secondary hover:bg-surface-2"
            }`}
          >
            {t.label}
            <span className="ml-1.5 opacity-70">{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Surface className="p-8 text-center">
          <Calendar className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-base font-semibold text-text-primary">Nothing here yet</p>
          <p className="mt-1 text-sm text-text-secondary">Jobs appear here as they move through your department.</p>
        </Surface>
      ) : (
        <div className="grid gap-3">
          {shown.map((job) => {
            const when = job.completedAt ?? job.startedAt ?? job.createdAt;
            const vehicle = job.order?.itemName || "";
            const specSummary = (job.order?.specDetails ?? []).slice(0, 3).map((d: any) => d.value).filter(Boolean).join(" · ");
            return (
              <Link key={job.id} href={`${basePath}/history/${job.id}`}>
                <Surface className="p-4 transition hover:border-[var(--brand)]/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{job.batchNumber}</span>
                        {job.departmentName && (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                            {job.departmentName}
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BUCKET_TONE[job.bucket] ?? "bg-surface-2"}`}>
                          {BUCKET_LABEL[job.bucket] ?? job.status}
                        </span>
                      </div>
                      <h3 className="mt-1.5 truncate text-base font-semibold tracking-[-0.02em] text-text-primary">
                        {vehicle || job.order?.productName || job.order?.orderNumber}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-text-secondary">
                        {[job.order?.orderNumber, specSummary].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-[11px] text-text-tertiary">
                        {when ? new Date(when).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        {job.workerName && scope !== "own" ? <span>· {job.workerName}</span> : null}
                        {(job.order?.designImages?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5"><Camera className="h-3 w-3" />{job.order.designImages.length}</span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-text-tertiary" />
                  </div>
                </Surface>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
