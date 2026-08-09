"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import type { ScheduleStatus } from "@prisma/client";

import { PageHeader } from "@/components/design/PageHeader";
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
  humanise,
} from "@/components/service/kit";
import {
  copyWeek,
  deleteSchedule,
  resolveSwap,
  scheduleShift,
  setScheduleStatus,
} from "@/server/actions/scheduling";

type ScheduleRow = {
  id: string;
  date: string;
  status: ScheduleStatus;
  notes: string | null;
  userId: string;
  userName: string;
  shiftId: string;
  shiftName: string;
  shiftTime: string;
  siteId: string | null;
  siteName: string | null;
};

type SwapRow = {
  id: string;
  status: string;
  reason: string | null;
  requestedByName: string;
  swapWithName: string | null;
  createdAt: string;
  scheduleDate: string;
  scheduleShift: string;
  scheduleSite: string | null;
  scheduleUserName: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUSES: ScheduleStatus[] = ["SCHEDULED", "ATTENDED", "ABSENT", "SWAPPED", "CANCELLED"];

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * The weekly roster grid: one row per person, one column per day.
 *
 * Person-by-day rather than shift-by-day because the question a supervisor asks
 * on a Monday morning is "where is Ramesh this week", not "who is on mornings".
 * The gaps in a row are the point — an empty cell is an unstaffed day.
 */
export function SchedulingClient({
  from,
  to,
  schedules,
  shifts,
  staff,
  sites,
  swaps,
}: {
  from: string;
  to: string;
  schedules: ScheduleRow[];
  shifts: { id: string; name: string; startTime: string; endTime: string }[];
  staff: { id: string; name: string }[];
  sites: { id: string; name: string; siteCode: string }[];
  swaps: SwapRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<ScheduleRow | null>(null);
  const [form, setForm] = useState({
    userId: "",
    shiftId: shifts[0]?.id ?? "",
    siteId: "",
    date: isoDay(new Date(from)),
    notes: "",
  });

  const weekStart = useMemo(() => new Date(from), [from]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS)),
    [weekStart],
  );

  // Only people who actually appear in the week get a row. A roster of two
  // hundred employees showing six is unreadable.
  const rosterUsers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of schedules) if (!seen.has(s.userId)) seen.set(s.userId, s.userName);
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  const cell = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const s of schedules) {
      const key = `${s.userId}|${s.date.slice(0, 10)}`;
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [schedules]);

  function goWeek(offset: number) {
    const next = new Date(weekStart.getTime() + offset * 7 * DAY_MS);
    router.push(`/owner/scheduling?from=${isoDay(next)}`);
  }

  function run(action: () => Promise<{ error?: string }>, done?: string) {
    start(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (done) toast.success(done);
      setDetail(null);
      router.refresh();
    });
  }

  function submit() {
    if (!form.userId || !form.shiftId) {
      toast.error("Pick a person and a shift.");
      return;
    }
    start(async () => {
      const result = await scheduleShift({
        userId: form.userId,
        shiftId: form.shiftId,
        siteId: form.siteId || null,
        date: form.date,
        notes: form.notes || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Shift scheduled.");
      setForm({ ...form, userId: "", notes: "" });
      router.refresh();
    });
  }

  async function copyForward() {
    const target = new Date(weekStart.getTime() + 7 * DAY_MS);
    const ok = await confirmDialog({
      title: "Copy this week forward?",
      description: `Every shift in this week is repeated in the week of ${formatDay(target.toISOString())}. Existing entries are left alone.`,
      confirmLabel: "Copy",
    });
    if (!ok) return;
    start(async () => {
      const result = await copyWeek({
        fromWeekStart: isoDay(weekStart),
        toWeekStart: isoDay(target),
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Copied ${"created" in result ? result.created : 0} shifts.`);
      router.push(`/owner/scheduling?from=${isoDay(target)}`);
    });
  }

  const label = `${formatDay(from)} — ${formatDay(to)}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        eyebrow="People"
        title="Scheduling"
        description="Who is working where, day by day. Gaps in a row are unstaffed days."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={copyForward} disabled={pending}>
              <Copy className="h-3.5 w-3.5" />
              Copy week
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              Schedule shift
            </Button>
          </div>
        }
      />

      <StatStrip>
        <Stat label="Shifts this week" value={schedules.length} tone="brand" />
        <Stat label="People rostered" value={rosterUsers.length} />
        <Stat
          label="Absent"
          value={schedules.filter((s) => s.status === "ABSENT").length}
          tone={schedules.some((s) => s.status === "ABSENT") ? "danger" : "success"}
        />
        <Stat label="Swap requests" value={swaps.length} tone={swaps.length ? "warning" : "neutral"} />
      </StatStrip>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => goWeek(-1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-text-primary">{label}</span>
          <Button variant="secondary" size="icon" onClick={() => goWeek(1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-stretch">
        <div className="min-h-0 overflow-auto rounded-[16px] border border-border bg-surface">
          {rosterUsers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Nothing scheduled this week"
                description="Schedule a shift, or copy last week's roster forward."
              />
            </div>
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
                <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  <th className="px-4 py-3">Person</th>
                  {days.map((d) => (
                    <th key={d.toISOString()} className="px-2 py-3 text-center">
                      <span className="block">
                        {d.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <span className="block text-[10px] font-normal normal-case tracking-normal text-text-tertiary">
                        {d.getUTCDate()}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rosterUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 font-medium text-text-primary">{u.name}</td>
                    {days.map((d) => {
                      const entries = cell.get(`${u.id}|${isoDay(d)}`) ?? [];
                      return (
                        <td key={d.toISOString()} className="px-2 py-2 align-top">
                          <div className="space-y-1">
                            {entries.map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => setDetail(e)}
                                className={
                                  e.status === "ABSENT"
                                    ? "block w-full rounded-[10px] border border-danger/30 bg-danger-soft/50 px-2 py-1.5 text-left text-[11px] transition-colors hover:border-danger/60"
                                    : e.status === "CANCELLED" || e.status === "SWAPPED"
                                      ? "block w-full rounded-[10px] border border-border bg-surface-2 px-2 py-1.5 text-left text-[11px] opacity-60 transition-colors hover:opacity-100"
                                      : "block w-full rounded-[10px] border border-[var(--brand)]/25 bg-[var(--brand)]/10 px-2 py-1.5 text-left text-[11px] transition-colors hover:border-[var(--brand)]/60"
                                }
                              >
                                <span className="block truncate font-semibold text-text-primary">
                                  {e.shiftName}
                                </span>
                                <span className="block truncate text-text-tertiary">
                                  {e.siteName ?? e.shiftTime}
                                </span>
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Card className="h-fit">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            Swap requests
          </p>
          <div className="mt-3 space-y-2">
            {swaps.length === 0 ? (
              <p className="text-sm text-text-secondary">Nothing waiting on a decision.</p>
            ) : (
              swaps.map((s) => (
                <div key={s.id} className="rounded-[12px] border border-border bg-surface-2 p-3">
                  <p className="text-sm font-medium text-text-primary">
                    {s.requestedByName} → {s.swapWithName ?? "anyone"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-tertiary">
                    {s.scheduleShift} · {formatDay(s.scheduleDate)}
                    {s.scheduleSite ? ` · ${s.scheduleSite}` : ""}
                  </p>
                  {s.reason ? (
                    <p className="mt-1 text-xs text-text-secondary">{s.reason}</p>
                  ) : null}
                  <div className="mt-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => run(() => resolveSwap(s.id, "APPROVED"), "Swap approved.")}
                      disabled={pending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => run(() => resolveSwap(s.id, "REJECTED"), "Swap rejected.")}
                      disabled={pending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Add a shift */}
      <Dialog isOpen={adding} onClose={() => setAdding(false)}>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          Schedule a shift
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          The sheet stays open so a whole day can be staffed without reopening it.
        </p>
        <div className="mt-5 space-y-4">
          <FormGrid>
            <Field label="Person">
              <OptionalSelect
                value={form.userId}
                onChange={(v) => setForm({ ...form, userId: v })}
                placeholder="Pick someone"
                options={staff.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
            <Field label="Shift">
              <Select
                value={form.shiftId}
                onChange={(e) => setForm({ ...form, shiftId: e.currentTarget.value })}
              >
                {shifts.length === 0 ? <option value="">No shifts defined</option> : null}
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.currentTarget.value })}
              />
            </Field>
            <Field
              label="Site"
              hint={sites.length === 0 ? "Enable the Sites module to post to a location." : undefined}
            >
              <OptionalSelect
                value={form.siteId}
                onChange={(v) => setForm({ ...form, siteId: v })}
                placeholder="No site"
                disabled={sites.length === 0}
                options={sites.map((s) => ({ value: s.id, label: `${s.name} (${s.siteCode})` }))}
              />
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })}
            />
          </Field>
          {shifts.length === 0 ? (
            <p className="text-[11px] text-warning">
              No shifts are defined yet. Add them in Settings before scheduling.
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAdding(false)} disabled={pending}>
            Done
          </Button>
          <Button onClick={submit} disabled={pending || shifts.length === 0}>
            {pending ? "Adding..." : "Add shift"}
          </Button>
        </div>
      </Dialog>

      {/* One scheduled shift */}
      <Dialog isOpen={detail !== null} onClose={() => setDetail(null)}>
        {detail ? (
          <>
            <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
              {detail.userName}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {detail.shiftName} ({detail.shiftTime}) · {formatDay(detail.date)}
              {detail.siteName ? ` · ${detail.siteName}` : ""}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <StatusPill status={detail.status} />
            </div>
            {detail.notes ? (
              <p className="mt-3 text-sm text-text-secondary">{detail.notes}</p>
            ) : null}

            <div className="mt-5">
              <Field label="Mark as">
                <Select
                  value={detail.status}
                  onChange={(e) =>
                    run(
                      () => setScheduleStatus(detail.id, e.currentTarget.value as ScheduleStatus),
                      "Updated.",
                    )
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {humanise(s)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-6 flex justify-between gap-2">
              <Button
                variant="ghost"
                className="text-danger"
                onClick={() => run(() => deleteSchedule(detail.id), "Shift removed.")}
                disabled={pending}
              >
                Remove from roster
              </Button>
              <Button variant="secondary" onClick={() => setDetail(null)} disabled={pending}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
