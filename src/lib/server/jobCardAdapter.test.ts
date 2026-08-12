import { describe, it, expect, beforeAll, afterAll } from "vitest";

import prisma from "@/lib/prisma";
import { resolveProductionStages, stageSequenceFromJobCards } from "./jobCardAdapter";

/**
 * The production stage sequence.
 *
 * `StageIndicator` used to hardcode Cutting → Stitching → QC → Passport. That is
 * one route, belonging to one product, in one of the four verticals — a QSR prep
 * line, a facility service visit and a retail store fit-out share none of it. The
 * route already exists in the data: `BlueprintRouteStep` holds it, ordered, and
 * `releasePlanToWorkOrder` copies it into job cards. The resolver reads it.
 *
 * The two cases the strip has to survive are an ordinary configured item and a
 * brand-new one with no blueprint at all. The second is not an error — a route is
 * something an owner adds when they get to it — so it returns nothing rather than
 * throwing inside a render.
 */
describe("resolveProductionStages", () => {
  let factoryId: string;
  let seeded = false;
  const cleanup = { blueprints: [] as string[], items: [] as string[], departments: [] as string[] };

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  /** The route under test, deliberately not alphabetical and not the legacy four. */
  const ROUTE = ["Prep", "Marking", "Assembly", "Final Check"];

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;
  });

  afterAll(async () => {
    for (const id of cleanup.blueprints) {
      await prisma.blueprint.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of cleanup.items) {
      await prisma.itemMaster.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of cleanup.departments) {
      await prisma.department.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  async function makeItem(label: string) {
    const sku = `STAGETEST-${label}-${suffix}`;
    const item = await prisma.itemMaster.create({
      data: {
        factoryId,
        itemType: "FINISHED_PRODUCT",
        manufacturingType: "MAKE",
        name: `Stage test ${label} ${suffix}`,
        sku,
        itemCode: sku,
        defaultUOM: "PCS",
      },
      select: { id: true },
    });
    cleanup.items.push(item.id);
    return item.id;
  }

  /** One department per route step, named so the assertion reads as the route. */
  async function makeDepartments(names: string[]) {
    const ids: string[] = [];
    for (const name of names) {
      const dept = await prisma.department.create({
        data: { factoryId, name: `${name} ${suffix}` },
        select: { id: true },
      });
      cleanup.departments.push(dept.id);
      ids.push(dept.id);
    }
    return ids;
  }

  it("returns the item's four route steps in sequence order", async () => {
    if (!seeded) return;
    const itemId = await makeItem("routed");
    const deptIds = await makeDepartments(ROUTE);

    const blueprint = await prisma.blueprint.create({
      data: { factoryId, itemId },
      select: { id: true },
    });
    cleanup.blueprints.push(blueprint.id);

    const version = await prisma.blueprintVersion.create({
      data: {
        blueprintId: blueprint.id,
        versionNumber: 1,
        name: "V1 - Route under test",
        isActive: true,
        // Inserted back to front, so passing this proves the resolver orders by
        // `sequence` rather than by insertion or by id.
        routeSteps: {
          create: [...deptIds]
            .map((departmentId, idx) => ({ departmentId, sequence: idx + 1 }))
            .reverse(),
        },
      },
      select: { id: true },
    });
    await prisma.blueprint.update({
      where: { id: blueprint.id },
      data: { activeVersionId: version.id },
    });

    const stages = await resolveProductionStages({ factoryId, itemId });
    expect(stages).toEqual(ROUTE.map((name) => `${name} ${suffix}`));
  });

  it("returns an empty array for an item with no blueprint, without throwing", async () => {
    if (!seeded) return;
    const itemId = await makeItem("unrouted");
    await expect(resolveProductionStages({ factoryId, itemId })).resolves.toEqual([]);
  });

  it("returns an empty array for ids that do not exist", async () => {
    if (!seeded) return;
    // A stale link or a deleted order reaches the resolver as a live id.
    await expect(
      resolveProductionStages({ factoryId, itemId: "does-not-exist" })
    ).resolves.toEqual([]);
    await expect(
      resolveProductionStages({ factoryId, orderId: "does-not-exist" })
    ).resolves.toEqual([]);
  });

  it("returns nothing when neither an order nor an item is given", async () => {
    if (!seeded) return;
    await expect(resolveProductionStages({ factoryId })).resolves.toEqual([]);
  });

  it("will not read another tenant's route", async () => {
    if (!seeded) return;
    // The whole reason `factoryId` is a parameter and not derived from the id.
    const itemId = await makeItem("tenant");
    const deptIds = await makeDepartments(["Solo"]);
    const blueprint = await prisma.blueprint.create({
      data: { factoryId, itemId },
      select: { id: true },
    });
    cleanup.blueprints.push(blueprint.id);
    await prisma.blueprintVersion.create({
      data: {
        blueprintId: blueprint.id,
        versionNumber: 1,
        name: "V1",
        isActive: true,
        routeSteps: { create: [{ departmentId: deptIds[0], sequence: 1 }] },
      },
    });

    // Same item id, wrong tenant.
    const stages = await resolveProductionStages({ factoryId: "some-other-factory", itemId });
    expect(stages).toEqual([]);
  });
});

describe("stageSequenceFromJobCards", () => {
  it("orders by sequence and names each card", () => {
    const seq = stageSequenceFromJobCards([
      { sequence: 3, status: "WAITING", department: { name: "Packing" } },
      { sequence: 1, status: "COMPLETED", department: { name: "Cutting" } },
      { sequence: 2, status: "IN_PROGRESS", department: { name: "Stitching" } },
    ]);
    expect(seq.stages).toEqual(["Cutting", "Stitching", "Packing"]);
  });

  it("points at the first card that is not complete", () => {
    // The same rule `deriveProductionStatus` uses: where the physical bag is.
    const seq = stageSequenceFromJobCards([
      { sequence: 1, status: "COMPLETED", department: { name: "Cutting" } },
      { sequence: 2, status: "COMPLETED", department: { name: "Stitching" } },
      { sequence: 3, status: "QC_PENDING", department: { name: "QC" } },
    ]);
    expect(seq.currentStage).toBe("QC");
  });

  it("has no current stage once every card is complete", () => {
    const seq = stageSequenceFromJobCards([
      { sequence: 1, status: "COMPLETED", department: { name: "Cutting" } },
    ]);
    expect(seq.currentStage).toBeNull();
  });

  it("prefers the workflow stage name over the department", () => {
    // A department can run more than one stage, so the stage is the finer label.
    const seq = stageSequenceFromJobCards([
      { sequence: 1, status: "WAITING", stage: { name: "Foam Cutting" }, department: { name: "Cutting" } },
    ]);
    expect(seq.stages).toEqual(["Foam Cutting"]);
  });

  it("falls back to the department when the card has no stage", () => {
    // `releasePlanToWorkOrder` creates cards straight off the route with no
    // stageId, so this is the common case, not the edge one.
    const seq = stageSequenceFromJobCards([
      { sequence: 1, status: "WAITING", stage: null, department: { name: "Cutting" } },
    ]);
    expect(seq.stages).toEqual(["Cutting"]);
  });

  it("survives an empty or missing chain", () => {
    expect(stageSequenceFromJobCards([])).toEqual({ stages: [], currentStage: null });
    expect(stageSequenceFromJobCards(undefined)).toEqual({ stages: [], currentStage: null });
  });

  it("drops cards with no name rather than rendering a blank step", () => {
    const seq = stageSequenceFromJobCards([
      { sequence: 1, status: "WAITING", stage: null, department: null },
      { sequence: 2, status: "WAITING", department: { name: "Stitching" } },
    ]);
    expect(seq.stages).toEqual(["Stitching"]);
  });
});
