"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge, Input, Select, TextArea } from "@/components/ui/primitives";

/**
 * Shared furniture for the six service modules.
 *
 * Helpdesk, work orders, sites, projects, assets, scheduling and billing are
 * the same screen seven times over: a stat strip, a filter row, a table of
 * status-coloured rows, and a form in a sheet. Building each one from scratch
 * is how they drift — one uses amber for "pending", the next uses grey.
 *
 * These are deliberately thin. They wrap the existing primitives rather than
 * replacing them, so a page can drop out of the kit at any point.
 */

// --- Status colour ---------------------------------------------------------

type Tone = "default" | "success" | "warning" | "danger" | "neutral";

/**
 * One vocabulary of status colour for every service module.
 *
 * Keyed on the enum member name, which is shared across models on purpose:
 * OPEN means the same thing on a ticket and a work order, so it must not be a
 * different colour on each screen.
 */
const STATUS_TONE: Record<string, Tone> = {
  // Live and healthy
  ACTIVE: "success",
  DONE: "success",
  COMPLETED: "success",
  RESOLVED: "success",
  PAID: "success",
  APPROVED: "success",
  ATTENDED: "success",
  FINALISED: "success",

  // In flight
  IN_PROGRESS: "default",
  ASSIGNED: "default",
  SCHEDULED: "default",
  SENT: "default",
  PLANNING: "default",
  EXPORTED: "default",

  // Waiting on someone
  OPEN: "warning",
  TODO: "warning",
  PENDING: "warning",
  PENDING_PARTS: "warning",
  WAITING_ON_CUSTOMER: "warning",
  ON_HOLD: "warning",
  IN_REPAIR: "warning",
  DRAFT: "warning",
  IDLE: "warning",

  // Wrong
  BLOCKED: "danger",
  OVERDUE: "danger",
  ABSENT: "danger",
  REJECTED: "danger",
  URGENT: "danger",

  // Finished with, not celebrated
  CLOSED: "neutral",
  CANCELLED: "neutral",
  TERMINATED: "neutral",
  RETIRED: "neutral",
  DISPOSED: "neutral",
  SWAPPED: "neutral",
};

const PRIORITY_TONE: Record<string, Tone> = {
  LOW: "neutral",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "danger",
};

export function humanise(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={STATUS_TONE[status] ?? "neutral"} className={className}>
      {humanise(status)}
    </Badge>
  );
}

export function PriorityPill({ priority }: { priority: string }) {
  return <Badge variant={PRIORITY_TONE[priority] ?? "neutral"}>{humanise(priority)}</Badge>;
}

// --- Stats -----------------------------------------------------------------

export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "brand" | "warning" | "danger" | "success";
}) {
  const valueTone = {
    neutral: "text-text-primary",
    brand: "text-[var(--brand)]",
    warning: "text-warning",
    danger: "text-danger",
    success: "text-success",
  }[tone];

  return (
    <div className="rounded-[16px] border border-border bg-surface p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
        {label}
      </p>
      <p className={cn("mt-2 font-mono text-2xl font-bold tracking-[-0.04em]", valueTone)}>
        {value}
      </p>
    </div>
  );
}

// --- Filters ---------------------------------------------------------------

/**
 * A row of exclusive filter pills. "All" is always first and is the value
 * `null`, so a caller never has to invent a sentinel string for "no filter".
 */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  allLabel = "All",
}: {
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
  allLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <FilterPill active={value === null} onClick={() => onChange(null)}>
        {allLabel}
      </FilterPill>
      {options.map((option) => (
        <FilterPill key={option} active={value === option} onClick={() => onChange(option)}>
          {humanise(option)}
        </FilterPill>
      ))}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "border-transparent bg-[var(--brand)] text-white"
          : "border-border bg-transparent text-text-secondary hover:border-[var(--brand)]/50 hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

// --- Forms -----------------------------------------------------------------

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-text-tertiary">{hint}</span> : null}
    </label>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/** A `<Select>` with a blank first option, for every optional foreign key. */
export function OptionalSelect({
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Select value={value} disabled={disabled} onChange={(e) => onChange(e.currentTarget.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export { Input, TextArea, Select };

// --- Dates -----------------------------------------------------------------

/** ISO string to `yyyy-mm-dd`, the only format a date input accepts. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * How far past due, in plain words. Returns null when there is no deadline or
 * it has not passed — the caller renders nothing rather than "0 hours late".
 */
export function overdueBy(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return null;
  const diffMs = Date.now() - due;
  if (diffMs <= 0) return null;
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h late`;
  return `${Math.floor(hours / 24)}d late`;
}
