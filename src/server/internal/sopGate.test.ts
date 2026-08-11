import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { checkOpeningSop } from "./sopGate";

/**
 * The daily SOP gate, against the real database.
 *
 * Two directions matter equally and they fail in opposite ways.
 *
 * If it does not close, the checklist is decoration — an outlet trades all day
 * without anyone confirming the fridges are cold.
 *
 * If it closes when it should not, it blocks a business that never asked for
 * the rule. That is the more dangerous failure, because it takes a working
 * factory offline, so the "opens by default" cases are tested first and
 * hardest.
 */
describe("checkOpeningSop", () => {
  let factoryId: string;
  let seeded = false;
  const created = { sites: [] as string[], templates: [] as string[], inspections: [] as string[] };

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;
  });

  afterAll(async () => {
    if (created.inspections.length) {
      await prisma.serviceInspection.deleteMany({ where: { id: { in: created.inspections } } });
    }
    if (created.templates.length) {
      await prisma.checklistTemplate.deleteMany({ where: { id: { in: created.templates } } });
    }
    if (created.sites.length) {
      await prisma.site.deleteMany({ where: { id: { in: created.sites } } });
    }
    await prisma.$disconnect();
  });

  async function makeSite(name: string) {
    const site = await prisma.site.create({
      data: {
        factoryId,
        name,
        siteCode: `SOP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        status: "ACTIVE",
      },
    });
    created.sites.push(site.id);
    return site.id;
  }

  async function makeTemplate(name: string) {
    const template = await prisma.checklistTemplate.create({
      data: { factoryId, name, status: "active" },
    });
    created.templates.push(template.id);
    return template.id;
  }

  it("opens when the order belongs to no outlet", async () => {
    if (!seeded) return;
    // A factory has no outlets. It must never be gated.
    expect((await checkOpeningSop(factoryId, null)).open).toBe(true);
    expect((await checkOpeningSop(factoryId, undefined)).open).toBe(true);
  });

  it("opens when the tenant has configured no opening checklist", async () => {
    if (!seeded) return;
    // The rule is opt-in. Inventing it for everyone would take working
    // businesses offline the day this shipped.
    const siteId = await makeSite("SOP Test — no checklist");
    expect((await checkOpeningSop(factoryId, siteId)).open).toBe(true);
  });

  it("closes when an opening checklist exists and today's is not done", async () => {
    if (!seeded) return;
    const siteId = await makeSite("SOP Test — gated");
    await makeTemplate("Opening SOP");

    const verdict = await checkOpeningSop(factoryId, siteId);
    expect(verdict.open).toBe(false);
    expect(verdict.reason).toMatch(/not been completed/i);
    expect(verdict.checklistName).toBe("Opening SOP");
  });

  it("distinguishes started-but-unapproved from not-started", async () => {
    if (!seeded) return;
    // The person reading this needs to know whether to finish something or
    // begin it. One sentence for both would be useless.
    const siteId = await makeSite("SOP Test — in flight");
    const templateId = await makeTemplate("Daily SOP");

    const workOrder = await prisma.serviceWorkOrder.create({
      data: { factoryId, woNumber: `SOPWO-${Date.now()}`, title: "SOP run", siteId },
    });
    const inspection = await prisma.serviceInspection.create({
      data: { factoryId, serviceWorkOrderId: workOrder.id, siteId, checklistId: templateId, status: "IN_PROGRESS" },
    });
    created.inspections.push(inspection.id);

    const verdict = await checkOpeningSop(factoryId, siteId);
    expect(verdict.open).toBe(false);
    expect(verdict.reason).toMatch(/started but not yet approved/i);

    await prisma.serviceWorkOrder.delete({ where: { id: workOrder.id } }).catch(() => undefined);
  });

  it("opens once today's checklist is approved", async () => {
    if (!seeded) return;
    const siteId = await makeSite("SOP Test — passed");
    const templateId = await makeTemplate("Opening SOP");

    const workOrder = await prisma.serviceWorkOrder.create({
      data: { factoryId, woNumber: `SOPWO-${Date.now()}-b`, title: "SOP run", siteId },
    });
    const inspection = await prisma.serviceInspection.create({
      data: {
        factoryId,
        serviceWorkOrderId: workOrder.id,
        siteId,
        checklistId: templateId,
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
    created.inspections.push(inspection.id);

    expect((await checkOpeningSop(factoryId, siteId)).open).toBe(true);

    await prisma.serviceWorkOrder.delete({ where: { id: workOrder.id } }).catch(() => undefined);
  });

  it("does not accept yesterday's approval for today", async () => {
    if (!seeded) return;
    // The entire point of a *daily* checklist. Yesterday's clean kitchen says
    // nothing about this morning.
    const siteId = await makeSite("SOP Test — stale");
    const templateId = await makeTemplate("Opening SOP");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const workOrder = await prisma.serviceWorkOrder.create({
      data: { factoryId, woNumber: `SOPWO-${Date.now()}-c`, title: "SOP run", siteId },
    });
    const inspection = await prisma.serviceInspection.create({
      data: {
        factoryId,
        serviceWorkOrderId: workOrder.id,
        siteId,
        checklistId: templateId,
        status: "APPROVED",
        approvedAt: yesterday,
        createdAt: yesterday,
      },
    });
    created.inspections.push(inspection.id);

    expect((await checkOpeningSop(factoryId, siteId)).open).toBe(false);

    await prisma.serviceWorkOrder.delete({ where: { id: workOrder.id } }).catch(() => undefined);
  });

  it("does not let one outlet's completed SOP open another", async () => {
    if (!seeded) return;
    // The gate is per outlet. A network where head office completing one
    // checklist unlocks fifty stores is not a gate.
    const passed = await makeSite("SOP Test — sibling passed");
    const other = await makeSite("SOP Test — sibling blocked");
    const templateId = await makeTemplate("Opening SOP");

    const workOrder = await prisma.serviceWorkOrder.create({
      data: { factoryId, woNumber: `SOPWO-${Date.now()}-d`, title: "SOP run", siteId: passed },
    });
    const inspection = await prisma.serviceInspection.create({
      data: {
        factoryId,
        serviceWorkOrderId: workOrder.id,
        siteId: passed,
        checklistId: templateId,
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
    created.inspections.push(inspection.id);

    expect((await checkOpeningSop(factoryId, passed)).open).toBe(true);
    expect((await checkOpeningSop(factoryId, other)).open).toBe(false);

    await prisma.serviceWorkOrder.delete({ where: { id: workOrder.id } }).catch(() => undefined);
  });
});
