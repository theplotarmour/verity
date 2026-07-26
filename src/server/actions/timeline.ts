"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";

export type TimelineItem = {
  id: string;
  at: string; // ISO timestamp
  type: string; // CREATED | APPROVED | REJECTED | STATUS_CHANGED | ...
  title: string;
  description: string | null;
  actorName: string | null;
  images: string[];
  isOverride: boolean;
  source: "timeline" | "audit";
};

// Chronological history of one work order: native TimelineEvents plus an
// audit-log fallback so orders created before the timeline engine still show
// their story.
export async function getProductionTimeline(workOrderId: string): Promise<TimelineItem[]> {
  const session = await getUserSession();
  if (!session) return [];

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, factoryId: session.factoryId },
    include: {
      jobCards: { include: { inspection: true } },
      productionPlan: { select: { salesOrderId: true } },
    },
  });
  if (!workOrder) return [];

  const events = await prisma.timelineEvent.findMany({
    where: { factoryId: session.factoryId, entityType: "WorkOrder", entityId: workOrderId },
    orderBy: { createdAt: "asc" },
  });

  // Legacy fallback: audit-log rows tied to this order's sales order,
  // inspections or job cards.
  const auditEntityIds = [
    workOrder.productionPlan?.salesOrderId,
    ...workOrder.jobCards.map((jc) => jc.id),
    ...workOrder.jobCards.map((jc) => jc.inspection?.id),
  ].filter((id): id is string => !!id);

  const auditRows = auditEntityIds.length
    ? await prisma.auditLog.findMany({
        where: { factoryId: session.factoryId, entityId: { in: auditEntityIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // Resolve actor names in one query
  const actorIds = [
    ...new Set([
      ...events.map((e) => e.actorId),
      ...auditRows.map((a) => a.actorUserId),
    ].filter((id): id is string => !!id)),
  ];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a.name]));

  const items: TimelineItem[] = events.map((e) => {
    const meta = (e.metadata as any) ?? {};
    return {
      id: e.id,
      at: e.createdAt.toISOString(),
      type: e.eventType,
      title: e.title,
      description: e.description ?? null,
      actorName: e.actorId ? actorMap.get(e.actorId) ?? null : null,
      images: [...(meta.beforeImages ?? []), ...(meta.afterImages ?? [])],
      isOverride: Boolean(meta.override) || e.title.startsWith("OVERRIDE"),
      source: "timeline",
    };
  });

  // Audit rows duplicated by native events (same minute + same actor doing a
  // similar action) are rare; simplest correct behaviour is to include audit
  // rows only for orders that predate the timeline engine.
  if (items.length === 0) {
    for (const row of auditRows) {
      items.push({
        id: row.id,
        at: row.createdAt.toISOString(),
        type: "AUDIT",
        title: row.action,
        description: ((row.metadata as any)?.message as string) ?? null,
        actorName: row.actorUserId ? actorMap.get(row.actorUserId) ?? null : null,
        images: [],
        isOverride: false,
        source: "audit",
      });
    }
  }

  return items.sort((a, b) => a.at.localeCompare(b.at));
}
