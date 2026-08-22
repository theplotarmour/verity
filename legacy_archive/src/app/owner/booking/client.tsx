"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Sheet } from "@/components/design/Sheet";
import { Button, Input, Select } from "@/components/ui/primitives";
import { formatPaise } from "@/lib/money";
import {
  type BookingRow,
  createAppointment,
  getBookingDay,
  getBookingWeek,
  setAppointmentStatus,
} from "@/server/actions/booking";

type View = "week" | "day";
type Staff = { id: string; name: string };

const IST = "Asia/Kolkata";
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: IST });
const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "short" });
const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short" });

/** IST calendar-day key (YYYY-MM-DD) for an instant. */
const keyOf = (d: Date) => dayKeyFmt.format(d);
/** Shift an IST day key by whole days. Noon anchor sidesteps any offset edge. */
function shiftKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00+05:30`);
  d.setDate(d.getDate() + days);
  return keyOf(d);
}
/** A representative instant (noon IST) for a day key, for labelling. */
const instantOf = (key: string) => new Date(`${key}T12:00:00+05:30`);

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning border-warning/30",
  CONFIRMED: "bg-accent-soft text-brand-strong border-[var(--brand)]/30",
  COMPLETED: "bg-success-soft text-success border-success/30",
  CANCELLED: "bg-surface-2 text-text-tertiary border-border line-through",
};

export function BookingClient({
  initialWeek,
  staff,
  canManage,
}: {
  initialWeek: BookingRow[];
  staff: Staff[];
  canManage: boolean;
}) {
  const [view, setView] = useState<View>("week");
  const [anchorKey, setAnchorKey] = useState<string>(() => keyOf(new Date()));
  const [rows, setRows] = useState<BookingRow[]>(initialWeek);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const refetch = (nextView: View, nextAnchor: string) => {
    startTransition(async () => {
      const fresh =
        nextView === "week"
          ? await getBookingWeek(instantOf(nextAnchor).toISOString())
          : await getBookingDay(instantOf(nextAnchor).toISOString());
      setRows(fresh);
    });
  };

  const go = (view_: View, anchor: string) => {
    setView(view_);
    setAnchorKey(anchor);
    refetch(view_, anchor);
  };

  const dayKeys = useMemo(
    () => (view === "week" ? Array.from({ length: 7 }, (_, i) => shiftKey(anchorKey, i)) : [anchorKey]),
    [view, anchorKey],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const key of dayKeys) map.set(key, []);
    for (const row of rows) {
      const key = keyOf(new Date(row.startTime));
      if (map.has(key)) map.get(key)!.push(row);
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [rows, dayKeys]);

  const rangeLabel =
    view === "week"
      ? `${dateFmt.format(instantOf(dayKeys[0]))} – ${dateFmt.format(instantOf(dayKeys[6]))}`
      : `${weekdayFmt.format(instantOf(anchorKey))}, ${dateFmt.format(instantOf(anchorKey))}`;

  const step = (dir: 1 | -1) => go(view, shiftKey(anchorKey, dir * (view === "week" ? 7 : 1)));

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-0.5">
      <PageHeader
        title="Bookings"
        description="The day's appointments, who's on them, and what's still open."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New booking
            </Button>
          ) : undefined
        }
      />

      {/* Controls: view toggle + date navigation. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-surface-2 p-1">
          {(["week", "day"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => go(v, anchorKey)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
                view === v ? "bg-[var(--brand)] text-white" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(view, keyOf(new Date()))}
            className="rounded-full border border-border px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-1 min-w-0 truncate text-sm font-medium text-text-secondary">{rangeLabel}</span>
        </div>
      </div>

      {/* The calendar. Bounded height with internal scroll so the outer layout
          stays put — one column on day view, seven that stretch on week view. */}
      <div
        className={`grid min-h-0 flex-1 items-stretch gap-3 overflow-y-auto ${
          view === "week" ? "grid-cols-2 md:grid-cols-4 xl:grid-cols-7" : "grid-cols-1"
        } ${pending ? "opacity-60 transition-opacity" : ""}`}
      >
        {dayKeys.map((key) => {
          const list = byDay.get(key) ?? [];
          const isToday = key === keyOf(new Date());
          return (
            <Surface
              key={key}
              className={`flex min-h-[280px] flex-col rounded-[24px] p-3 ${
                isToday ? "ring-1 ring-[var(--brand)]/40" : ""
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                  {weekdayFmt.format(instantOf(key))}
                </span>
                <span
                  className={`text-sm font-semibold ${isToday ? "text-brand-strong" : "text-text-primary"}`}
                >
                  {dateFmt.format(instantOf(key))}
                </span>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {list.length === 0 ? (
                  <p className="mt-6 px-1 text-center text-[12px] text-text-tertiary">Open</p>
                ) : (
                  list.map((row) => (
                    <BookingCard key={row.id} row={row} canManage={canManage} onChanged={() => refetch(view, anchorKey)} />
                  ))
                )}
              </div>
            </Surface>
          );
        })}
      </div>

      {canManage ? (
        <NewBookingSheet
          open={sheetOpen}
          staff={staff}
          defaultDayKey={anchorKey}
          onClose={() => setSheetOpen(false)}
          onCreated={() => {
            setSheetOpen(false);
            refetch(view, anchorKey);
          }}
        />
      ) : null}
    </div>
  );
}

