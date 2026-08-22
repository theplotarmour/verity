"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import type { ProjectStatus, TaskStatus, TicketPriority } from "@prisma/client";

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
  TextArea,
  formatDay,
  formatMoney,
  humanise,
  toDateInput,
} from "@/components/service/kit";
import {
  approveTimesheet,
  createTask,
  deleteTask,
  deleteTimesheet,
  recordTime,
  setProjectStatus,
  setTaskStatus,
  updateTask,
} from "@/server/actions/projects";

type Project = {
  id: string;
  projectNumber: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  customerName: string | null;
  siteId: string | null;
  siteName: string | null;
  managerName: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number;
  billableRate: number;
  totalHours: number;
  billableHours: number;
  billableValue: number;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  estimatedHours: number;
};

type TimesheetRow = {
  id: string;
  date: string;
  hours: number;
  notes: string | null;
  billable: boolean;
  approved: boolean;
  userId: string;
  userName: string;
  taskId: string | null;
  taskTitle: string | null;
};

const TABS = ["Overview", "Tasks", "Timesheets"] as const;
type Tab = (typeof TABS)[number];

const PROJECT_STATUSES: ProjectStatus[] = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];
const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const BLANK_TASK = {
  title: "",
  description: "",
  status: "TODO" as TaskStatus,
  priority: "MEDIUM" as TicketPriority,
  assigneeId: "",
  dueDate: "",
  estimatedHours: "",
};

const BLANK_TIME = {
  taskId: "",
  userId: "",
  date: new Date().toISOString().slice(0, 10),
  hours: "",
  notes: "",
  billable: true,
};

/**
 * One project across three tabs: what it is, what is left to do, and what has
 * been spent on it. The third tab is the one that matters commercially —
 * approved billable hours here are exactly what an invoice draws from.
 */
