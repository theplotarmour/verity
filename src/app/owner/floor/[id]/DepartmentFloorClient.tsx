"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play, Clock, PauseCircle, ShieldCheck, CheckCircle2, User as UserIcon, Package, Car, ExternalLink,
  Loader2,
} from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { Button, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { promptDialog } from "@/components/ui/dialog-service";
import { reassignJobCard } from "@/server/actions/assignments";
import { approveStageCard, rejectStageCard } from "@/server/actions/stages";
import { cn } from "@/lib/utils";

// Full live status for one department: the roster (who is on what) and every
// active order in the department, plus recently completed work.

function statusTone(status: string): string {
  const s = (status || "").toUpperCase();
  if (["IN_PROGRESS"].includes(s)) return "text-[var(--brand)] bg-[var(--brand)]/10 border-[var(--brand)]/30";
  if (["WAITING"].includes(s)) return "text-warning bg-warning/10 border-warning/30";
  if (["BLOCKED", "ON_HOLD", "REWORK_REQUIRED"].includes(s)) return "text-danger bg-danger/10 border-danger/30";
  if (["QC_PENDING", "AWAITING_APPROVAL"].includes(s)) return "text-brand bg-brand/10 border-brand/30";
  if (["COMPLETED"].includes(s)) return "text-success bg-success/10 border-success/30";
  return "text-text-secondary bg-surface-2 border-border";
}

function specLine(o: any): string {
  const parts = [
    o.seatType, o.headrestCount ? `${o.headrestCount}HDR` : null, o.hasArmrest ? "Arm" : null,
    o.fabric, o.design, o.color,
  ].filter(Boolean);
  return parts.join(" · ");
}

function StatCard({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return (
    <Surface className="flex items-center gap-3 p-4">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}>{icon}</span>
      <div>
        <p className="text-lg font-bold text-text-primary">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
      </div>
    </Surface>
  );
}

// Hand a running job to someone else in the department. Completed work is
// locked so the record of who actually did it stays true.
function Reassign({ j, members }: { j: any; members: any[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<string>(j.worker?.id ?? "");

  if (j.status === "COMPLETED" || members.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary">
        <UserIcon className="h-3 w-3 text-text-tertiary" />{j.worker?.name ?? "Unassigned"}
      </span>
    );
  }

  const change = async (next: string) => {
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      const res: any = await reassignJobCard(j.id, next || null);
      if (res?.error) { setValue(previous); toast.error(res.error); return; }
      toast.success(next ? "Reassigned" : "Unassigned");
      router.refresh();
    } catch (e: any) {
      setValue(previous);
      toast.error(e?.message ?? "Failed to reassign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      {saving && <Loader2 className="h-3 w-3 animate-spin text-text-tertiary" />}
      <Select
        className="h-7 w-auto min-w-[8rem] px-2 text-[11px]"
        value={value}
        disabled={saving}
        onChange={(e) => change(e.target.value)}
        title="Reassign this job"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </Select>
    </span>
  );
}

// A worker's submission in an approval-gated department waits here for the
// supervisor (or owner) to approve it or send it back.
function ApproveActions({ j }: { j: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<any>, okMsg: string) => {
    setBusy(true);
    try {
      const res: any = await fn();
      if (res?.error) { toast.error(res.error); return; }
      toast.success(okMsg);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="mt-1 inline-flex gap-1.5">
      <Button size="sm" variant="success" disabled={busy} onClick={() => run(() => approveStageCard(j.id), "Approved")}>
        Approve
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          const reason = await promptDialog({
            title: "Send back for rework",
            label: "Reason",
            placeholder: "What needs redoing?",
            required: true,
            confirmLabel: "Send back",
          });
          if (!reason?.trim()) return;
          run(() => rejectStageCard(j.id, reason.trim()), "Sent back for rework");
        }}
      >
        Rework
      </Button>
    </span>
  );
}

function JobRow({ j, isQc, members }: { j: any; isQc: boolean; members: any[] }) {
  const veh = [j.order.brand, j.order.model].filter(Boolean).join(" ");
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-surface-2/40 p-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-[11px] font-bold text-text-secondary">
        {j.sequence}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-text-primary">{j.order.soNumber}</span>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusTone(j.status))}>{j.status.replace(/_/g, " ")}</span>
          {j.order.customer && <span className="text-[11px] text-text-tertiary">· {j.order.customer}</span>}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <Car className="h-3.5 w-3.5 text-text-tertiary" />
          {veh || "—"}{j.order.product ? ` · ${j.order.product}` : ""}
        </p>
        {specLine(j.order) && <p className="mt-0.5 text-[11px] text-text-tertiary">{specLine(j.order)}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Reassign j={j} members={members} />
        <span className="text-[10px] text-text-tertiary">{j.completedQty ?? 0}/{j.targetQty} pc</span>
        {j.status === "AWAITING_APPROVAL" && <ApproveActions j={j} />}
        {isQc && j.inspectionId && (
          <Link href={`/owner/review/${j.inspectionId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand)] hover:underline">
            Review <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function DepartmentFloorClient({ data }: { data: any }) {
  const { stats, members, jobs, recent, isQcStage } = data;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard icon={<Package className="h-4 w-4" />} value={stats.active} label="Active" tone="bg-surface-2 text-text-secondary" />
        <StatCard icon={<Play className="h-4 w-4" />} value={stats.inProgress} label="Running" tone="bg-[var(--brand)]/10 text-[var(--brand)]" />
        <StatCard icon={<Clock className="h-4 w-4" />} value={stats.waiting} label="Waiting" tone="bg-warning/10 text-warning" />
        <StatCard icon={<PauseCircle className="h-4 w-4" />} value={stats.blocked} label="Blocked" tone="bg-danger/10 text-danger" />
        {isQcStage && <StatCard icon={<ShieldCheck className="h-4 w-4" />} value={stats.qcPending} label="QC pending" tone="bg-brand/10 text-brand" />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Active orders */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Active orders ({jobs.length})</h3>
          {jobs.length === 0 ? (
            <Surface className="p-8 text-center text-sm text-text-tertiary">Nothing running in this department.</Surface>
          ) : (
            <div className="space-y-2.5">{jobs.map((j: any) => <JobRow key={j.id} j={j} isQc={isQcStage} members={members} />)}</div>
          )}

          {recent.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-bold text-text-primary">Recently completed</h3>
              <div className="space-y-2.5 opacity-80">{recent.map((j: any) => <JobRow key={j.id} j={j} isQc={isQcStage} members={members} />)}</div>
            </>
          )}
        </div>

        {/* Roster */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Team ({members.length})</h3>
          {members.length === 0 ? (
            <Surface className="p-6 text-center text-sm text-text-tertiary">No one assigned to this department.</Surface>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => (
                <Surface key={m.id} className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[11px] font-bold text-[var(--brand)]">
                      {m.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{m.name}</p>
                      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{m.role}</p>
                    </div>
                    <span className={cn("h-2 w-2 rounded-full", m.currentJob ? "bg-success" : "bg-text-tertiary/40")} />
                  </div>
                  {m.currentJob ? (
                    <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--brand)]/5 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary">
                      <Play className="h-3 w-3 text-[var(--brand)]" />
                      {m.currentJob.order.soNumber} · {[m.currentJob.order.brand, m.currentJob.order.model].filter(Boolean).join(" ") || m.currentJob.order.product}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-text-tertiary">Idle</p>
                  )}
                </Surface>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
