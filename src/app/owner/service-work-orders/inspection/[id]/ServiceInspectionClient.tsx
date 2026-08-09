"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";

import { Button, Card, Input } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { StatusPill, TextArea, formatDay } from "@/components/service/kit";
import {
  recordServiceCheckpoint,
  resolveServiceInspection,
  submitServiceInspection,
} from "@/server/actions/serviceQuality";

type Checkpoint = {
  id: string;
  name: string;
  instructions: string;
  inputType: string;
  placeholder: string | null;
  isRequired: boolean;
  requireImage: boolean;
  requireRemarks: boolean;
  passFail: string | null;
  value: string | null;
  remarks: string | null;
  answered: boolean;
};

type Inspection = {
  id: string;
  status: string;
  notes: string | null;
  startedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  workOrder: { id: string; woNumber: string; title: string; siteId: string | null };
  siteName: string | null;
  checklistName: string;
  sections: { id: string; title: string; checkpoints: Checkpoint[] }[];
};

/**
 * Running a checklist against a completed visit.
 *
 * Answers save one checkpoint at a time rather than as a form submit. An
 * inspection is filled in on a phone, on site, often on a bad connection —
 * losing twenty answers because the twenty-first failed is the thing to avoid.
 */
export function ServiceInspectionClient({ inspection }: { inspection: Inspection }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState(inspection.notes ?? "");

  const locked = inspection.status === "APPROVED";

  const progress = useMemo(() => {
    const all = inspection.sections.flatMap((s) => s.checkpoints);
    const required = all.filter((c) => c.isRequired);
    return {
      total: all.length,
      answered: all.filter((c) => c.answered).length,
      requiredLeft: required.filter((c) => !c.answered).length,
      failed: all.filter((c) => c.passFail === "FAIL").length,
    };
  }, [inspection.sections]);

  function save(checkpointId: string, patch: { passFail?: string; value?: string; remarks?: string }) {
    if (locked) return;
    start(async () => {
      const result = await recordServiceCheckpoint({
        inspectionId: inspection.id,
        checkpointId,
        ...patch,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function submit() {
    start(async () => {
      const result = await submitServiceInspection(inspection.id, notes);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Submitted for sign-off.");
      router.refresh();
    });
  }

  function resolve(decision: "APPROVED" | "REJECTED" | "REWORK_REQUIRED") {
    start(async () => {
      const result = await resolveServiceInspection(inspection.id, decision);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Inspection updated.");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/owner/service-work-orders"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Work orders
          </Link>
          <h1 className="mt-2 text-[clamp(20px,2.2vw,28px)] font-semibold tracking-[-0.04em] text-text-primary">
            {inspection.checklistName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="font-mono text-xs font-semibold text-text-tertiary">
              {inspection.workOrder.woNumber}
            </span>
            <StatusPill status={inspection.status} />
            <span className="truncate">{inspection.workOrder.title}</span>
            {inspection.siteName ? <span>· {inspection.siteName}</span> : null}
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-lg font-bold text-text-primary">
            {progress.answered}/{progress.total}
          </p>
          <p className="text-[11px] text-text-tertiary">
            {progress.requiredLeft > 0
              ? `${progress.requiredLeft} required left`
              : "All required answered"}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {inspection.sections.map((section) => (
          <Card key={section.id}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {section.title}
            </p>
            <div className="mt-3 space-y-3">
              {section.checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className="rounded-[14px] border border-border bg-surface-2/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {cp.name}
                        {cp.isRequired ? (
                          <span className="ml-1 text-[var(--brand)]">*</span>
                        ) : null}
                      </p>
                      {cp.instructions ? (
                        <p className="mt-0.5 text-[12px] text-text-secondary">{cp.instructions}</p>
                      ) : null}
                    </div>

                    {cp.inputType === "PASS_FAIL" ? (
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          disabled={locked || pending}
                          onClick={() => save(cp.id, { passFail: "PASS" })}
                          aria-label={`Pass ${cp.name}`}
                          className={
                            cp.passFail === "PASS"
                              ? "flex h-11 w-11 items-center justify-center rounded-xl border border-transparent bg-success text-white"
                              : "flex h-11 w-11 items-center justify-center rounded-xl border border-border text-text-secondary hover:border-success/50"
                          }
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={locked || pending}
                          onClick={() => save(cp.id, { passFail: "FAIL" })}
                          aria-label={`Fail ${cp.name}`}
                          className={
                            cp.passFail === "FAIL"
                              ? "flex h-11 w-11 items-center justify-center rounded-xl border border-transparent bg-danger text-white"
                              : "flex h-11 w-11 items-center justify-center rounded-xl border border-border text-text-secondary hover:border-danger/50"
                          }
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {cp.inputType !== "PASS_FAIL" ? (
                    <Input
                      className="mt-2"
                      defaultValue={cp.value ?? ""}
                      disabled={locked}
                      placeholder={cp.placeholder ?? "Answer"}
                      type={cp.inputType === "NUMBER" ? "number" : "text"}
                      onBlur={(e) => {
                        const next = e.currentTarget.value;
                        if (next !== (cp.value ?? "")) save(cp.id, { value: next });
                      }}
                    />
                  ) : null}

                  {cp.requireRemarks || cp.passFail === "FAIL" ? (
                    <Input
                      className="mt-2"
                      defaultValue={cp.remarks ?? ""}
                      disabled={locked}
                      placeholder="Remarks"
                      onBlur={(e) => {
                        const next = e.currentTarget.value;
                        if (next !== (cp.remarks ?? "")) save(cp.id, { remarks: next });
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            Inspector notes
          </p>
          <TextArea
            className="mt-2"
            rows={3}
            value={notes}
            disabled={locked}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-text-tertiary">
              Started {formatDay(inspection.startedAt)}
              {inspection.submittedAt ? ` · submitted ${formatDay(inspection.submittedAt)}` : ""}
              {progress.failed > 0 ? ` · ${progress.failed} failed` : ""}
            </p>

            <div className="flex gap-2">
              {inspection.status === "IN_PROGRESS" || inspection.status === "REWORK_REQUIRED" ? (
                <Button onClick={submit} disabled={pending || progress.requiredLeft > 0}>
                  {pending ? "Saving..." : "Submit for sign-off"}
                </Button>
              ) : null}

              {inspection.status === "WAITING_QC" ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => resolve("REWORK_REQUIRED")}
                    disabled={pending}
                  >
                    Send back
                  </Button>
                  <Button variant="danger" onClick={() => resolve("REJECTED")} disabled={pending}>
                    Reject
                  </Button>
                  <Button variant="success" onClick={() => resolve("APPROVED")} disabled={pending}>
                    Approve
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
