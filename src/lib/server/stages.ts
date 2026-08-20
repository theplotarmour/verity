import prisma from "@/lib/prisma";

// Prisma client or interactive-transaction client — both expose the delegates we use.
type Db = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// CAD runs before any physical work: it produces the cutting patterns, the
// material requirement and the production label that the Cutting department
// then works from.
export const DEFAULT_STAGES = [
  { name: "CAD", sortOrder: 0, requirePhoto: false, requireRemarks: false, isQcStage: false },
  { name: "Cutting", sortOrder: 1, requirePhoto: true, requireRemarks: false, isQcStage: false },
  { name: "Stitching", sortOrder: 2, requirePhoto: true, requireRemarks: false, isQcStage: false },
  { name: "Quality Check", sortOrder: 3, requirePhoto: false, requireRemarks: false, isQcStage: true },
  { name: "Packing", sortOrder: 4, requirePhoto: true, requireRemarks: false, isQcStage: false },
] as const;

// Returns the factory's ordered production route, seeding the default
// CAD → Cutting → Stitching → QC → Packing route the first time it's needed.
// Factories set up before CAD existed get the CAD stage back-filled in front of
// their existing route rather than being left on a route that starts at Cutting.
export async function ensureFactoryStages(db: Db, factoryId: string) {
  let stages = await db.workflowStage.findMany({
    where: { factoryId },
    orderBy: { sortOrder: "asc" },
  });
  if (stages.length === 0) {
    for (const s of DEFAULT_STAGES) {
      await db.workflowStage.create({ data: { factoryId, ...s } });
    }
  } else if (!stages.some((s) => s.name.trim().toUpperCase() === "CAD")) {
    const first = Math.min(...stages.map((s) => s.sortOrder));
    await db.workflowStage.create({
      data: { factoryId, name: "CAD", sortOrder: first - 1, requirePhoto: false, requireRemarks: false, isQcStage: false },
    });
  } else {
    return stages;
  }
  return db.workflowStage.findMany({ where: { factoryId }, orderBy: { sortOrder: "asc" } });
}

// Single write-path for the order timeline. Events hang off the SalesOrder so
// an order's full history is one query.
export async function recordTimeline(db: Db, params: {
  factoryId: string;
  salesOrderId: string;
  eventType: "CREATED" | "UPDATED" | "APPROVED" | "REJECTED" | "STATUS_CHANGED" | "COMMENT_ADDED" | "FILE_ATTACHED";
  title: string;
  description?: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.timelineEvent.create({
    data: {
      factoryId: params.factoryId,
      entityType: "SalesOrder",
      entityId: params.salesOrderId,
      eventType: params.eventType,
      title: params.title,
      description: params.description,
      actorId: params.actorId ?? undefined,
      metadata: (params.metadata as any) ?? undefined,
    },
  });
}
