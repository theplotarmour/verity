"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";

import { PageHeader } from "@/components/design/PageHeader";
import { Button, EmptyState, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import {
  Field,
  FilterPills,
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
  toDateInput,
} from "@/components/service/kit";
import { createProject, updateProject } from "@/server/actions/projects";

export type ProjectRow = {
  id: string;
  projectNumber: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  customerId: string | null;
  customerName: string | null;
  siteId: string | null;
  siteName: string | null;
  managerId: string | null;
  managerName: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number;
  billableRate: number;
  taskCount: number;
  doneTaskCount: number;
  totalHours: number;
};

const STATUSES: ProjectStatus[] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

const BLANK = {
  name: "",
  description: "",
  status: "PLANNING" as ProjectStatus,
  customerId: "",
  siteId: "",
  managerId: "",
  startDate: "",
  endDate: "",
  budget: "",
  billableRate: "",
};

export function ProjectsClient({
  projects,
  customers,
  managers,
  sites,
}: {
  projects: ProjectRow[];
  customers: { id: string; name: string; companyName?: string | null }[];
  managers: { id: string; name: string }[];
  sites: { id: string; name: string; siteCode: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (status && p.status !== status) return false;
      if (!q) return true;
      return [p.projectNumber, p.name, p.customerName, p.siteName, p.managerName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [projects, query, status]);

  const totals = useMemo(
    () => ({
      active: projects.filter((p) => p.status === "ACTIVE").length,
      hours: projects.reduce((sum, p) => sum + p.totalHours, 0),
      budget: projects.reduce((sum, p) => sum + p.budget, 0),
      openTasks: projects.reduce((sum, p) => sum + (p.taskCount - p.doneTaskCount), 0),
    }),
    [projects],
  );

  function open(row?: ProjectRow) {
    setEditing(row?.id ?? "");
    setForm(
      row
        ? {
            name: row.name,
            description: row.description ?? "",
            status: row.status,
            customerId: row.customerId ?? "",
            siteId: row.siteId ?? "",
            managerId: row.managerId ?? "",
            startDate: toDateInput(row.startDate),
            endDate: toDateInput(row.endDate),
            budget: String(row.budget || ""),
            billableRate: String(row.billableRate || ""),
          }
        : BLANK,
    );
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("A project name is required.");
      return;
    }
    const payload = {
      name: form.name,
      description: form.description || null,
      status: form.status,
      customerId: form.customerId || null,
      siteId: form.siteId || null,
      managerId: form.managerId || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      budget: Number(form.budget) || 0,
      billableRate: Number(form.billableRate) || 0,
    };

    start(async () => {
      const result = editing ? await updateProject(editing, payload) : await createProject(payload);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Project updated." : "Project created.");
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        eyebrow="Service"
        title="Projects"
        description="Engagements with a client, a budget and a burn rate — tasks and hours roll up here."
        actions={
          <Button onClick={() => open()}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        }
      />

      <StatStrip>
        <Stat label="Active" value={totals.active} tone="success" />
        <Stat label="Open tasks" value={totals.openTasks} tone="warning" />
        <Stat label="Hours logged" value={totals.hours.toFixed(1)} tone="brand" />
        <Stat label="Budget" value={formatMoney(totals.budget)} />
      </StatStrip>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills options={STATUSES} value={status} onChange={setStatus} />
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No projects"
          description={
            projects.length === 0
              ? "Create the first engagement and tasks can be scheduled against it."
              : "No project matches that filter."
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((p) => {
                const pct = p.taskCount > 0 ? Math.round((p.doneTaskCount / p.taskCount) * 100) : 0;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-4 py-3">
                      <Link href={`/owner/projects/${p.id}`} className="block min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                          {p.projectNumber}
                        </span>
                        <span className="block truncate font-semibold text-text-primary">
                          {p.name}
                        </span>
                        {p.siteName ? (
                          <span className="text-[11px] text-text-tertiary">{p.siteName}</span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{p.customerName ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{p.managerName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-[var(--brand)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-text-tertiary">
                          {p.doneTaskCount}/{p.taskCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">
                      {p.totalHours.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">
                      {formatMoney(p.budget)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => open(p)}>
                        Edit
                      </Button>
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
          {editing ? "Edit project" : "New project"}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          The billable rate prices approved hours when an invoice is built from this project.
        </p>

        <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
              placeholder="Phase 2 fit-out"
            />
          </Field>

          <Field label="Description">
            <TextArea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
            />
          </Field>

          <FormGrid>
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
              hint={sites.length === 0 ? "Enable the Sites module to tie this to a location." : undefined}
            >
              <OptionalSelect
                value={form.siteId}
                onChange={(v) => setForm({ ...form, siteId: v })}
                placeholder="No site"
                disabled={sites.length === 0}
                options={sites.map((s) => ({ value: s.id, label: `${s.name} (${s.siteCode})` }))}
              />
            </Field>

            <Field label="Manager">
              <OptionalSelect
                value={form.managerId}
                onChange={(v) => setForm({ ...form, managerId: v })}
                placeholder="Unassigned"
                options={managers.map((m) => ({ value: m.id, label: m.name }))}
              />
            </Field>

            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.currentTarget.value as ProjectStatus })
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanise(s)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Starts">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.currentTarget.value })}
              />
            </Field>

            <Field label="Ends">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.currentTarget.value })}
              />
            </Field>

            <Field label="Budget">
              <Input
                type="number"
                min={0}
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.currentTarget.value })}
              />
            </Field>

            <Field label="Billable rate / hour">
              <Input
                type="number"
                min={0}
                value={form.billableRate}
                onChange={(e) => setForm({ ...form, billableRate: e.currentTarget.value })}
              />
            </Field>
          </FormGrid>

          {editing ? (
            <p className="text-[11px] text-text-tertiary">
              Runs {formatDay(form.startDate || null)} to {formatDay(form.endDate || null)}.
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving..." : editing ? "Save changes" : "Create project"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