export function ProjectDetailClient({
  project,
  tasks,
  timesheets,
  members,
}: {
  project: Project;
  tasks: TaskRow[];
  timesheets: TimesheetRow[];
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("Overview");
  const [taskEditing, setTaskEditing] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState(BLANK_TASK);
  const [logging, setLogging] = useState(false);
  const [timeForm, setTimeForm] = useState(BLANK_TIME);

  const unapprovedHours = useMemo(
    () => timesheets.filter((t) => !t.approved).reduce((sum, t) => sum + t.hours, 0),
    [timesheets],
  );

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

  function openTask(row?: TaskRow) {
    setTaskEditing(row?.id ?? "");
    setTaskForm(
      row
        ? {
            title: row.title,
            description: row.description ?? "",
            status: row.status,
            priority: row.priority,
            assigneeId: row.assigneeId ?? "",
            dueDate: toDateInput(row.dueDate),
            estimatedHours: String(row.estimatedHours || ""),
          }
        : BLANK_TASK,
    );
  }

  function submitTask() {
    if (!taskForm.title.trim()) {
      toast.error("A task title is required.");
      return;
    }
    const payload = {
      title: taskForm.title,
      description: taskForm.description || null,
      status: taskForm.status,
      priority: taskForm.priority,
      assigneeId: taskForm.assigneeId || null,
      dueDate: taskForm.dueDate || null,
      estimatedHours: Number(taskForm.estimatedHours) || 0,
    };
    start(async () => {
      const result = taskEditing
        ? await updateTask(taskEditing, payload)
        : await createTask({ ...payload, projectId: project.id });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(taskEditing ? "Task updated." : "Task added.");
      setTaskEditing(null);
      router.refresh();
    });
  }

  function submitTime() {
    const hours = Number(timeForm.hours);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast.error("Enter the hours worked.");
      return;
    }
    start(async () => {
      const result = await recordTime({
        projectId: project.id,
        taskId: timeForm.taskId || null,
        userId: timeForm.userId || null,
        date: timeForm.date,
        hours,
        notes: timeForm.notes || null,
        billable: timeForm.billable,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Time recorded.");
      setLogging(false);
      setTimeForm({ ...BLANK_TIME, date: timeForm.date });
      router.refresh();
    });
  }

  async function removeTask(row: TaskRow) {
    const ok = await confirmDialog({
      title: `Delete "${row.title}"?`,
      description: "Hours already logged against it stay on the project.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) run(() => deleteTask(row.id), "Task deleted.");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/owner/projects"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
          <h1 className="mt-2 text-[clamp(22px,2.4vw,30px)] font-semibold tracking-[-0.04em] text-text-primary">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="font-mono text-xs font-semibold text-text-tertiary">
              {project.projectNumber}
            </span>
            <StatusPill status={project.status} />
            {project.customerName ? <span>{project.customerName}</span> : null}
          </div>
        </div>
        <div className="w-44">
          <Select
            value={project.status}
            onChange={(e) =>
              run(
                () => setProjectStatus(project.id, e.currentTarget.value as ProjectStatus),
                "Status updated.",
              )
            }
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanise(s)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <StatStrip>
        <Stat label="Hours logged" value={project.totalHours.toFixed(1)} tone="brand" />
        <Stat label="Billable hours" value={project.billableHours.toFixed(1)} tone="success" />
        <Stat label="Billable value" value={formatMoney(project.billableValue)} />
        <Stat
          label="Awaiting approval"
          value={unapprovedHours.toFixed(1)}
          tone={unapprovedHours > 0 ? "warning" : "neutral"}
        />
      </StatStrip>

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
        {tab === "Tasks" ? (
          <Button size="sm" onClick={() => openTask()}>
            <Plus className="h-3.5 w-3.5" />
            Add task
          </Button>
        ) : tab === "Timesheets" ? (
          <Button size="sm" onClick={() => setLogging(true)}>
            <Plus className="h-3.5 w-3.5" />
            Log time
          </Button>
        ) : null}
      </div>

      <div className="h-[520px] overflow-y-auto rounded-[16px] border border-border bg-surface p-4">
        {tab === "Overview" ? (
          <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
            <Card>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Engagement
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Client" value={project.customerName} />
                <Row
                  label="Site"
                  value={project.siteName}
                  href={project.siteId ? `/owner/sites/${project.siteId}` : undefined}
                />
                <Row label="Manager" value={project.managerName} />
                <Row label="Starts" value={formatDay(project.startDate)} />
                <Row label="Ends" value={formatDay(project.endDate)} />
              </dl>
            </Card>
            <Card>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Commercials
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Budget" value={formatMoney(project.budget)} />
                <Row label="Rate / hour" value={formatMoney(project.billableRate)} />
                <Row label="Billable value" value={formatMoney(project.billableValue)} />
                <Row
                  label="Budget used"
                  value={
                    project.budget > 0
                      ? `${Math.round((project.billableValue / project.budget) * 100)}%`
                      : "—"
                  }
                />
              </dl>
            </Card>
            {project.description ? (
              <Card className="md:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  Brief
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                  {project.description}
                </p>
              </Card>
            ) : null}
          </div>
        ) : tab === "Tasks" ? (
          tasks.length === 0 ? (
            <EmptyState title="No tasks" description="Break the engagement into tasks to track it." />
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border bg-surface-2 p-3"
                >
                  <button
                    type="button"
                    onClick={() => openTask(t)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-text-primary">{t.title}</p>
                    <p className="text-[11px] text-text-tertiary">
                      {t.assigneeName ?? "Unassigned"}
                      {t.dueDate ? ` · due ${formatDay(t.dueDate)}` : ""}
                      {t.estimatedHours ? ` · ${t.estimatedHours}h est.` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <PriorityPill priority={t.priority} />
                    <div className="w-36">
                      <Select
                        value={t.status}
                        onChange={(e) =>
                          run(() => setTaskStatus(t.id, e.currentTarget.value as TaskStatus))
                        }
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {humanise(s)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => removeTask(t)}
                      disabled={pending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : timesheets.length === 0 ? (
          <EmptyState
            title="No time logged"
            description="Record hours here and they become billable lines on an invoice."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Who</th>
                <th className="px-3 py-2">Task</th>
                <th className="px-3 py-2 text-right">Hours</th>
                <th className="px-3 py-2">Billable</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {timesheets.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 text-text-secondary">{formatDay(t.date)}</td>
                  <td className="px-3 py-2 text-text-primary">{t.userName}</td>
                  <td className="px-3 py-2 text-text-secondary">{t.taskTitle ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">
                    {t.hours.toFixed(1)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={t.billable ? (t.approved ? "APPROVED" : "PENDING") : "CANCELLED"} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => run(() => approveTimesheet(t.id, !t.approved))}
                      disabled={pending}
                    >
                      {t.approved ? "Un-approve" : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => run(() => deleteTimesheet(t.id))}
                      disabled={pending}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Task sheet */}
      <Dialog isOpen={taskEditing !== null} onClose={() => setTaskEditing(null)}>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          {taskEditing ? "Edit task" : "New task"}
        </h2>
        <div className="mt-5 space-y-4">
          <Field label="Title">
            <Input
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.currentTarget.value })}
            />
          </Field>
          <Field label="Description">
            <TextArea
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.currentTarget.value })}
            />
          </Field>
          <FormGrid>
            <Field label="Assignee">
              <OptionalSelect
                value={taskForm.assigneeId}
                onChange={(v) => setTaskForm({ ...taskForm, assigneeId: v })}
                placeholder="Unassigned"
                options={members.map((m) => ({ value: m.id, label: m.name }))}
              />
            </Field>
            <Field label="Priority">
              <Select
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, priority: e.currentTarget.value as TicketPriority })
                }
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {humanise(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due">
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.currentTarget.value })}
              />
            </Field>
            <Field label="Estimate (hours)">
              <Input
                type="number"
                min={0}
                value={taskForm.estimatedHours}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, estimatedHours: e.currentTarget.value })
                }
              />
            </Field>
            <Field label="Status">
              <Select
                value={taskForm.status}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, status: e.currentTarget.value as TaskStatus })
                }
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanise(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTaskEditing(null)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submitTask} disabled={pending}>
            {pending ? "Saving..." : taskEditing ? "Save" : "Add task"}
          </Button>
        </div>
      </Dialog>

      {/* Timesheet sheet */}
      <Dialog isOpen={logging} onClose={() => setLogging(false)}>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">Log time</h2>
        <div className="mt-5 space-y-4">
          <FormGrid>
            <Field label="Date">
              <Input
                type="date"
                value={timeForm.date}
                onChange={(e) => setTimeForm({ ...timeForm, date: e.currentTarget.value })}
              />
            </Field>
            <Field label="Hours">
              <Input
                type="number"
                min={0}
                step="0.25"
                value={timeForm.hours}
                onChange={(e) => setTimeForm({ ...timeForm, hours: e.currentTarget.value })}
              />
            </Field>
            <Field label="Person" hint="Defaults to you.">
              <OptionalSelect
                value={timeForm.userId}
                onChange={(v) => setTimeForm({ ...timeForm, userId: v })}
                placeholder="Me"
                options={members.map((m) => ({ value: m.id, label: m.name }))}
              />
            </Field>
            <Field label="Task">
              <OptionalSelect
                value={timeForm.taskId}
                onChange={(v) => setTimeForm({ ...timeForm, taskId: v })}
                placeholder="No specific task"
                options={tasks.map((t) => ({ value: t.id, label: t.title }))}
              />
            </Field>
          </FormGrid>
          <Field label="Notes">
            <TextArea
              rows={2}
              value={timeForm.notes}
              onChange={(e) => setTimeForm({ ...timeForm, notes: e.currentTarget.value })}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-secondary">
            <input
              type="checkbox"
              checked={timeForm.billable}
              onChange={(e) => setTimeForm({ ...timeForm, billable: e.currentTarget.checked })}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Billable to the client
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setLogging(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submitTime} disabled={pending}>
            {pending ? "Saving..." : "Log time"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string | null; href?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-text-secondary">
        {value ? (
          href ? (
            <Link href={href} className="text-[var(--brand)] hover:underline">
              {value}
            </Link>
          ) : (
            value
          )
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}
