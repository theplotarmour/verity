"use server";

import { revalidatePath } from "next/cache";
import type { AssetStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { createWithDocNumber, formatDocNumber } from "@/lib/server/numbering";
import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import { hasModule } from "@/platform/modules/entitlements";
import { publish } from "@/platform/events/publish";

/**
 * Assets — the register, and what has been done to each thing on it.
 *
 * An Asset is a physical thing the business owns and must keep running: a
 * generator, an HVAC unit, a fleet vehicle, a press. It is not stock. Stock is
 * counted and consumed; an asset is one identifiable item with a service
 * history, and losing that history is what turns preventive maintenance into
 * emergency repair.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function revalidateAssetPaths(id?: string) {
  revalidatePath("/owner/assets");
  if (id) revalidatePath(`/owner/assets/${id}`);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface AssetInput {
  name: string;
  category?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  status?: AssetStatus;
  siteId?: string | null;
  assignedToId?: string | null;
  location?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyUntil?: string | null;
  notes?: string | null;
}

export async function getAssetsData() {
  const organizationId = await guardModuleAction("assets");
  const user = await getOwnerUser();
  if (!user) return { assets: [], sites: [], holders: [], stats: null };

  const factoryId = user.factoryId;
  const now = new Date();

  const [assets, holders, sites] = await Promise.all([
    prisma.asset.findMany({
      where: { factoryId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        site: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        maintenanceSchedules: {
          where: { isActive: true },
          orderBy: { nextDueAt: "asc" },
          take: 1,
          select: { id: true, name: true, nextDueAt: true },
        },
        _count: { select: { maintenanceLogs: true } },
      },
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

  const rows = assets.map((a) => {
    const next = a.maintenanceSchedules[0] ?? null;
    return {
      id: a.id,
      assetCode: a.assetCode,
      name: a.name,
      category: a.category,
      serialNumber: a.serialNumber,
      manufacturer: a.manufacturer,
      model: a.model,
      status: a.status,
      siteId: a.siteId,
      siteName: a.site?.name ?? null,
      assignedToId: a.assignedToId,
      assignedToName: a.assignedTo?.name ?? null,
      location: a.location,
      purchaseDate: a.purchaseDate?.toISOString() ?? null,
      purchaseCost: a.purchaseCost,
      warrantyUntil: a.warrantyUntil?.toISOString() ?? null,
      notes: a.notes,
      maintenanceCount: a._count.maintenanceLogs,
      nextDueAt: next?.nextDueAt.toISOString() ?? null,
      maintenanceOverdue: !!next && next.nextDueAt < now,
      underWarranty: !!a.warrantyUntil && a.warrantyUntil > now,
    };
  });

  return {
    assets: rows,
    sites,
    holders,
    stats: {
      active: rows.filter((r) => r.status === "ACTIVE").length,
      inRepair: rows.filter((r) => r.status === "IN_REPAIR").length,
      overdue: rows.filter((r) => r.maintenanceOverdue).length,
      totalValue: rows.reduce((sum, r) => sum + r.purchaseCost, 0),
    },
  };
}

export async function getAssetDetail(assetId: string) {
  const organizationId = await guardModuleAction("assets");
  const user = await getOwnerUser();
  if (!user) return null;

  const factoryId = user.factoryId;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, factoryId },
    include: {
      site: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      maintenanceLogs: {
        orderBy: { performedAt: "desc" },
        take: 100,
        include: { performedBy: { select: { id: true, name: true } } },
      },
      maintenanceSchedules: { orderBy: { nextDueAt: "asc" } },
    },
  });
  if (!asset) return null;

  const [holders, sites] = await Promise.all([
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

  const now = new Date();

  return {
    asset: {
      id: asset.id,
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      serialNumber: asset.serialNumber,
      manufacturer: asset.manufacturer,
      model: asset.model,
      status: asset.status,
      siteId: asset.siteId,
      siteName: asset.site?.name ?? null,
      assignedToId: asset.assignedToId,
      assignedToName: asset.assignedTo?.name ?? null,
      location: asset.location,
      purchaseDate: asset.purchaseDate?.toISOString() ?? null,
      purchaseCost: asset.purchaseCost,
      warrantyUntil: asset.warrantyUntil?.toISOString() ?? null,
      notes: asset.notes,
      totalMaintenanceCost: asset.maintenanceLogs.reduce((sum, l) => sum + l.cost, 0),
      totalDowntimeHours: asset.maintenanceLogs.reduce((sum, l) => sum + l.downtimeHours, 0),
    },
    logs: asset.maintenanceLogs.map((l) => ({
      id: l.id,
      type: l.type,
      description: l.description,
      performedByName: l.performedBy?.name ?? null,
      performedAt: l.performedAt.toISOString(),
      cost: l.cost,
      downtimeHours: l.downtimeHours,
    })),
    schedules: asset.maintenanceSchedules.map((s) => ({
      id: s.id,
      name: s.name,
      intervalDays: s.intervalDays,
      lastPerformedAt: s.lastPerformedAt?.toISOString() ?? null,
      nextDueAt: s.nextDueAt.toISOString(),
      isActive: s.isActive,
      overdue: s.isActive && s.nextDueAt < now,
    })),
    holders,
    sites,
  };
}

export async function createAsset(input: AssetInput) {
  await guardModuleWrite("assets");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "An asset name is required." };

  const factoryId = user.factoryId;
  const base = (await prisma.asset.count({ where: { factoryId } })) + 1;

  try {
    const asset = await createWithDocNumber(
      (attempt) => formatDocNumber("AST", base + attempt),
      (assetCode) =>
        prisma.asset.create({
          data: {
            factoryId,
            assetCode,
            name: input.name.trim(),
            category: input.category?.trim() || null,
            serialNumber: input.serialNumber?.trim() || null,
            manufacturer: input.manufacturer?.trim() || null,
            model: input.model?.trim() || null,
            status: input.status ?? "ACTIVE",
            siteId: input.siteId || null,
            assignedToId: input.assignedToId || null,
            location: input.location?.trim() || null,
            purchaseDate: parseDate(input.purchaseDate),
            purchaseCost: input.purchaseCost ?? 0,
            warrantyUntil: parseDate(input.warrantyUntil),
            notes: input.notes?.trim() || null,
          },
          select: { id: true },
        }),
    );
    revalidateAssetPaths();
    return { success: true, id: asset.id };
  } catch {
    return { error: "Could not create the asset." };
  }
}

export async function updateAsset(assetId: string, input: AssetInput) {
  await guardModuleWrite("assets");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "An asset name is required." };

  const updated = await prisma.asset.updateMany({
    where: { id: assetId, factoryId: user.factoryId },
    data: {
      name: input.name.trim(),
      category: input.category?.trim() || null,
      serialNumber: input.serialNumber?.trim() || null,
      manufacturer: input.manufacturer?.trim() || null,
      model: input.model?.trim() || null,
      ...(input.status ? { status: input.status } : {}),
      siteId: input.siteId || null,
      assignedToId: input.assignedToId || null,
      location: input.location?.trim() || null,
      purchaseDate: parseDate(input.purchaseDate),
      purchaseCost: input.purchaseCost ?? 0,
      warrantyUntil: parseDate(input.warrantyUntil),
      notes: input.notes?.trim() || null,
    },
  });
  if (updated.count === 0) return { error: "Asset not found." };

  revalidateAssetPaths(assetId);
  return { success: true };
}

export async function setAssetStatus(assetId: string, status: AssetStatus) {
  await guardModuleWrite("assets");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const updated = await prisma.asset.updateMany({
    where: { id: assetId, factoryId: user.factoryId },
    data: { status },
  });
  if (updated.count === 0) return { error: "Asset not found." };

  revalidateAssetPaths(assetId);
  return { success: true };
}

export async function deleteAsset(assetId: string) {
  await guardModuleWrite("assets");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const logCount = await prisma.assetMaintenanceLog.count({
    where: { factoryId: user.factoryId, assetId },
  });
  // A serviced asset is retired, not erased: its cost and downtime history is
  // the only record of what the thing actually cost to own.
  if (logCount > 0) {
    return { error: "This asset has maintenance history. Set it to Disposed instead." };
  }

  const deleted = await prisma.asset.deleteMany({
    where: { id: assetId, factoryId: user.factoryId },
  });
  if (deleted.count === 0) return { error: "Asset not found." };

  revalidateAssetPaths();
  return { success: true };
}

// --- Maintenance -----------------------------------------------------------

export async function logMaintenance(input: {
  assetId: string;
  type: string;
  description?: string | null;
  performedAt?: string | null;
  cost?: number | null;
  downtimeHours?: number | null;
  /** When set, this log satisfies that schedule and rolls its next due date. */
  scheduleId?: string | null;
}) {
  await guardModuleWrite("assets");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.type?.trim()) return { error: "A maintenance type is required." };

  const factoryId = user.factoryId;
  const asset = await prisma.asset.findFirst({
    where: { id: input.assetId, factoryId },
    select: { id: true },
  });
  if (!asset) return { error: "Asset not found." };

  const performedAt = parseDate(input.performedAt) ?? new Date();

  await prisma.$transaction(async (tx) => {
    await tx.assetMaintenanceLog.create({
      data: {
        factoryId,
        assetId: asset.id,
        type: input.type.trim(),
        description: input.description?.trim() || null,
        performedById: user.id,
        performedAt,
        cost: input.cost ?? 0,
        downtimeHours: input.downtimeHours ?? 0,
      },
    });

    if (!input.scheduleId) return;
    const schedule = await tx.assetMaintenanceSchedule.findFirst({
      where: { id: input.scheduleId, factoryId, assetId: asset.id },
      select: { id: true, intervalDays: true },
    });
    if (!schedule) return;

    // Next due is measured from when the work actually happened, not from when
    // it was due. A plan that slips stays slipped rather than compounding.
    await tx.assetMaintenanceSchedule.update({
      where: { id: schedule.id },
      data: {
        lastPerformedAt: performedAt,
        nextDueAt: new Date(performedAt.getTime() + schedule.intervalDays * DAY_MS),
      },
    });
  });

  revalidateAssetPaths(input.assetId);

  // Maintenance is the point where an asset's condition changes, which is what
  // a spare-parts decrement and a preventive-schedule roll both hang off. The
  // asset module does not know who listens.
  await publish("asset.maintenance_logged", {
    factoryId,
    assetId: asset.id,
    type: input.type.trim(),
    performedAt: performedAt.toISOString(),
  });

  return { success: true };
}

