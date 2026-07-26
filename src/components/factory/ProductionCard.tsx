"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Surface } from "@/components/design/Surface";
import { Badge, Avatar, Button, Select } from "@/components/ui/primitives";
import { StageIndicator } from "./StageIndicator";
import { updateOrderAssignments } from "@/server/actions/orders";
import { AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductionCardProps {
  id: string;
  orderId: string;
  batchNumber: string;
  orderNumber: string;
  vehicleName: string;
  quantity: number;
  workerName?: string;
  workerAvatar?: string | null;
  workerId?: string;
  inspectorName?: string;
  inspectorAvatar?: string | null;
  inspectorId?: string;
  workers?: Array<{ id: string; name: string }>;
  inspectors?: Array<{ id: string; name: string }>;
  status: string;
  submissions: any[];
  totalCheckpoints: number;
  hasReport?: boolean;
  compact?: boolean;
}

export function ProductionCard({
  id,
  orderId,
  batchNumber,
  orderNumber,
  vehicleName,
  quantity,
  workerName,
  workerAvatar,
  workerId,
  inspectorName,
  inspectorAvatar,
  inspectorId,
  workers = [],
  inspectors = [],
  status,
  submissions,
  totalCheckpoints,
  hasReport,
  compact = false,
}: ProductionCardProps) {
  const [assignMode, setAssignMode] = useState(false);
  const [nextWorkerId, setNextWorkerId] = useState(workerId || workers[0]?.id || "");
  const [nextInspectorId, setNextInspectorId] = useState(inspectorId || inspectors[0]?.id || "");
  const [savingAssignments, setSavingAssignments] = useState(false);

  useEffect(() => {
    setNextWorkerId(workerId || workers[0]?.id || "");
  }, [workerId, workers]);

  useEffect(() => {
    setNextInspectorId(inspectorId || inspectors[0]?.id || "");
  }, [inspectorId, inspectors]);

  useEffect(() => {
    if (!workers.length || !inspectors.length) {
      setAssignMode(false);
    }
  }, [workers.length, inspectors.length]);

  const completedCount = submissions.filter((sub) => sub.verificationStatus === "APPROVED").length;
  const progressPercent = Math.round((completedCount / (totalCheckpoints || 1)) * 100);
  const issueCount = submissions.filter((sub) => sub.passFail === "FAIL").length;
  const hasFailures = submissions.some((sub: any) => sub.passFail === "FAIL");

  let qcState: "PENDING_INSPECTION" | "PASSED_BY_WORKER" | "FLAGGED_BY_WORKER" | "APPROVED_BY_INSPECTOR" | "REWORK_REQUIRED" | "CERTIFIED" = "PENDING_INSPECTION";
  if (status === "APPROVED") {
    qcState = hasReport ? "CERTIFIED" : "APPROVED_BY_INSPECTOR";
  } else if (status === "REWORK_REQUIRED" || status === "REJECTED") {
    qcState = "REWORK_REQUIRED";
  } else if (status === "WAITING_QC") {
    qcState = hasFailures ? "FLAGGED_BY_WORKER" : "PASSED_BY_WORKER";
  } else if (status === "IN_PROGRESS") {
    qcState = hasFailures ? "FLAGGED_BY_WORKER" : "PENDING_INSPECTION";
  }

  let activeStage: "CUTTING" | "STITCHING" | "QC" | "PASSPORT" = "CUTTING";
  if (qcState === "CERTIFIED") {
    activeStage = "PASSPORT";
  } else if (qcState === "APPROVED_BY_INSPECTOR" || qcState === "REWORK_REQUIRED" || qcState === "PASSED_BY_WORKER" || qcState === "FLAGGED_BY_WORKER") {
    activeStage = "QC";
  } else if (submissions.length > 2) {
    activeStage = "STITCHING";
  }

  const badgeVariants: Record<typeof qcState, { text: string; variant: "success" | "warning" | "danger" | "neutral" | "default" }> = {
    PENDING_INSPECTION: { text: "Pending Inspection", variant: "neutral" },
    PASSED_BY_WORKER: { text: "Passed by Worker", variant: "success" },
    FLAGGED_BY_WORKER: { text: "Flagged by Worker", variant: "warning" },
    APPROVED_BY_INSPECTOR: { text: "Approved", variant: "success" },
    REWORK_REQUIRED: { text: "Rework Required", variant: "danger" },
    CERTIFIED: { text: "Certified (Passport)", variant: "default" },
  };

  async function saveAssignments() {
    if (!nextWorkerId || !nextInspectorId) return;
    setSavingAssignments(true);
    try {
      const result = await updateOrderAssignments(orderId, nextWorkerId, nextInspectorId);
      if (result?.error) {
        console.error("Failed to update order assignments:", result.error);
        return;
      }
      setAssignMode(false);
    } finally {
      setSavingAssignments(false);
    }
  }

  return (
    <Surface className={cn(
      "transition-all duration-300 border hover:shadow-md",
      compact ? "p-5 [@media(max-height:699px)]:p-3.5" : "p-6",
      qcState === "REWORK_REQUIRED" && "hover:border-danger/30 hover:shadow-[0_0_15px_rgba(255,69,58,0.08)]",
      qcState === "CERTIFIED" && "hover:border-brand/35 hover:shadow-[0_0_15px_rgba(0,122,255,0.08)]",
      qcState === "FLAGGED_BY_WORKER" && "hover:border-warning/35 hover:shadow-[0_0_15px_rgba(255,214,10,0.08)]"
    )}>
      <div className={cn("flex flex-col", compact ? "gap-3 [@media(max-height:699px)]:gap-2.5" : "gap-4")}>
        <div className="flex justify-between items-start gap-3">
          <div>
            <span className={cn("font-bold text-text-tertiary uppercase tracking-wider block", compact ? "text-[10px] [@media(max-height:699px)]:text-[8px]" : "text-[10px]")}>
              Batch {batchNumber} · Order {orderNumber}
            </span>
            <h3 className={cn("font-bold text-text-primary mt-1 tracking-tight truncate", compact ? "text-sm max-w-[180px] [@media(max-height:699px)]:text-xs [@media(max-height:699px)]:max-w-[130px]" : "text-sm max-w-[180px]")}>
              {vehicleName}
            </h3>
          </div>
          <Badge variant={badgeVariants[qcState].variant} className={cn("tracking-wider shrink-0", compact ? "text-[9px] px-2 py-0.5 [@media(max-height:699px)]:text-[8px] [@media(max-height:699px)]:px-1.5 [@media(max-height:699px)]:py-0" : "text-[9px] px-2 py-0.5")}>
            {badgeVariants[qcState].text}
          </Badge>
        </div>

        <div>
          <div className={cn("flex items-center justify-between font-semibold mb-1 text-text-secondary", compact ? "text-xs [@media(max-height:699px)]:text-[10px]" : "text-xs")}>
            <span>Progress</span>
            <span className="font-mono text-text-primary">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-2 dark:bg-white/5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                qcState === "REWORK_REQUIRED" && "bg-danger",
                qcState === "FLAGGED_BY_WORKER" && "bg-warning",
                qcState === "CERTIFIED" && "bg-success",
                qcState !== "REWORK_REQUIRED" && qcState !== "FLAGGED_BY_WORKER" && qcState !== "CERTIFIED" && "bg-[var(--brand)]"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className={cn("border-t border-border/60 pt-3", compact && "[@media(max-height:699px)]:hidden")}>
          <StageIndicator currentStage={activeStage} status={qcState} />
        </div>

        {!compact ? (
          <>
            <div className="flex justify-between items-center gap-4 mt-1 border-t border-border/60 pt-3">
              <div className="flex items-center gap-3 min-w-0">
                {workerName && (
                  <button type="button" onClick={() => setAssignMode((v) => !v)} className="flex items-center gap-1.5 min-w-0 text-left" title={`Worker: ${workerName}`}>
                    <Avatar src={workerAvatar} fallback={workerName} className="h-6.5 w-6.5 text-[10px]" />
                    <span className="text-xs font-medium text-text-secondary truncate max-w-[65px]">{workerName}</span>
                  </button>
                )}
                {inspectorName && (
                  <button type="button" onClick={() => setAssignMode((v) => !v)} className="flex items-center gap-1.5 border-l border-border/60 pl-3 min-w-0 text-left" title={`Inspector: ${inspectorName}`}>
                    <Avatar src={inspectorAvatar} fallback={inspectorName} className="h-6.5 w-6.5 text-[10px]" />
                    <span className="text-xs font-medium text-text-secondary truncate max-w-[65px]">{inspectorName}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {issueCount > 0 && (
                  <span className="flex items-center text-xs font-bold text-danger bg-danger-soft px-2 py-0.5 rounded-full" title={`${issueCount} issues reported`}>
                    <AlertCircle className="w-3.5 h-3.5 mr-1" /> {issueCount}
                  </span>
                )}
                <Link href={`/owner/review/${id}`} className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-border/60 text-text-secondary hover:text-[var(--brand)] hover:border-[var(--brand)]/50 hover:bg-[var(--brand)]/5 transition-all duration-200" title="Open Batch Oversight">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {assignMode && workers.length > 0 && inspectors.length > 0 && (
              <div className="grid gap-3 border-t border-border/60 pt-3 mt-1 sm:grid-cols-[1fr_1fr_auto]">
                <Select value={nextWorkerId} onChange={(e) => setNextWorkerId(e.target.value)}>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>{worker.name}</option>
                  ))}
                </Select>
                <Select value={nextInspectorId} onChange={(e) => setNextInspectorId(e.target.value)}>
                  {inspectors.map((inspector) => (
                    <option key={inspector.id} value={inspector.id}>{inspector.name}</option>
                  ))}
                </Select>
                <Button variant="primary" onClick={saveAssignments} disabled={savingAssignments}>
                  {savingAssignments ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
            {assignMode && (!workers.length || !inspectors.length) && (
              <div className="border-t border-border/60 pt-3 mt-1 text-xs text-text-tertiary">
                Team assignments are unavailable until both worker and inspector lists are loaded.
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-between items-center mt-1 border-t border-border/60 pt-2 text-[10px] text-text-tertiary">
            <span>Qty {quantity}</span>
            <Link href={`/owner/review/${id}`} className="text-[var(--brand)] hover:underline flex items-center gap-0.5 font-bold">
              Oversight <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </Surface>
  );
}
