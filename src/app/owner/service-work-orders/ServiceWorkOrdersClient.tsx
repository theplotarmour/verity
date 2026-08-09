"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus, Search } from "lucide-react";
import type { ServiceWOStatus, TicketPriority } from "@prisma/client";

import { PageHeader } from "@/components/design/PageHeader";
import { Button, EmptyState, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  Field,
  FilterPills,
  FormGrid,
  OptionalSelect,
  PriorityPill,
  Select,
  Stat,
  StatStrip,
  StatusPill,
  TextArea,
  formatDay,
  humanise,
  overdueBy,
  toDateInput,
} from "@/components/service/kit";
import {
  createServiceWorkOrder,
  deleteServiceWorkOrder,
  setServiceWorkOrderStatus,
  updateServiceWorkOrder,
} from "@/server/actions/helpdesk";

export type WorkOrderRow = {
  id: string;
  woNumber: string;
  title: string;
  description: string | null;
  category: string | null;
  status: ServiceWOStatus;
  priority: TicketPriority;
  customerId: string | null;
  customerName: string | null;
  siteId: string | null;
  siteName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assetId: string | null;
  checklistId: string | null;
  ticketId: string | null;
  ticketNumber: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  createdAt: string;
  inspectionId: string | null;
  inspectionStatus: string | null;
};

const STATUSES: ServiceWOStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_PARTS",
  "COMPLETED",
  "CANCELLED",
];
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const CATEGORIES = ["Corrective", "Preventive", "Inspection", "Installation"];

const BLANK = {
  title: "",
  description: "",
  category: "Corrective",
  priority: "MEDIUM" as TicketPriority,
  customerId: "",
  siteId: "",
  assignedToId: "",
  assetId: "",
  checklistId: "",
  scheduledAt: "",
};

/**
 * The dispatch board. This is what Maintenance, Facility Management and
 * Housekeeping use in place of the production work order — same idea, but the
 * unit of work is a visit rather than a batch.
 */
