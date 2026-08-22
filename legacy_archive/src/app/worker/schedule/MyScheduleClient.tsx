"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Repeat } from "lucide-react";

import { Button, EmptyState, Select, TextArea } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import { StatusPill, formatDay } from "@/components/service/kit";
import { requestSwap } from "@/server/actions/scheduling";

type Shift = {
  id: string;
  date: string;
  status: string;
  shiftName: string;
  shiftTime: string;
  siteName: string | null;
};

/**
 * A worker's own roster, and the one action they can take on it.
 *
 * The manager's grid answers "who is covering Tuesday". This answers "where am
 * I tomorrow", which is the only question a person on the floor actually has.
 * Grouped by day rather than listed flat, because two shifts on one date is
 * the case that needs to be obvious.
 */
export function MyScheduleClient({
  shifts,
  colleagues,
}: {
  shifts: Shift[];
  colleagues: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [swapping, setSwapping] = useState<Shift | null>(null);
  const [form, setForm] = useState({ swapWithId: "", reason: "" });

  const today = new Date().toISOString().slice(0, 10);

  function submit() {
    if (!swapping) return;
    start(async () => {
      const result = await requestSwap({
        scheduleId: swapping.id,
        swapWithId: form.swapWithId || null,
        reason: form.reason || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Swap requested. Your supervisor will confirm it.");
      setSwapping(null);
      setForm({ swapWithId: "", reason: "" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
          Next three weeks
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-text-primary">
          My schedule
        </h1>
      </div>

      {shifts.length === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          description="When your supervisor publishes the roster, your shifts appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {shifts.map((s) => {
            const isToday = s.date.slice(0, 10) === today;
            return (
              <div
                key={s.id}
                className={
                  isToday
                    ? "rounded-2xl border border-[var(--brand)]/40 bg-[var(--brand-soft)] p-4"
                    : "rounded-2xl border border-border bg-surface p-4"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                      <CalendarDays className="h-3 w-3" />
                      {isToday ? "Today" : formatDay(s.date)}
                    </p>
                    <p className="mt-1.5 font-display text-[15px] font-semibold text-text-primary">
                      {s.shiftName}
                    </p>
                    <p className="font-mono text-xs text-text-secondary">{s.shiftTime}</p>
                    {s.siteName ? (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-text-secondary">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {s.siteName}
                      </p>
                    ) : null}
                  </div>
                  <StatusPill status={s.status} />
                </div>

                {s.status === "SCHEDULED" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => setSwapping(s)}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    Request swap
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Dialog isOpen={swapping !== null} onClose={() => setSwapping(null)}>
        {swapping ? (
          <>
            <h2 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-text-primary">
              Request a swap
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {swapping.shiftName} on {formatDay(swapping.date)}
              {swapping.siteName ? ` at ${swapping.siteName}` : ""}. Your supervisor has to
              approve it — the shift stays yours until they do.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  Cover suggested
                </span>
                <Select
                  value={form.swapWithId}
                  onChange={(e) => setForm({ ...form, swapWithId: e.currentTarget.value })}
                >
                  <option value="">No one in particular</option>
                  {colleagues.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <span className="block text-[11px] text-text-tertiary">
                  A swap cannot be approved without a named replacement, so naming one here is
                  the fastest route.
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  Reason
                </span>
                <TextArea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.currentTarget.value })}
                  placeholder="Why you need the shift covered."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSwapping(null)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Sending..." : "Send request"}
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
