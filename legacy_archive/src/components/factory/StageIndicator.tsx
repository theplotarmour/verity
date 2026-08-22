"use client";

import { cn } from "@/lib/utils";

export type QcState =
  | "PENDING_INSPECTION"
  | "PASSED_BY_WORKER"
  | "FLAGGED_BY_WORKER"
  | "APPROVED_BY_INSPECTOR"
  | "REWORK_REQUIRED"
  | "CERTIFIED";

interface StageIndicatorProps {
  /**
   * The ordered stage names this product actually passes through, resolved from
   * the item's route by `resolveProductionStages`. Presentational only — the
   * component no longer knows or guesses what a factory's stages are called,
   * because Cutting/Stitching/QC/Passport is true of one of the four verticals.
   */
  stages: string[];
  /** Which of `stages` the work is sitting on. Null once every stage is done. */
  currentStage?: string | null;
  status: QcState;
  className?: string;
}

export function StageIndicator({ stages, currentStage, status, className }: StageIndicatorProps) {
  // No route yet — a new item with no blueprint. An empty strip says less than
  // nothing, so render nothing rather than an invented default.
  if (stages.length === 0) return null;

  const currentIdx = currentStage ? stages.indexOf(currentStage) : -1;

  const getStageState = (idx: number) => {
    // Everything signed off, whatever the stages are called.
    if (status === "CERTIFIED" || status === "APPROVED_BY_INSPECTOR") return "completed";

    // A rejection or a worker's flag belongs on the stage the work is actually
    // on. The old code pinned both to a stage literally named "QC", which does
    // not exist in most routes.
    if (idx === currentIdx) {
      if (status === "REWORK_REQUIRED") return "failed";
      if (status === "FLAGGED_BY_WORKER") return "warning";
      return "active";
    }

    // currentIdx of -1 means no stage is outstanding: the chain is finished.
    if (currentIdx === -1 || idx < currentIdx) return "completed";
    return "pending";
  };

  return (
    <div className={cn("flex items-center gap-1.5 w-full", className)}>
      {stages.map((stage, idx) => {
        const state = getStageState(idx);

        return (
          <div key={`${stage}-${idx}`} className="flex-1 flex flex-col gap-1 min-w-0">
            {/* Step Bar */}
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                state === "completed" && "bg-success shadow-[0_0_8px_rgba(48,209,88,0.25)]",
                state === "active" && "bg-[var(--brand)] shadow-[0_0_8px_rgba(0,122,255,0.3)]",
                state === "warning" && "bg-warning shadow-[0_0_8px_rgba(255,214,10,0.3)]",
                state === "failed" && "bg-danger shadow-[0_0_8px_rgba(255,69,58,0.3)]",
                state === "pending" && "bg-border dark:bg-white/5"
              )}
            />
            {/* Label */}
            <span
              title={stage}
              className={cn(
                "text-[9px] font-semibold tracking-wide uppercase truncate text-center",
                state === "completed" && "text-success",
                state === "active" && "text-[var(--brand)]",
                state === "warning" && "text-warning",
                state === "failed" && "text-danger",
                state === "pending" && "text-text-tertiary"
              )}
            >
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
