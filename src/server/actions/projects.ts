"use server";

import { revalidatePath } from "next/cache";
import type { ProjectStatus, TaskStatus, TicketPriority } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { createWithDocNumber, formatDocNumber } from "@/lib/server/numbering";
import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import { hasModule } from "@/platform/modules/entitlements";

/**
 * Projects — engagements, tasks and timesheets.
 *
 * This is the service-sector counterpart to a ProductionPlan: a named body of
 * work with a client, a budget, a manager and a burn rate. Tasks are the job
 * cards; timesheets are the stage entries. The point of the module is the last
 * one — hours recorded here are what `billing` turns into an invoice line and
 * what payroll reads as `totalHours`.
 */

function revalidateProjectPaths(id?: string) {
  revalidatePath("/owner/projects");
  if (id) revalidatePath(`/owner/projects/${id}`);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Midnight UTC for a calendar day, so a day's hours group the same everywhere. */
function toCalendarDate(value: string): Date | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  customerId?: string | null;
  siteId?: string | null;
  managerId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  billableRate?: number | null;
}

export async function getProjectsData() {
  const organizationId = await guardModuleAction("projects");
  const user = await getOwnerUser();
  if (!user) return { projects: [], customers: [], managers: [], sites: [] };

  const factoryId = user.factoryId;

  const [projects, customers, managers, sites] = await Promise.all([
    prisma.project.findMany({
      where: { factoryId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        customer: { select: { id: true, name: true, companyName: true } },
        site: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        _count: {
          select: {
            tasks: true,
            timesheets: true,
          },
        },
      },
    }),
    prisma.customer.findMany({
      where: { factoryId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { factoryId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    (await hasModule(organizationId, "sites"))
      ? prisma.site.findMany({
          where: { factoryId, status: { not: "TERMINATED" } },
          select: { id: true, name: true, siteCode: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const ids = projects.map((p) => p.id);

  // Two aggregates rather than loading every task and hour: a project list has
  // to stay cheap as the history grows.
  const [doneTasks, hours] = await Promise.all([
    ids.length
      ? prisma.task.groupBy({
          by: ["projectId"],
          where: { factoryId, projectId: { in: ids }, status: "DONE" },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.timesheetEntry.groupBy({
          by: ["projectId"],
          where: { factoryId, projectId: { in: ids } },
          _sum: { hours: true },
        })
      : Promise.resolve([]),
  ]);
  const doneByProject = new Map(doneTasks.map((t) => [t.projectId, t._count._all]));
  const hoursByProject = new Map(hours.map((h) => [h.projectId, h._sum.hours ?? 0]));

  return {
    projects: projects.map((p) => ({
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      description: p.description,
      status: p.status,
      customerId: p.customerId,
      customerName: p.customer?.companyName ?? p.customer?.name ?? null,
      siteId: p.siteId,
      siteName: p.site?.name ?? null,
      managerId: p.managerId,
      managerName: p.manager?.name ?? null,
      startDate: p.startDate?.toISOString() ?? null,
      endDate: p.endDate?.toISOString() ?? null,
      budget: p.budget,
      billableRate: p.billableRate,
      taskCount: p._count.tasks,
      doneTaskCount: doneByProject.get(p.id) ?? 0,
      totalHours: hoursByProject.get(p.id) ?? 0,
    })),
    customers,
    managers,
    sites,
  };
}

export async function getProjectDetail(projectId: string) {
  const organizationId = await guardModuleAction("projects");
  const user = await getOwnerUser();
  if (!user) return null;

  const factoryId = user.factoryId;

  const project = await prisma.project.findFirst({
    where: { id: projectId, factoryId },
    include: {
      customer: { select: { id: true, name: true, companyName: true } },
      site: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        include: { assignee: { select: { id: true, name: true } } },
      },
      timesheets: {
        orderBy: { date: "desc" },
        take: 200,
        include: {
          user: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!project) return null;

  const [members, customers, sites] = await Promise.all([
    prisma.user.findMany({
      where: { factoryId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { factoryId },
      select: { id: true, name: true, companyName: true },
      orderBy: { name: "asc" },
    }),
    (await hasModule(organizationId, "sites"))
      ? prisma.site.findMany({
          where: { factoryId, status: { not: "TERMINATED" } },
          select: { id: true, name: true, siteCode: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const totalHours = project.timesheets.reduce((sum, t) => sum + t.hours, 0);
  const billableHours = project.timesheets
    .filter((t) => t.billable)
    .reduce((sum, t) => sum + t.hours, 0);

  return {
    project: {
      id: project.id,
      projectNumber: project.projectNumber,
      name: project.name,
      description: project.description,
      status: project.status,
      customerId: project.customerId,
      customerName: project.customer?.companyName ?? project.customer?.name ?? null,
      siteId: project.siteId,
      siteName: project.site?.name ?? null,
      managerId: project.managerId,
      managerName: project.manager?.name ?? null,
      startDate: project.startDate?.toISOString() ?? null,
      endDate: project.endDate?.toISOString() ?? null,
      budget: project.budget,
      billableRate: project.billableRate,
      totalHours,
      billableHours,
      billableValue: billableHours * project.billableRate,
    },
    tasks: project.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee?.name ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      estimatedHours: t.estimatedHours,
    })),
    timesheets: project.timesheets.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      hours: t.hours,
      notes: t.notes,
      billable: t.billable,
      approved: t.approved,
      userId: t.userId,
      userName: t.user.name,
      taskId: t.taskId,
      taskTitle: t.task?.title ?? null,
    })),
    members,
    customers,
    sites,
  };
}

export async function createProject(input: ProjectInput) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "A project name is required." };

  const factoryId = user.factoryId;
  const base = (await prisma.project.count({ where: { factoryId } })) + 1;

  try {
    const project = await createWithDocNumber(
      (attempt) => formatDocNumber("PRJ", base + attempt, 4),
      (projectNumber) =>
        prisma.project.create({
          data: {
            factoryId,
            projectNumber,
            name: input.name.trim(),
            description: input.description?.trim() || null,
            status: input.status ?? "PLANNING",
            customerId: input.customerId || null,
            siteId: input.siteId || null,
            managerId: input.managerId || null,
            startDate: parseDate(input.startDate),
            endDate: parseDate(input.endDate),
            budget: input.budget ?? 0,
            billableRate: input.billableRate ?? 0,
          },
          select: { id: true },
        }),
    );
    revalidateProjectPaths();
    return { success: true, id: project.id };
  } catch {
    return { error: "Could not create the project." };
  }
}

export async function updateProject(projectId: string, input: ProjectInput) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "A project name is required." };

  const updated = await prisma.project.updateMany({
    where: { id: projectId, factoryId: user.factoryId },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ...(input.status ? { status: input.status } : {}),
      customerId: input.customerId || null,
      siteId: input.siteId || null,
      managerId: input.managerId || null,
      startDate: parseDate(input.startDate),
      endDate: parseDate(input.endDate),
      budget: input.budget ?? 0,
      billableRate: input.billableRate ?? 0,
    },
  });
  if (updated.count === 0) return { error: "Project not found." };

  revalidateProjectPaths(projectId);
  return { success: true };
}

export async function setProjectStatus(projectId: string, status: ProjectStatus) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const updated = await prisma.project.updateMany({
    where: { id: projectId, factoryId: user.factoryId },
    data: { status },
  });
  if (updated.count === 0) return { error: "Project not found." };

  revalidateProjectPaths(projectId);
  return { success: true };
}

export async function deleteProject(projectId: string) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  // Tasks and timesheets cascade with the project. That is deliberate: a
  // project is the unit an engagement is cancelled at, and orphan hours against
  // a deleted engagement cannot be billed or reported on anyway.
  const deleted = await prisma.project.deleteMany({
    where: { id: projectId, factoryId: user.factoryId },
  });
  if (deleted.count === 0) return { error: "Project not found." };

  revalidateProjectPaths();
  return { success: true };
}

// --- Tasks -----------------------------------------------------------------

export interface TaskInput {
  projectId: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
}

export async function createTask(input: TaskInput) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.title?.trim()) return { error: "A task title is required." };

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!project) return { error: "Project not found." };

  await prisma.task.create({
    data: {
      factoryId: user.factoryId,
      projectId: project.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "TODO",
      priority: input.priority ?? "MEDIUM",
      assigneeId: input.assigneeId || null,
      dueDate: parseDate(input.dueDate),
      estimatedHours: input.estimatedHours ?? 0,
    },
  });

  revalidateProjectPaths(input.projectId);
  return { success: true };
}

export async function updateTask(taskId: string, input: Omit<TaskInput, "projectId">) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.title?.trim()) return { error: "A task title is required." };

  const task = await prisma.task.findFirst({
    where: { id: taskId, factoryId: user.factoryId },
    select: { id: true, projectId: true, status: true, completedAt: true },
  });
  if (!task) return { error: "Task not found." };

  const nextStatus = input.status ?? task.status;
  await prisma.task.update({
    where: { id: task.id },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: nextStatus,
      ...(input.priority ? { priority: input.priority } : {}),
      assigneeId: input.assigneeId || null,
      dueDate: parseDate(input.dueDate),
      estimatedHours: input.estimatedHours ?? 0,
      completedAt: nextStatus === "DONE" ? (task.completedAt ?? new Date()) : null,
    },
  });

  revalidateProjectPaths(task.projectId);
  return { success: true };
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const task = await prisma.task.findFirst({
    where: { id: taskId, factoryId: user.factoryId },
    select: { id: true, projectId: true, completedAt: true },
  });
  if (!task) return { error: "Task not found." };

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status,
      completedAt: status === "DONE" ? (task.completedAt ?? new Date()) : null,
    },
  });

  revalidateProjectPaths(task.projectId);
  return { success: true };
}

