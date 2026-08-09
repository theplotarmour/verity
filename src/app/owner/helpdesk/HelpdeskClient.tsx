"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { TicketPriority, TicketStatus } from "@prisma/client";

import { PageHeader } from "@/components/design/PageHeader";
import { Button, EmptyState, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import {
  Field,
  FilterPills,
  FormGrid,
  OptionalSelect,
  PriorityPill,
  Stat,
  StatStrip,
  StatusPill,
  Select,
  TextArea,
  formatDay,
  overdueBy,
} from "@/components/service/kit";
import { createTicket } from "@/server/actions/helpdesk";

export type TicketRow = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: string | null;
  customerName: string | null;
  siteId: string | null;
  siteName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  createdAt: string;
  commentCount: number;
  workOrderCount: number;
};

type Option = { id: string; name: string; companyName?: string | null };

const STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const BLANK = {
  subject: "",
  description: "",
  category: "",
  priority: "MEDIUM" as TicketPriority,
  customerId: "",
  siteId: "",
  assignedToId: "",
};

/**
 * The ticket queue.
 *
 * Sorted by what needs attention rather than by recency: a breached SLA sits at
 * the top regardless of age, because the whole point of recording an SLA is
 * that the list re-orders itself when one is about to be missed.
 */
export function HelpdeskClient({
  tickets,
  customers,
  agents,
  sites,
  stats,
}: {
  tickets: TicketRow[];
  customers: Option[];
  agents: Option[];
  sites: { id: string; name: string; siteCode: string }[];
  stats: { open: number; inProgress: number; waiting: number; breached: number } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TicketStatus | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = tickets.filter((t) => {
      if (status && t.status !== status) return false;
      if (!q) return true;
      return [t.ticketNumber, t.subject, t.customerName, t.siteName, t.assignedToName, t.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const priorityRank: Record<TicketPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...filtered].sort((a, b) => {
      if (a.slaBreached !== b.slaBreached) return a.slaBreached ? -1 : 1;
      if (a.priority !== b.priority) return priorityRank[a.priority] - priorityRank[b.priority];
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [tickets, query, status]);

  function submit() {
    if (!form.subject.trim()) {
      toast.error("A subject is required.");
      return;
    }
    start(async () => {
      const result = await createTicket({
        subject: form.subject,
        description: form.description || null,
        category: form.category || null,
        priority: form.priority,
        customerId: form.customerId || null,
        siteId: form.siteId || null,
        assignedToId: form.assignedToId || null,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ticket raised.");
      setCreating(false);
      setForm(BLANK);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        eyebrow="Service"
        title="Helpdesk"
        description="Every request in one queue, ordered by what is closest to breaching its SLA."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New ticket
          </Button>
        }
      />

      {stats ? (
        <StatStrip>
          <Stat label="Open" value={stats.open} tone="warning" />
          <Stat label="In progress" value={stats.inProgress} tone="brand" />
          <Stat label="Waiting on client" value={stats.waiting} />
          <Stat label="SLA breached" value={stats.breached} tone={stats.breached ? "danger" : "success"} />
        </StatStrip>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills options={STATUSES} value={status} onChange={setStatus} />
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search tickets..."
            className="pl-9"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="Nothing in the queue"
          description={
            tickets.length === 0
              ? "Raise the first ticket and it will appear here."
              : "No ticket matches that filter."
          }
        />
      ) : (
        // The page itself must not scroll; the list does. Anything else and the
        // stat strip walks off the top the moment the queue gets long.
        <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Client / Site</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((t) => {
                const late = t.slaBreached ? overdueBy(t.slaDueAt) : null;
                return (
                  <tr key={t.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link href={`/owner/helpdesk/${t.id}`} className="block min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                          {t.ticketNumber}
                        </span>
                        <span className="block truncate font-semibold text-text-primary">
                          {t.subject}
                        </span>
                        {t.category ? (
                          <span className="text-[11px] text-text-tertiary">{t.category}</span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <span className="block truncate">{t.customerName ?? "—"}</span>
                      {t.siteName ? (
                        <span className="block truncate text-[11px] text-text-tertiary">
                          {t.siteName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{t.assignedToName ?? "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <PriorityPill priority={t.priority} />
                    </td>
                    <td className="px-4 py-3">
                      {t.slaDueAt ? (
                        <span className={late ? "text-xs font-semibold text-danger" : "text-xs text-text-secondary"}>
                          {late ?? formatDay(t.slaDueAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog isOpen={creating} onClose={() => setCreating(false)} className="max-w-2xl">
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">New ticket</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Pick a site and the SLA deadline is stamped from that site&apos;s contract.
        </p>

        <div className="mt-5 space-y-4">
          <Field label="Subject">
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.currentTarget.value })}
              placeholder="Lift out of service in Block A"
            />
          </Field>

          <Field label="Description">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
              placeholder="What happened, and what has been tried."
            />
          </Field>

          <FormGrid>
            <Field label="Priority">
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.currentTarget.value as TicketPriority })
                }
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Category">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.currentTarget.value })}
                placeholder="Electrical, Cleaning, Access..."
              />
            </Field>

            <Field label="Client">
              <OptionalSelect
                value={form.customerId}
                onChange={(v) => setForm({ ...form, customerId: v })}
                placeholder="No client"
                options={customers.map((c) => ({ value: c.id, label: c.companyName ?? c.name }))}
              />
            </Field>

            <Field
              label="Site"
              hint={sites.length === 0 ? "Enable the Sites module to attach a site." : undefined}
            >
              <OptionalSelect
                value={form.siteId}
                onChange={(v) => setForm({ ...form, siteId: v })}
                placeholder="No site"
                disabled={sites.length === 0}
                options={sites.map((s) => ({ value: s.id, label: `${s.name} (${s.siteCode})` }))}
              />
            </Field>

            <Field label="Assign to">
              <OptionalSelect
                value={form.assignedToId}
                onChange={(v) => setForm({ ...form, assignedToId: v })}
                placeholder="Leave unassigned"
                options={agents.map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
          </FormGrid>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreating(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Raising..." : "Raise ticket"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