export async function createMaintenanceSchedule(input: {
  assetId: string;
  name: string;
  intervalDays: number;
  firstDueAt?: string | null;
}) {
  await guardModuleWrite("assets");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "A schedule name is required." };

  const intervalDays = Math.trunc(Number(input.intervalDays));
  if (!Number.isFinite(intervalDays) || intervalDays < 1) {
    return { error: "The interval must be at least one day." };
  }

  const factoryId = user.factoryId;
  const asset = await prisma.asset.findFirst({
    where: { id: input.assetId, factoryId },
    select: { id: true },
  });
  if (!asset) return { error: "Asset not found." };

  const nextDueAt = parseDate(input.firstDueAt) ?? new Date(Date.now() + intervalDays * DAY_MS);

  await prisma.assetMaintenanceSchedule.create({
    data: {
      factoryId,
      assetId: asset.id,
      name: input.name.trim(),
      intervalDays,
      nextDueAt,
      isActive: true,
    },
  });

  revalidateAssetPaths(input.assetId);
  return { success: true };
}

export async function setMaintenanceScheduleActive(scheduleId: string, isActive: boolean) {
  await guardModuleWrite("assets");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const schedule = await prisma.assetMaintenanceSchedule.findFirst({
    where: { id: scheduleId, factoryId: user.factoryId },
    select: { id: true, assetId: true },
  });
  if (!schedule) return { error: "Schedule not found." };

  await prisma.assetMaintenanceSchedule.update({
    where: { id: schedule.id },
    data: { isActive },
  });

  revalidateAssetPaths(schedule.assetId);
  return { success: true };
}

export async function deleteMaintenanceSchedule(scheduleId: string) {
  await guardModuleWrite("assets");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const schedule = await prisma.assetMaintenanceSchedule.findFirst({
    where: { id: scheduleId, factoryId: user.factoryId },
    select: { id: true, assetId: true },
  });
  if (!schedule) return { error: "Schedule not found." };

  await prisma.assetMaintenanceSchedule.delete({ where: { id: schedule.id } });
  revalidateAssetPaths(schedule.assetId);
  return { success: true };
}