export async function deleteTask(taskId: string) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const task = await prisma.task.findFirst({
    where: { id: taskId, factoryId: user.factoryId },
    select: { id: true, projectId: true },
  });
  if (!task) return { error: "Task not found." };

  await prisma.task.delete({ where: { id: task.id } });
  revalidateProjectPaths(task.projectId);
  return { success: true };
}

// --- Timesheets ------------------------------------------------------------

export async function recordTime(input: {
  projectId: string;
  taskId?: string | null;
  userId?: string | null;
  date: string;
  hours: number;
  notes?: string | null;
  billable?: boolean;
}) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const hours = Number(input.hours);
  if (!Number.isFinite(hours) || hours <= 0) return { error: "Hours must be greater than zero." };
  if (hours > 24) return { error: "A single day cannot hold more than 24 hours." };

  const date = toCalendarDate(input.date);
  if (!date) return { error: "A valid date is required." };

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!project) return { error: "Project not found." };

  // Defaults to the caller. A manager may log on someone else's behalf, but
  // only for someone inside this tenant.
  const targetUserId = input.userId || user.id;
  const target = await prisma.user.findFirst({
    where: { id: targetUserId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!target) return { error: "That person is not on this team." };

  await prisma.timesheetEntry.create({
    data: {
      factoryId: user.factoryId,
      projectId: project.id,
      taskId: input.taskId || null,
      userId: target.id,
      date,
      hours,
      notes: input.notes?.trim() || null,
      billable: input.billable ?? true,
    },
  });

  revalidateProjectPaths(input.projectId);
  return { success: true };
}

export async function approveTimesheet(entryId: string, approved: boolean) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const entry = await prisma.timesheetEntry.findFirst({
    where: { id: entryId, factoryId: user.factoryId },
    select: { id: true, projectId: true },
  });
  if (!entry) return { error: "Entry not found." };

  await prisma.timesheetEntry.update({
    where: { id: entry.id },
    data: { approved, approvedAt: approved ? new Date() : null },
  });

  revalidateProjectPaths(entry.projectId);
  return { success: true };
}

export async function deleteTimesheet(entryId: string) {
  await guardModuleWrite("projects");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const entry = await prisma.timesheetEntry.findFirst({
    where: { id: entryId, factoryId: user.factoryId },
    select: { id: true, projectId: true, approved: true },
  });
  if (!entry) return { error: "Entry not found." };
  // An approved entry may already be sitting on an invoice or a payroll run.
  if (entry.approved) return { error: "Un-approve the entry before deleting it." };

  await prisma.timesheetEntry.delete({ where: { id: entry.id } });
  revalidateProjectPaths(entry.projectId);
  return { success: true };
}
