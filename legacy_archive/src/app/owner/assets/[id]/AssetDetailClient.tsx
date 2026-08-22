"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import type { AssetStatus } from "@prisma/client";

import { Button, Card, EmptyState, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  Field,
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
  createMaintenanceSchedule,
  deleteMaintenanceSchedule,
  logMaintenance,
  setAssetStatus,
  setMaintenanceScheduleActive,
} from "@/server/actions/assets";

type Asset = {
  id: string;
  assetCode: string;
  name: string;
  category: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  status: AssetStatus;
  siteId: string | null;
  siteName: string | null;
  assignedToName: string | null;
  location: string | null;
  purchaseDate: string | null;
  purchaseCost: number;
  warrantyUntil: string | null;
  notes: string | null;
  totalMaintenanceCost: number;
  totalDowntimeHours: number;
};

type Log = {
  id: string;
  type: string;
  description: string | null;
  performedByName: string | null;
  performedAt: string;
  cost: number;
  downtimeHours: number;
};

type Schedule = {
  id: string;
  name: string;
  intervalDays: number;
  lastPerformedAt: string | null;
  nextDueAt: string;
  isActive: boolean;
  overdue: boolean;
};

const STATUSES: AssetStatus[] = ["ACTIVE", "IN_REPAIR", "IDLE", "RETIRED", "DISPOSED"];
const TYPES = ["Preventive", "Corrective", "Inspection"];

/**
 * One asset: its service history and the plans that generate more of it.
 *
 * Cost and downtime totals sit at the top because they are the question the
 * register exists to answer — whether keeping this thing is still cheaper than
 * replacing it.
 */
