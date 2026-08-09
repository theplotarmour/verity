"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import type { SiteStatus } from "@prisma/client";

import { Button, Card, EmptyState, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  Field,
  FormGrid,
  OptionalSelect,
  PriorityPill,
  Select,
  Stat,
  StatStrip,
  StatusPill,
  formatDay,
  humanise,
} from "@/components/service/kit";
import {
  deployStaff,
  endDeployment,
  removeDeployment,
  setSiteStatus,
} from "@/server/actions/sites";

type Site = {
  id: string;
  name: string;
  siteCode: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: SiteStatus;
  customerName: string | null;
  managerName: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  slaHours: number | null;
  notes: string | null;
};

type Deployment = {
  id: string;
  userId: string;
  userName: string;
  role: string | null;
  shiftName: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};

const TABS = ["Roster", "Work", "Inspections"] as const;
type Tab = (typeof TABS)[number];

const STATUSES: SiteStatus[] = ["ACTIVE", "ON_HOLD", "TERMINATED"];

/**
 * One site: who is posted here, what work is outstanding, and what has been
 * inspected. Three tabs rather than three stacked sections — a site with a
 * year of history would otherwise be a very long page.
 */
export function SiteDetailClient({
  site,
  deployments,
  workOrders,
  tickets,
  inspections,
  users,
  shifts,
}: {
  site: Site;
  deployments: Deployment[];
  workOrders: {
    id: string;
    woNumber: string;
    title: string;
    status: string;
    priority: string;
    assignedToName: string | null;
    scheduledAt: string | null;
    slaDueAt: string | null;
  }[];
  tickets: {
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
  }[];
  inspections: {
    id: string;
    status: string;
    checklistName: string;
    woNumber: string;
    submittedAt: string | null;
    approvedAt: string | null;
    createdAt: string;
  }[];
  users: { id: string; name: string }[];
  shifts: { id: string; name: string; startTime: string; endTime: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("Roster");
  const [deploying, setDeploying] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    role: "",
    shiftId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  });

  const active = deployments.filter((d) => d.isActive);
  const past = deployments.filter((d) => !d.isActive);

  function submitDeployment() {
    if (!form.userId) {
      toast.error("Pick someone to deploy.");
      return;
    }
    start(async () => {
      const result = await deployStaff({
        siteId: site.id,
        userId: form.userId,
        role: form.role || null,
        shiftId: form.shiftId || null,
        startDate: form.startDate,
        endDate: form.endDate || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Deployed.");
      setDeploying(false);
      setForm({ ...form, userId: "", role: "" });
      router.refresh();
    });
  }

  // Ending a posting is the normal path and keeps it in history. Removing one
  // is for a posting that should never have existed — a wrong name, a
  // duplicate — where leaving it in "Past postings" states something untrue.
  async function remove(deployment: Deployment) {
    const ok = await confirmDialog({
      title: `Remove ${deployment.userName} from the roster?`,
      description: "The posting is erased rather than closed. Use End if they simply left.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    start(async () => {
      const result = await removeDeployment(deployment.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function end(deployment: Deployment) {
    const ok = await confirmDialog({
      title: `End ${deployment.userName}'s posting?`,
      description: "They stop counting toward this site's headcount from today.",
      confirmLabel: "End posting",
    });
    if (!ok) return;
    start(async () => {
      const result = await endDeployment(deployment.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function changeStatus(next: SiteStatus) {
    start(async () => {
      const result = await setSiteStatus(site.id, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Site status updated.");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/owner/sites"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Sites
          </Link>
          <h1 className="mt-2 text-[clamp(22px,2.4vw,30px)] font-semibold tracking-[-0.04em] text-text-primary">
            {site.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="font-mono text-xs font-semibold text-text-tertiary">
              {site.siteCode}
            </span>
            <StatusPill status={site.status} />
            {site.customerName ? <span>{site.customerName}</span> : null}
            {site.city ? <span>{[site.city, site.state].filter(Boolean).join(", ")}</span> : null}
          </div>
        </div>
        <div className="w-44">
          <Select
            value={site.status}
            onChange={(e) => changeStatus(e.currentTarget.value as SiteStatus)}
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
        <Stat label="Staff on site" value={active.length} tone="brand" />
        <Stat label="Open work orders" value={workOrders.filter((w) => w.status !== "COMPLETED" && w.status !== "CANCELLED").length} />
        <Stat label="Open tickets" value={tickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length} />
        <Stat label="SLA window" value={site.slaHours ? `${site.slaHours}h` : "—"} />
      </StatStrip>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    tab === t
                      ? "rounded-full border border-transparent bg-[var(--brand)] px-3 py-1.5 text-[11px] font-semibold text-white"
                      : "rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === "Roster" ? (
              <Button size="sm" onClick={() => setDeploying(true)}>
                <Plus className="h-3.5 w-3.5" />
                Deploy staff
              </Button>
            ) : null}
          </div>

          <div className="h-[520px] overflow-y-auto rounded-[16px] border border-border bg-surface p-4">
            {tab === "Roster" ? (
              active.length === 0 && past.length === 0 ? (
                <EmptyState
                  title="Nobody posted here"
                  description="Deploy staff and they will show on this roster."
                />
              ) : (
                <div className="space-y-4">
                  <RosterSection
                    title={`Currently deployed (${active.length})`}
                    rows={active}
                    onEnd={end}
                    onRemove={remove}
                    pending={pending}
                  />
                  {past.length > 0 ? (
                    <RosterSection
                      title={`Past postings (${past.length})`}
                      rows={past}
                      onRemove={remove}
                      pending={pending}
                    />
                  ) : null}
                </div>
              )
            ) : tab === "Work" ? (
              workOrders.length === 0 && tickets.length === 0 ? (
                <EmptyState
                  title="No work at this site"
                  description="Tickets and work orders raised here will be listed."
                />
              ) : (
                <div className="space-y-4">
                  {workOrders.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                        Work orders
                      </p>
                      <div className="space-y-2">
                        {workOrders.map((w) => (
                          <div
                            key={w.id}
                            className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface-2 p-3"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                                {w.woNumber}
                              </span>
                              <p className="truncate text-sm font-medium text-text-primary">
                                {w.title}
                              </p>
                              <p className="text-[11px] text-text-tertiary">
                                {w.assignedToName ?? "Unassigned"}
                                {w.scheduledAt ? ` · ${formatDay(w.scheduledAt)}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <PriorityPill priority={w.priority} />
                              <StatusPill status={w.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {tickets.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                        Tickets
                      </p>
                      <div className="space-y-2">
                        {tickets.map((t) => (
                          <Link
                            key={t.id}
                            href={`/owner/helpdesk/${t.id}`}
                            className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface-2 p-3 transition-colors hover:border-[var(--brand)]/40"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                                {t.ticketNumber}
                              </span>
                              <p className="truncate text-sm font-medium text-text-primary">
                                {t.subject}
                              </p>
                              <p className="text-[11px] text-text-tertiary">
                                {formatDay(t.createdAt)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <PriorityPill priority={t.priority} />
                              <StatusPill status={t.status} />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            ) : inspections.length === 0 ? (
              <EmptyState
                title="No inspections"
                description="Quality inspections recorded against this site will appear here."
              />
            ) : (
              <div className="space-y-2">
                {inspections.map((i) => (
                  <Link
                    key={i.id}
                    href={`/owner/service-work-orders/inspection/${i.id}`}
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface-2 p-3 transition-colors hover:border-[var(--brand)]/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {i.checklistName}
                        <span className="ml-1.5 font-mono text-[11px] text-text-tertiary">
                          {i.woNumber}
                        </span>
                      </p>
                      <p className="text-[11px] text-text-tertiary">
                        {i.approvedAt
                          ? `Approved ${formatDay(i.approvedAt)}`
                          : i.submittedAt
                            ? `Submitted ${formatDay(i.submittedAt)}`
                            : "Not submitted"}
                      </p>
                    </div>
                    <StatusPill status={i.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <Card className="h-fit">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            Contract
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Client" value={site.customerName} />
            <Row label="Manager" value={site.managerName} />
            <Row label="Starts" value={formatDay(site.contractStart)} />
            <Row label="Ends" value={formatDay(site.contractEnd)} />
            <Row label="SLA" value={site.slaHours ? `${site.slaHours} hours` : null} />
          </dl>
          {site.address ? (
            <>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Address
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-secondary">
                {site.address}
              </p>
            </>
          ) : null}
          {site.notes ? (
            <>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Notes
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-secondary">{site.notes}</p>
            </>
          ) : null}
        </Card>
      </div>

      <Dialog isOpen={deploying} onClose={() => setDeploying(false)}>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          Deploy staff to {site.name}
        </h2>
        <div className="mt-5 space-y-4">
          <Field label="Person">
            <OptionalSelect
              value={form.userId}
              onChange={(v) => setForm({ ...form, userId: v })}
              placeholder="Pick someone"
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </Field>
          <FormGrid>
            <Field label="Role on site">
              <Input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.currentTarget.value })}
                placeholder="Guard, Supervisor, Technician"
              />
            </Field>
            <Field label="Shift">
              <OptionalSelect
                value={form.shiftId}
                onChange={(v) => setForm({ ...form, shiftId: v })}
                placeholder="No fixed shift"
                options={shifts.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.startTime}–${s.endTime})`,
                }))}
              />
            </Field>
            <Field label="From">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.currentTarget.value })}
              />
            </Field>
            <Field label="Until" hint="Leave blank for an open-ended posting.">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.currentTarget.value })}
              />
            </Field>
          </FormGrid>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeploying(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submitDeployment} disabled={pending}>
            {pending ? "Deploying..." : "Deploy"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function RosterSection({
  title,
  rows,
  onEnd,
  onRemove,
  pending,
}: {
  title: string;
  rows: Deployment[];
  onEnd?: (row: Deployment) => void;
  onRemove?: (row: Deployment) => void;
  pending?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
        {title}
      </p>
      <div className="space-y-2">
        {rows.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface-2 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{d.userName}</p>
              <p className="text-[11px] text-text-tertiary">
                {[d.role, d.shiftName].filter(Boolean).join(" · ") || "No role set"}
              </p>
              <p className="text-[11px] text-text-tertiary">
                {formatDay(d.startDate)} — {d.endDate ? formatDay(d.endDate) : "present"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onEnd ? (
                <Button size="sm" variant="ghost" onClick={() => onEnd(d)} disabled={pending}>
                  End
                </Button>
              ) : null}
              {onRemove ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => onRemove(d)}
                  disabled={pending}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
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