export function ServiceWorkOrdersClient({
  workOrders,
  customers,
  technicians,
  sites,
  assets,
  checklists,
  stats,
}: {
  workOrders: WorkOrderRow[];
  customers: { id: string; name: string; companyName?: string | null }[];
  technicians: { id: string; name: string }[];
  sites: { id: string; name: string; siteCode: string }[];
  assets: { id: string; name: string; assetCode: string }[];
  checklists: { id: string; name: string }[];
  stats: { open: number; inProgress: number; pendingParts: number; breached: number } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ServiceWOStatus | null>(null);
  // null closed, "" creating, an id editing that row.
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = workOrders.filter((w) => {
      if (status && w.status !== status) return false;
      if (!q) return true;
      return [w.woNumber, w.title, w.customerName, w.siteName, w.assignedToName, w.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    const priorityRank: Record<TicketPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return [...filtered].sort((a, b) => {
      if (a.slaBreached !== b.slaBreached) return a.slaBreached ? -1 : 1;
      if (a.priority !== b.priority) return priorityRank[a.priority] - priorityRank[b.priority];
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [workOrders, query, status]);

  function open(row?: WorkOrderRow) {
    setEditing(row?.id ?? "");
    setForm(
      row
        ? {
            title: row.title,
            description: row.description ?? "",
            category: row.category ?? "Corrective",
            priority: row.priority,
            customerId: row.customerId ?? "",
            siteId: row.siteId ?? "",
            assignedToId: row.assignedToId ?? "",
            assetId: row.assetId ?? "",
            checklistId: row.checklistId ?? "",
            scheduledAt: toDateInput(row.scheduledAt),
          }
        : BLANK,
    );
  }

  function submit() {
    if (!form.title.trim()) {
      toast.error("A title is required.");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category || null,
      priority: form.priority,
      customerId: form.customerId || null,
      siteId: form.siteId || null,
      assignedToId: form.assignedToId || null,
      assetId: form.assetId || null,
      checklistId: form.checklistId || null,
      scheduledAt: form.scheduledAt || null,
    };

    start(async () => {
      const result = editing
        ? await updateServiceWorkOrder(editing, payload)
        : await createServiceWorkOrder(payload);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Work order updated." : "Work order created.");
      setEditing(null);
      router.refresh();
    });
  }

  function move(row: WorkOrderRow, next: ServiceWOStatus) {
    start(async () => {
      const result = await setServiceWorkOrderStatus(row.id, next);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function remove(row: WorkOrderRow) {
    const ok = await confirmDialog({
      title: `Delete ${row.woNumber}?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    start(async () => {
      const result = await deleteServiceWorkOrder(row.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Work order deleted.");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        eyebrow="Service"
        title="Work Orders"
        description="Dispatched visits — corrective, preventive and scheduled — across every site."
        actions={
          <Button onClick={() => open()}>
            <Plus className="h-4 w-4" />
            New work order
          </Button>
        }
      />

      {stats ? (
        <StatStrip>
          <Stat label="Open" value={stats.open} tone="warning" />
          <Stat label="In progress" value={stats.inProgress} tone="brand" />
          <Stat label="Waiting on parts" value={stats.pendingParts} />
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
            placeholder="Search work orders..."
            className="pl-9"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No work orders"
          description={
            workOrders.length === 0
              ? "Dispatch the first visit and it will appear here."
              : "No work order matches that filter."
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                <th className="px-4 py-3">Work order</th>
                <th className="px-4 py-3">Client / Site</th>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((w) => {
                const late = w.slaBreached ? overdueBy(w.slaDueAt) : null;
                return (
                  <tr key={w.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => open(w)}
                        className="block min-w-0 text-left"
                      >
                        <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                          {w.woNumber}
                          {w.ticketNumber ? ` · ${w.ticketNumber}` : ""}
                        </span>
                        <span className="block truncate font-semibold text-text-primary">
                          {w.title}
                        </span>
                        {w.category ? (
                          <span className="text-[11px] text-text-tertiary">{w.category}</span>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <span className="block truncate">{w.customerName ?? "—"}</span>
                      {w.siteName ? (
                        <span className="block truncate text-[11px] text-text-tertiary">
                          {w.siteName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {w.assignedToName ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary">{formatDay(w.scheduledAt)}</span>
                      {late ? (
                        <span className="block text-[11px] font-semibold text-danger">
                          SLA {late}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityPill priority={w.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={w.status}
                        onChange={(e) => move(w, e.currentTarget.value as ServiceWOStatus)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {humanise(s)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {w.inspectionId ? (
                          <Link
                            href={`/owner/service-work-orders/inspection/${w.inspectionId}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[var(--brand)]/40 px-2.5 text-xs font-semibold text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/10"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            {w.inspectionStatus ? humanise(w.inspectionStatus) : "Checklist"}
                          </Link>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => remove(w)}
                          disabled={pending}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog isOpen={editing !== null} onClose={() => setEditing(null)} className="max-w-2xl">
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          {editing ? "Edit work order" : "New work order"}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Attaching a site stamps the SLA deadline from that site&apos;s contract.
        </p>

        <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.currentTarget.value })}
              placeholder="Quarterly generator service"
            />
          </Field>

          <Field label="Description">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
            />
          </Field>

          <FormGrid>
            <Field label="Category">
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.currentTarget.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Priority">
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.currentTarget.value as TicketPriority })
                }
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {humanise(p)}
                  </option>
                ))}
              </Select>
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

            <Field label="Technician">
              <OptionalSelect
                value={form.assignedToId}
                onChange={(v) => setForm({ ...form, assignedToId: v })}
                placeholder="Leave unassigned"
                options={technicians.map((t) => ({ value: t.id, label: t.name }))}
              />
            </Field>

            <Field label="Scheduled for">
              <Input
                type="date"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.currentTarget.value })}
              />
            </Field>

            <Field
              label="Asset"
              hint={assets.length === 0 ? "Enable the Assets module to link equipment." : undefined}
            >
              <OptionalSelect
                value={form.assetId}
                onChange={(v) => setForm({ ...form, assetId: v })}
                placeholder="No asset"
                disabled={assets.length === 0}
                options={assets.map((a) => ({ value: a.id, label: `${a.name} (${a.assetCode})` }))}
              />
            </Field>

            <Field label="Checklist" hint="Run a QC template on completion.">
              <OptionalSelect
                value={form.checklistId}
                onChange={(v) => setForm({ ...form, checklistId: v })}
                placeholder="No checklist"
                options={checklists.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
          </FormGrid>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving..." : editing ? "Save changes" : "Create"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
