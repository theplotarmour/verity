import { describe, it, expect, beforeAll, afterAll } from "vitest";

import prisma from "@/lib/prisma";
import { JOB_CARD_DONE, isJobCardOnFloor } from "@/lib/production-status";

/**
 * The production funnel.
 *
 * Exercised against the real schema, because the whole risk of this widget is the
 * query: a funnel that counts the wrong set of job cards is worse than no funnel,
 * since it looks authoritative. The dashboard's own five-order fetch was the
 * tempting free source and is exactly what this rules out — the counts here span
 * every card on the floor, not a page of recent orders.
 *
 * `isJobCardOnFloor` is the shared definition of "still working", the same line
 * `deriveProductionStatus` draws.
 */
describe("production funnel counts", () => {
  let factoryId: string;
  let seeded = false;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const cleanup = {
    departments: [] as string[],
    workOrders: [] as string[],
    plans: [] as string[],
    blueprints: [] as string[],
    items: [] as string[],
  };

  /** name → how many live cards it should end up with. */
  const DISTRIBUTION: Record<string, string[]> = {
    // Every non-COMPLETED status counts: a blocked or held card is still queued
    // at its stage, and omitting them would make a stalled floor look idle.
    Cutting: ["IN_PROGRESS", "WAITING", "ON_HOLD"],
    Stitching: ["BLOCKED", "REWORK_REQUIRED"],
    Finishing: ["QC_PENDING"],
    // A stage whose work is done reports zero, not absent — an empty bucket is
    // information.
    Packing: [JOB_CARD_DONE, JOB_CARD_DONE],
  };

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;
  });

  afterAll(async () => {
    for (const id of cleanup.workOrders) {
      await prisma.jobCard.deleteMany({ where: { workOrderId: id } });
      await prisma.workOrder.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of cleanup.plans) {
      await prisma.productionPlan.delete({ where: { id } }).catch(() => undefined);
    }
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

  /** A work order to hang job cards from — the relation is required. */
  async function makeWorkOrder() {
    const sku = `FUNNEL-${suffix}`;
    const item = await prisma.itemMaster.create({
      data: {
        factoryId,
        itemType: "FINISHED_PRODUCT",
        manufacturingType: "MAKE",
        name: `Funnel test ${suffix}`,
        sku,
        itemCode: sku,
        defaultUOM: "PCS",
      },
      select: { id: true },
    });
    cleanup.items.push(item.id);

    const blueprint = await prisma.blueprint.create({
      data: { factoryId, itemId: item.id },
      select: { id: true },
    });
    cleanup.blueprints.push(blueprint.id);

    const version = await prisma.blueprintVersion.create({
      data: { blueprintId: blueprint.id, versionNumber: 1, name: "V1", isActive: true },
      select: { id: true },
    });

    const plan = await prisma.productionPlan.create({
      data: { factoryId, blueprintVersionId: version.id, quantity: 10, status: "RELEASED" },
      select: { id: true },
    });
    cleanup.plans.push(plan.id);

    const workOrder = await prisma.workOrder.create({
      data: {
        factoryId,
        woNumber: `WO-FUNNEL-${suffix}`,
        productionPlanId: plan.id,
        targetQty: 10,
        status: "IN_PROGRESS",
      },
      select: { id: true },
    });
    cleanup.workOrders.push(workOrder.id);
    return workOrder.id;
  }

  /** The exact query the dashboard runs. */
  async function readFunnel(deptIds: string[]) {
    const rows = await prisma.department.findMany({
      where: { factoryId, active: true, id: { in: deptIds } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        name: true,
        _count: { select: { jobCards: { where: { status: { not: JOB_CARD_DONE } } } } },
      },
    });
    return rows.map((r) => ({ name: r.name, count: r._count.jobCards }));
  }

  it("counts live job cards per stage, and keeps the floor's own order", async () => {
    if (!seeded) return;
    const workOrderId = await makeWorkOrder();

    const deptIds: string[] = [];
    let sequence = 0;
    const names = Object.keys(DISTRIBUTION);

    for (const [index, name] of names.entries()) {
      const dept = await prisma.department.create({
        // sortOrder is what the strip reads, so it is set deliberately here and
        // the departments are created in that order too — a test where both
        // agree cannot tell you which one the query used.
        data: { factoryId, name: `${name} ${suffix}`, sortOrder: index },
        select: { id: true },
      });
      cleanup.departments.push(dept.id);
      deptIds.push(dept.id);

      for (const status of DISTRIBUTION[name]) {
        sequence += 1;
        await prisma.jobCard.create({
          data: {
            factoryId,
            workOrderId,
            departmentId: dept.id,
            sequence,
            status,
            targetQty: 1,
          },
        });
      }
    }

    const funnel = await readFunnel(deptIds);

    expect(funnel.map((s) => s.name)).toEqual(names.map((n) => `${n} ${suffix}`));
    expect(funnel.map((s) => s.count)).toEqual([3, 2, 1, 0]);
  });

  it("orders by sortOrder, not by name or creation", async () => {
    if (!seeded) return;
    // The reason to assert this separately: a route runs Cutting → Stitching →
    // Packing, which happens to be neither alphabetical nor insertion order once
    // a factory reorders its departments.
    const deptIds: string[] = [];
    for (const [name, sortOrder] of [["Zebra", 0], ["Alpha", 1]] as const) {
      const dept = await prisma.department.create({
        data: { factoryId, name: `${name} ord ${suffix}`, sortOrder },
        select: { id: true },
      });
      cleanup.departments.push(dept.id);
      deptIds.push(dept.id);
    }

    const funnel = await readFunnel(deptIds);
    expect(funnel[0].name).toContain("Zebra");
    expect(funnel[1].name).toContain("Alpha");
  });

  it("excludes an inactive department from the strip", async () => {
    if (!seeded) return;
    // A retired department with historic cards must not sit on the funnel for
    // ever showing zero.
    const dept = await prisma.department.create({
      data: { factoryId, name: `Retired ${suffix}`, sortOrder: 99, active: false },
      select: { id: true },
    });
    cleanup.departments.push(dept.id);

    const funnel = await readFunnel([dept.id]);
    expect(funnel).toEqual([]);
  });
});

describe("isJobCardOnFloor", () => {
  it("treats every non-terminal status as live", () => {
    for (const status of [
      "WAITING",
      "IN_PROGRESS",
      "ON_HOLD",
      "BLOCKED",
      "QC_PENDING",
      "AWAITING_APPROVAL",
      "REWORK_REQUIRED",
    ]) {
      expect(isJobCardOnFloor(status), `${status} should count as on the floor`).toBe(true);
    }
  });

  it("treats only COMPLETED as finished", () => {
    expect(isJobCardOnFloor(JOB_CARD_DONE)).toBe(false);
  });
});
