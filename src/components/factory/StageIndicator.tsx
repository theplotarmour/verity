"use client";

import { cn } from "@/lib/utils";
import { Check, AlertTriangle, Play, HelpCircle, FileCheck } from "lucide-react";

type Stage = "CUTTING" | "STITCHING" | "QC" | "PASSPORT";

interface StageIndicatorProps {
  currentStage: Stage;
  status: "PENDING_INSPECTION" | "PASSED_BY_WORKER" | "FLAGGED_BY_WORKER" | "APPROVED_BY_INSPECTOR" | "REWORK_REQUIRED" | "CERTIFIED";
  className?: string;
}

export function StageIndicator({ currentStage, status, className }: StageIndicatorProps) {
  const stages: { key: Stage; label: string; icon: any }[] = [
    { key: "CUTTING", label: "Cutting", icon: Play },
    { key: "STITCHING", label: "Stitching", icon: Play },
    { key: "QC", label: "QC Review", icon: AlertTriangle },
    { key: "PASSPORT", label: "Passport", icon: FileCheck },
  ];

  const getStageState = (stageKey: Stage) => {
    // Determine active / completed / failed states
    const indexMap: Record<Stage, number> = {
      CUTTING: 0,
      STITCHING: 1,
      QC: 2,
      PASSPORT: 3,
    };

    const currentIdx = indexMap[currentStage];
    const stageIdx = indexMap[stageKey];

    if (status === "REWORK_REQUIRED" && stageKey === "QC") {
      return "failed";
    }
    if (status === "FLAGGED_BY_WORKER" && stageKey === "QC") {
      return "warning";
    }

    if (status === "CERTIFIED" || status === "APPROVED_BY_INSPECTOR") {
      return "completed";
    }

    if (stageIdx < currentIdx) {
      return "completed";
    }
    if (stageIdx === currentIdx) {
      return "active";
    }
    return "pending";
  };

  return (
    <div className={cn("flex items-center gap-1.5 w-full", className)}>
      {stages.map((stage, idx) => {
        const state = getStageState(stage.key);
        
        return (
          <div key={stage.key} className="flex-1 flex flex-col gap-1 min-w-0">
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
              className={cn(
                "text-[9px] font-semibold tracking-wide uppercase truncate text-center",
                state === "completed" && "text-success",
                state === "active" && "text-[var(--brand)]",
                state === "warning" && "text-warning",
                state === "failed" && "text-danger",
                state === "pending" && "text-text-tertiary"
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