function BookingCard({
  row,
  canManage,
  onChanged,
}: {
  row: BookingRow;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const change = (status: string) => {
    if (!canManage) return;
    setBusy(true);
    void setAppointmentStatus(row.id, status as never).then(() => {
      setBusy(false);
      onChanged();
    });
  };

  return (
    <div className={`rounded-[16px] border p-2.5 ${STATUS_STYLE[row.status] ?? "border-border bg-surface-2"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[12px] font-semibold">{timeFmt.format(new Date(row.startTime))}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{row.status}</span>
      </div>
      <p className="mt-1 truncate text-[13px] font-semibold text-text-primary">{row.customerName}</p>
      <p className="truncate text-[12px] text-text-secondary">{row.serviceName}</p>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-text-tertiary">
        <span className="truncate">{row.staffName ?? "Unassigned"}</span>
        {row.pricePaise > 0 ? <span className="font-mono">{formatPaise(row.pricePaise)}</span> : null}
      </div>

      {canManage && row.status !== "COMPLETED" && row.status !== "CANCELLED" ? (
        <div className="mt-2 flex gap-1.5">
          {row.status === "PENDING" ? (
            <MiniButton disabled={busy} onClick={() => change("CONFIRMED")}>
              Confirm
            </MiniButton>
          ) : (
            <MiniButton disabled={busy} onClick={() => change("COMPLETED")}>
              Complete
            </MiniButton>
          )}
          <MiniButton disabled={busy} muted onClick={() => change("CANCELLED")}>
            Cancel
          </MiniButton>
        </div>
      ) : null}
    </div>
  );
}

function MiniButton({
  children,
  onClick,
  disabled,
  muted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
        muted
          ? "border border-border text-text-secondary hover:text-text-primary"
          : "bg-[var(--brand)] text-white hover:brightness-110"
      }`}
    >
      {children}
    </button>
  );
}

function NewBookingSheet({
  open,
  staff,
  defaultDayKey,
  onClose,
  onCreated,
}: {
  open: boolean;
  staff: Staff[];
  defaultDayKey: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [date, setDate] = useState(defaultDayKey);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [staffId, setStaffId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const iso = (time: string) => new Date(`${date}T${time}:00+05:30`).toISOString();

  const submit = () => {
    setError(null);
    setSaving(true);
    void createAppointment({
      customerName,
      customerPhone: customerPhone || undefined,
      serviceName,
      pricePaise: Math.round((parseFloat(price) || 0) * 100),
      staffId: staffId || null,
      startTime: iso(start),
      endTime: iso(end),
      notes: notes || undefined,
    }).then((res) => {
      setSaving(false);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      // Reset for the next entry.
      setCustomerName("");
      setCustomerPhone("");
      setServiceName("");
      setPrice("");
      setNotes("");
      onCreated();
    });
  };

  return (
    <Sheet open={open} title="New booking" description="Block a slot of a staff member's time." onClose={onClose}>
      <div className="space-y-3">
        <Field label="Customer">
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name" />
        </Field>
        <Field label="Phone (optional)">
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone" inputMode="tel" />
        </Field>
        <Field label="Service">
          <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Hair styling" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)">
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" inputMode="decimal" />
          </Field>
          <Field label="Staff">
            <Select value={staffId} onChange={(e) => setStaffId((e.target as HTMLSelectElement).value)}>
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the stylist should know" />
        </Field>

        {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Book"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">{label}</span>
      {children}
    </label>
  );
}