export function AssetDetailClient({
  asset,
  logs,
  schedules,
}: {
  asset: Asset;
  logs: Log[];
  schedules: Schedule[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [logging, setLogging] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [logForm, setLogForm] = useState({
    type: "Preventive",
    description: "",
    performedAt: new Date().toISOString().slice(0, 10),
    cost: "",
    downtimeHours: "",
    scheduleId: "",
  });
  const [planForm, setPlanForm] = useState({ name: "", intervalDays: "90", firstDueAt: "" });

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

  function submitLog() {
    if (!logForm.type.trim()) {
      toast.error("Pick a maintenance type.");
      return;
    }
    start(async () => {
      const result = await logMaintenance({
        assetId: asset.id,
        type: logForm.type,
        description: logForm.description || null,
        performedAt: logForm.performedAt || null,
        cost: Number(logForm.cost) || 0,
        downtimeHours: Number(logForm.downtimeHours) || 0,
        scheduleId: logForm.scheduleId || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Maintenance recorded.");
      setLogging(false);
      setLogForm({ ...logForm, description: "", cost: "", downtimeHours: "" });
      router.refresh();
    });
  }

  function submitPlan() {
    if (!planForm.name.trim()) {
      toast.error("Name the schedule.");
      return;
    }
    start(async () => {
      const result = await createMaintenanceSchedule({
        assetId: asset.id,
        name: planForm.name,
        intervalDays: Number(planForm.intervalDays),
        firstDueAt: planForm.firstDueAt || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Schedule added.");
      setPlanning(false);
      setPlanForm({ name: "", intervalDays: "90", firstDueAt: "" });
      router.refresh();
    });
  }

  async function removePlan(schedule: Schedule) {
    const ok = await confirmDialog({
      title: `Delete "${schedule.name}"?`,
      description: "Maintenance already logged is kept.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) run(() => deleteMaintenanceSchedule(schedule.id), "Schedule deleted.");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/owner/assets"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Assets
          </Link>
          <h1 className="mt-2 text-[clamp(22px,2.4vw,30px)] font-semibold tracking-[-0.04em] text-text-primary">
            {asset.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="font-mono text-xs font-semibold text-text-tertiary">
              {asset.assetCode}
            </span>
            <StatusPill status={asset.status} />
            {asset.siteName ? (
              <Link
                href={asset.siteId ? `/owner/sites/${asset.siteId}` : "#"}
                className="text-[var(--brand)] hover:underline"
              >
                {asset.siteName}
              </Link>
            ) : asset.location ? (
              <span>{asset.location}</span>
            ) : null}
          </div>
        </div>
        <div className="w-44">
          <Select
            value={asset.status}
            onChange={(e) =>
              run(
                () => setAssetStatus(asset.id, e.currentTarget.value as AssetStatus),
                "Status updated.",
              )
            }
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanise(s)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <StatStrip>
        <Stat label="Purchase cost" value={formatMoney(asset.purchaseCost)} />
        <Stat label="Maintenance spend" value={formatMoney(asset.totalMaintenanceCost)} tone="warning" />
        <Stat label="Downtime hours" value={asset.totalDowntimeHours.toFixed(1)} />
        <Stat
          label="Warranty"
          value={asset.warrantyUntil ? formatDay(asset.warrantyUntil) : "None"}
          tone={
            asset.warrantyUntil && new Date(asset.warrantyUntil) > new Date() ? "success" : "neutral"
          }
        />
      </StatStrip>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Service history
            </p>
            <Button size="sm" onClick={() => setLogging(true)}>
              <Plus className="h-3.5 w-3.5" />
              Log maintenance
            </Button>
          </div>
          <div className="h-[480px] overflow-y-auto rounded-[16px] border border-border bg-surface p-4">
            {logs.length === 0 ? (
              <EmptyState
                title="No maintenance yet"
                description="Every service logged here feeds the cost and downtime totals above."
              />
            ) : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="rounded-[12px] border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">{l.type}</p>
                      <span className="text-[11px] text-text-tertiary">
                        {formatDay(l.performedAt)}
                      </span>
                    </div>
                    {l.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                        {l.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-text-tertiary">
                      {l.performedByName ?? "Unknown"} · {formatMoney(l.cost)} ·{" "}
                      {l.downtimeHours.toFixed(1)}h down
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Maintenance plans
              </p>
              <Button size="sm" variant="outline" onClick={() => setPlanning(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {schedules.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No recurring service planned for this asset.
                </p>
              ) : (
                schedules.map((s) => (
                  <div key={s.id} className="rounded-[12px] border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">{s.name}</p>
                      <StatusPill status={s.isActive ? (s.overdue ? "OVERDUE" : "ACTIVE") : "IDLE"} />
                    </div>
                    <p className="mt-1 text-[11px] text-text-tertiary">
                      Every {s.intervalDays} days · next {formatDay(s.nextDueAt)}
                    </p>
                    <div className="mt-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          run(() => setMaintenanceScheduleActive(s.id, !s.isActive))
                        }
                        disabled={pending}
                      >
                        {s.isActive ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => removePlan(s)}
                        disabled={pending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Details
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Category" value={asset.category} />
              <Row label="Manufacturer" value={asset.manufacturer} />
              <Row label="Model" value={asset.model} />
              <Row label="Serial" value={asset.serialNumber} />
              <Row label="Held by" value={asset.assignedToName} />
              <Row label="Purchased" value={formatDay(asset.purchaseDate)} />
            </dl>
            {asset.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">{asset.notes}</p>
            ) : null}
          </Card>
        </div>
      </div>

      <Dialog isOpen={logging} onClose={() => setLogging(false)}>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          Log maintenance
        </h2>
        <div className="mt-5 space-y-4">
          <FormGrid>
            <Field label="Type">
              <Select
                value={logForm.type}
                onChange={(e) => setLogForm({ ...logForm, type: e.currentTarget.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Performed on">
              <Input
                type="date"
                value={logForm.performedAt}
                onChange={(e) => setLogForm({ ...logForm, performedAt: e.currentTarget.value })}
              />
            </Field>
            <Field label="Cost">
              <Input
                type="number"
                min={0}
                value={logForm.cost}
                onChange={(e) => setLogForm({ ...logForm, cost: e.currentTarget.value })}
              />
            </Field>
            <Field label="Downtime (hours)">
              <Input
                type="number"
                min={0}
                step="0.5"
                value={logForm.downtimeHours}
                onChange={(e) => setLogForm({ ...logForm, downtimeHours: e.currentTarget.value })}
              />
            </Field>
          </FormGrid>

          <Field
            label="Satisfies plan"
            hint="Rolls that plan's next due date forward from today."
          >
            <OptionalSelect
              value={logForm.scheduleId}
              onChange={(v) => setLogForm({ ...logForm, scheduleId: v })}
              placeholder="Unplanned work"
              options={schedules.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>

          <Field label="What was done">
            <TextArea
              rows={3}
              value={logForm.description}
              onChange={(e) => setLogForm({ ...logForm, description: e.currentTarget.value })}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setLogging(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submitLog} disabled={pending}>
            {pending ? "Saving..." : "Record"}
          </Button>
        </div>
      </Dialog>

      <Dialog isOpen={planning} onClose={() => setPlanning(false)}>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          New maintenance plan
        </h2>
        <div className="mt-5 space-y-4">
          <Field label="Name">
            <Input
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.currentTarget.value })}
              placeholder="Quarterly service"
            />
          </Field>
          <FormGrid>
            <Field label="Every (days)">
              <Input
                type="number"
                min={1}
                value={planForm.intervalDays}
                onChange={(e) => setPlanForm({ ...planForm, intervalDays: e.currentTarget.value })}
              />
            </Field>
            <Field label="First due" hint="Defaults to one interval from today.">
              <Input
                type="date"
                value={planForm.firstDueAt}
                onChange={(e) => setPlanForm({ ...planForm, firstDueAt: e.currentTarget.value })}
              />
            </Field>
          </FormGrid>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPlanning(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submitPlan} disabled={pending}>
            {pending ? "Saving..." : "Add plan"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-text-secondary">{value ?? "—"}</dd>
    </div>
  );
}
