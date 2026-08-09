"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Camera, Clock } from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { OrderSpecCard } from "@/components/factory/OrderSpecCard";

// The full record of one job card: what was ordered, what was submitted at each
// attempt, and the photos captured along the way.

function Photos({ urls, label }: { urls: string[]; label: string }) {
  if (!urls?.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">{label}</p>
      <div className="flex flex-wrap gap-2">
        {urls.map((src, i) => (
          <a key={i} href={src} target="_blank" rel="noopener noreferrer"
            className="block h-20 w-20 overflow-hidden rounded-lg border border-border">
            <img src={src} alt={`${label} ${i + 1}`} className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}

const OUTCOME_TONE: Record<string, string> = {
  APPROVED: "bg-success-soft text-success",
  SUBMITTED: "bg-warning-soft text-warning",
  REWORK: "bg-danger-soft text-danger",
};

export function HistoryDetailClient({ job, basePath }: { job: any; basePath: string }) {
  const entries: any[] = job.entries ?? [];
  const inspection = job.inspection;
  const submissions: any[] = inspection?.submissions ?? [];

  return (
    <div className="space-y-4 overflow-x-hidden">
      <Link href={`${basePath}/history`} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> History
      </Link>

      <Surface className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{job.batchNumber}</span>
          {job.departmentName && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
              {job.departmentName}
            </span>
          )}
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-strong">
            {job.status}
          </span>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-text-primary">
          {job.order?.itemName || job.order?.productName || job.order?.orderNumber}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-tertiary">
          {job.workerName && <span>Worker: {job.workerName}</span>}
          {job.startedAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Started {new Date(job.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
          {job.completedAt && <span>Completed {new Date(job.completedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
        </p>
      </Surface>

      <OrderSpecCard order={job.order} />

      {/* Stage submissions — newest first, each attempt kept. */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            Submissions ({entries.length})
          </p>
          {entries.map((e: any, idx: number) => {
            const checklist: any[] = Array.isArray(e.checklist) ? e.checklist : [];
            return (
              <Surface key={e.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text-primary">
                    {idx === 0 ? "Latest" : `Attempt ${entries.length - idx}`}
                    {e.submittedBy?.name ? ` · ${e.submittedBy.name}` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    {e.outcome && (
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${OUTCOME_TONE[e.outcome] ?? "bg-surface-2 text-text-secondary"}`}>
                        {e.outcome}
                      </span>
                    )}
                    <span className="text-[10px] text-text-tertiary">
                      {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {e.remarks && <p className="text-sm italic text-text-secondary">“{e.remarks}”</p>}
                {e.measurements && <p className="text-xs text-text-secondary">Measurements: {e.measurements}</p>}
                {e.materialNotes && <p className="text-xs text-text-secondary">Materials: {e.materialNotes}</p>}

                {checklist.length > 0 && (
                  <ul className="space-y-1">
                    {checklist.map((c: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        {c.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />}
                        <span className="min-w-0">
                          {c.name}{c.remarks ? ` — ${c.remarks}` : ""}
                          {(c.images?.length ?? 0) > 0 && (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-text-tertiary"><Camera className="h-3 w-3" />{c.images.length}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <Photos urls={e.beforeImages ?? []} label="Before" />
                <Photos urls={e.afterImages ?? []} label="After" />
                {checklist.flatMap((c: any) => c.images ?? []).length > 0 && (
                  <Photos urls={checklist.flatMap((c: any) => c.images ?? [])} label="Checklist photos" />
                )}
              </Surface>
            );
          })}
        </div>
      )}

      {/* QC inspection results */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            QC checks ({submissions.length}){inspection?.status ? ` · ${inspection.status}` : ""}
          </p>
          <Surface className="divide-y divide-border/50 p-4">
            {submissions.map((s: any) => (
              <div key={s.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary">{s.checkpoint?.name ?? "Checkpoint"}</p>
                  {s.remarks && <p className="text-[11px] text-text-secondary">{s.remarks}</p>}
                  {(s.evidences?.length ?? 0) > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.evidences.map((ev: any) => (
                        <a key={ev.id} href={ev.publicUrl} target="_blank" rel="noopener noreferrer"
                          className="block h-14 w-14 overflow-hidden rounded-md border border-border">
                          <img src={ev.publicUrl} alt="QC evidence" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  s.passFail === "FAIL" ? "bg-danger-soft text-danger"
                  : s.passFail === "PASS" ? "bg-success-soft text-success"
                  : "bg-surface-2 text-text-tertiary"
                }`}>
                  {s.passFail ?? "Not checked"}
                </span>
              </div>
            ))}
          </Surface>
          {inspection?.videoUrl && (
            <Surface className="overflow-hidden">
              <video src={inspection.videoUrl} controls playsInline preload="metadata" className="h-auto w-full max-h-72 bg-black" />
            </Surface>
          )}
        </div>
      )}

      {entries.length === 0 && submissions.length === 0 && (
        <Surface className="p-8 text-center">
          <p className="text-sm text-text-secondary">Nothing has been submitted on this job yet.</p>
        </Surface>
      )}
    </div>
  );
}
