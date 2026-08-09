"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Plus } from "lucide-react";
import type { TicketStatus } from "@prisma/client";

import { Button, Card, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  Field,
  FormGrid,
  OptionalSelect,
  PriorityPill,
  Select,
  StatusPill,
  TextArea,
  formatDay,
  humanise,
  overdueBy,
} from "@/components/service/kit";
import {
  addTicketComment,
  assignTicket,
  createServiceWorkOrder,
  deleteTicket,
  setTicketStatus,
} from "@/server/actions/helpdesk";

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string | null;
  category: string | null;
  status: TicketStatus;
  priority: string;
  customerId: string | null;
  customerName: string | null;
  siteId: string | null;
  siteName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  reportedByName: string | null;
  slaDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
};

type Comment = {
  id: string;
  body: string;
  isInternal: boolean;
  authorName: string;
  createdAt: string;
};

type WorkOrder = {
  id: string;
  woNumber: string;
  title: string;
  status: string;
  priority: string;
  assignedToName: string | null;
  scheduledAt: string | null;
};

const STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

/**
 * One ticket: the thread on the left, the controls and the work it spawned on
 * the right. Status and assignee are single-click controls rather than fields
 * inside an edit form — those two change many times over a ticket's life, and
 * everything else changes once.
 */
export function TicketDetailClient({
  ticket,
  comments,
  workOrders,
  agents,
  sites,
}: {
  ticket: Ticket;
  comments: Comment[];
  workOrders: WorkOrder[];
  agents: { id: string; name: string }[];
  sites: { id: string; name: string; siteCode: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [woForm, setWoForm] = useState({
    title: ticket.subject,
    category: "Corrective",
    assignedToId: ticket.assignedToId ?? "",
    scheduledAt: "",
  });

  const late = overdueBy(ticket.slaDueAt);

  function run(action: () => Promise<{ error?: string; success?: boolean }>, done: string) {
    start(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
      router.refresh();
    });
  }

  function comment() {
    if (!body.trim()) {
      toast.error("Write something first.");
      return;
    }
    start(async () => {
      const result = await addTicketComment({
        ticketId: ticket.id,
        body,
        isInternal: internal,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function dispatch() {
    if (!woForm.title.trim()) {
      toast.error("A title is required.");
      return;
    }
    start(async () => {
      const result = await createServiceWorkOrder({
        title: woForm.title,
        category: woForm.category || null,
        customerId: ticket.customerId,
        siteId: ticket.siteId,
        assignedToId: woForm.assignedToId || null,
        ticketId: ticket.id,
        scheduledAt: woForm.scheduledAt || null,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Work order dispatched.");
      setDispatching(false);
      router.refresh();
    });
  }

  async function remove() {
    const ok = await confirmDialog({
      title: `Delete ${ticket.ticketNumber}?`,
      description: "The thread goes with it, and any linked work orders lose their ticket.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    start(async () => {
      const result = await deleteTicket(ticket.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push("/owner/helpdesk");
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/owner/helpdesk"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Helpdesk
          </Link>
          <h1 className="mt-2 text-[clamp(22px,2.4vw,30px)] font-semibold tracking-[-0.04em] text-text-primary">
            {ticket.subject}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-text-tertiary">
              {ticket.ticketNumber}
            </span>
            <StatusPill status={ticket.status} />
            <PriorityPill priority={ticket.priority} />
            {late ? (
              <span className="text-xs font-semibold text-danger">SLA {late}</span>
            ) : ticket.slaDueAt ? (
              <span className="text-xs text-text-secondary">Due {formatDay(ticket.slaDueAt)}</span>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" onClick={remove} disabled={pending} className="text-danger">
          Delete
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        {/* Thread */}
        <div className="flex min-h-0 flex-col gap-4">
          {ticket.description ? (
            <Card>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Reported {ticket.reportedByName ? `by ${ticket.reportedByName}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                {ticket.description}
              </p>
            </Card>
          ) : null}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="rounded-[16px] border border-dashed border-border bg-surface-2 p-6 text-center text-sm text-text-secondary">
                No updates yet.
              </p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className={
                    c.isInternal
                      ? "rounded-[16px] border border-warning/25 bg-warning-soft/40 p-4"
                      : "rounded-[16px] border border-border bg-surface p-4"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-text-primary">{c.authorName}</p>
                    <div className="flex items-center gap-2">
                      {c.isInternal ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-warning">
                          <Lock className="h-3 w-3" />
                          Internal
                        </span>
                      ) : null}
                      <span className="text-[11px] text-text-tertiary">{formatDay(c.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{c.body}</p>
                </div>
              ))
            )}
          </div>

          <Card>
            <TextArea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.currentTarget.value)}
              placeholder="Add an update..."
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-secondary">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.currentTarget.checked)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                Internal note — not shown to the client
              </label>
              <Button size="sm" onClick={comment} disabled={pending}>
                Post
              </Button>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Status
            </p>
            <div className="mt-3">
              <Select
                value={ticket.status}
                onChange={(e) =>
                  run(
                    () => setTicketStatus(ticket.id, e.currentTarget.value as TicketStatus),
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

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Assignee
            </p>
            <div className="mt-3">
              <OptionalSelect
                value={ticket.assignedToId ?? ""}
                placeholder="Unassigned"
                onChange={(v) => run(() => assignTicket(ticket.id, v || null), "Assignee updated.")}
                options={agents.map((a) => ({ value: a.id, label: a.name }))}
              />
            </div>
          </Card>

          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Details
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <Detail label="Client" value={ticket.customerName} />
              <Detail
                label="Site"
                value={
                  ticket.siteId && ticket.siteName ? (
                    <Link
                      href={`/owner/sites/${ticket.siteId}`}
                      className="text-[var(--brand)] hover:underline"
                    >
                      {ticket.siteName}
                    </Link>
                  ) : null
                }
              />
              <Detail label="Category" value={ticket.category} />
              <Detail label="Raised" value={formatDay(ticket.createdAt)} />
              <Detail label="Resolved" value={ticket.resolvedAt ? formatDay(ticket.resolvedAt) : null} />
            </dl>
            {sites.length === 0 ? (
              <p className="mt-3 text-[11px] text-text-tertiary">
                Enable the Sites module to link tickets to a client site.
              </p>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Work orders
              </p>
              <Button size="sm" variant="outline" onClick={() => setDispatching(true)}>
                <Plus className="h-3.5 w-3.5" />
                Dispatch
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {workOrders.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No visit dispatched for this ticket yet.
                </p>
              ) : (
                workOrders.map((w) => (
                  <div key={w.id} className="rounded-[12px] border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                        {w.woNumber}
                      </span>
                      <StatusPill status={w.status} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-text-primary">{w.title}</p>
                    <p className="text-[11px] text-text-tertiary">
                      {w.assignedToName ?? "Unassigned"}
                      {w.scheduledAt ? ` · ${formatDay(w.scheduledAt)}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <Dialog isOpen={dispatching} onClose={() => setDispatching(false)}>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          Dispatch a work order
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          The client and site carry over from {ticket.ticketNumber}.
        </p>
        <div className="mt-5 space-y-4">
          <Field label="Title">
            <Input
              value={woForm.title}
              onChange={(e) => setWoForm({ ...woForm, title: e.currentTarget.value })}
            />
          </Field>
          <FormGrid>
            <Field label="Category">
              <Select
                value={woForm.category}
                onChange={(e) => setWoForm({ ...woForm, category: e.currentTarget.value })}
              >
                {["Corrective", "Preventive", "Inspection", "Installation"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Technician">
              <OptionalSelect
                value={woForm.assignedToId}
                onChange={(v) => setWoForm({ ...woForm, assignedToId: v })}
                placeholder="Leave unassigned"
                options={agents.map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
            <Field label="Scheduled for">
              <Input
                type="date"
                value={woForm.scheduledAt}
                onChange={(e) => setWoForm({ ...woForm, scheduledAt: e.currentTarget.value })}
              />
            </Field>
          </FormGrid>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDispatching(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={dispatch} disabled={pending}>
            {pending ? "Dispatching..." : "Dispatch"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-text-secondary">{value ?? "—"}</dd>
    </div>
  );
}
