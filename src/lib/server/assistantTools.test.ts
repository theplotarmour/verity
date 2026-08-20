import { describe, it, expect, beforeAll, afterAll } from "vitest";

import prisma from "@/lib/prisma";
import { getModule } from "@/platform/modules/registry";
import {
  ASSISTANT_TOOLS,
  assistantToolSpecs,
  stripTenantKeys,
} from "./assistantTools";

/**
 * R3 — tenant-scoped grounding.
 *
 * The one property that matters: the model can never choose the tenant. `factoryId`
 * is a positional argument the route fills from the session; it is not, and must
 * never become, a tool parameter the model fills. These tests pin both halves —
 * the schemas expose no tenant key, and the scrubber drops one if a prompt tries to
 * inject it anyway.
 */

const TENANT_KEYS = ["factoryId", "organizationId", "tenantId", "factory", "org"];

describe("tool schemas expose no tenant parameter", () => {
  it.each(ASSISTANT_TOOLS.map((t) => t.name))("%s takes no factoryId/tenant param", (name) => {
    const tool = ASSISTANT_TOOLS.find((t) => t.name === name)!;
    const props = Object.keys(tool.parameters.properties ?? {});
    for (const key of TENANT_KEYS) {
      expect(props, `${name} must not let the model set ${key}`).not.toContain(key);
    }
  });

  it("every tool gates on a module the registry actually has", () => {
    for (const tool of ASSISTANT_TOOLS) {
      expect(getModule(tool.module), `${tool.name} gates on unknown module ${tool.module}`).toBeDefined();
    }
  });
});

describe("stripTenantKeys", () => {
  it("drops an injected factoryId while keeping real arguments", () => {
    // The attack: a prompt-injected tool call carrying someone else's tenant id.
    const cleaned = stripTenantKeys({ factoryId: "another-tenant", query: "#12" });
    expect(cleaned).not.toHaveProperty("factoryId");
    expect(cleaned).toEqual({ query: "#12" });
  });

  it("drops every tenant-identifying alias", () => {
    const cleaned = stripTenantKeys({
      factoryId: "x",
      organizationId: "y",
      tenantId: "z",
      factory: "a",
      org: "b",
      limit: 3,
    });
    expect(cleaned).toEqual({ limit: 3 });
  });

  it("is safe on null or empty args", () => {
    expect(stripTenantKeys(null)).toEqual({});
    expect(stripTenantKeys(undefined)).toEqual({});
    expect(stripTenantKeys({})).toEqual({});
  });
});

describe("assistantToolSpecs", () => {
  it("offers only the tools a tenant is entitled to", () => {
    // A tenant with neither module is offered nothing, however many tools exist.
    const names = assistantToolSpecs(["billing", "inventory"]).map((t) => t.function.name);
    expect(names).not.toContain("upcoming_appointments");
  });

  it("offers the booking tool only when booking is entitled", () => {
    const salon = assistantToolSpecs(["booking"]);
    expect(salon.map((t) => t.function.name)).toEqual(["upcoming_appointments"]);
  });

  it("offers nothing to a bare tenant", () => {
    expect(assistantToolSpecs([])).toEqual([]);
  });

  it("shapes every spec as an OpenAI-style function tool", () => {
    for (const spec of assistantToolSpecs(["booking"])) {
      expect(spec.type).toBe("function");
      expect(typeof spec.function.name).toBe("string");
      expect(spec.function.parameters.type).toBe("object");
    }
  });
});

/**
 * R4 apply — the write the Approve button triggers.
 *
 * The action guards, re-reads scoped to the session's factory, then writes with a
 * factory-scoped `updateMany`. This pins the load-bearing half of that: the same
 * write aimed at another tenant's row matches nothing. The action itself needs a
 * session, so it is tested through the query it relies on, the same way the dining
 * action tests do.
 */
describe("applying a price change is factory-scoped", () => {
  let factoryId: string;
  let itemId: string;
  let categoryId: string;
  let seeded = false;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "kents" }, select: { id: true } });
    if (!factory) return;
    factoryId = factory.id;
    const category = await prisma.menuCategory.create({
      data: { factoryId, name: `Assistant test ${suffix}` },
      select: { id: true },
    });
    categoryId = category.id;
    const item = await prisma.menuItem.create({
      data: { factoryId, categoryId, name: `Proposal Chai ${suffix}`, price: 5000 },
      select: { id: true },
    });
    itemId = item.id;
    seeded = true;
  });

  afterAll(async () => {
    if (!seeded) return;
    await prisma.menuItem.deleteMany({ where: { categoryId } });
    await prisma.menuCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("writes the new price on the owning factory", async () => {
    if (!seeded) return;
    const { count } = await prisma.menuItem.updateMany({
      where: { id: itemId, factoryId },
      data: { price: 6000 },
    });
    expect(count).toBe(1);
    const row = await prisma.menuItem.findUniqueOrThrow({ where: { id: itemId }, select: { price: true } });
    expect(row.price).toBe(6000);
  });

  it("changes nothing when the same write is aimed at another tenant", async () => {
    if (!seeded) return;
    const { count } = await prisma.menuItem.updateMany({
      where: { id: itemId, factoryId: "some-other-factory" },
      data: { price: 999_00 },
    });
    expect(count).toBe(0);
    const row = await prisma.menuItem.findUniqueOrThrow({ where: { id: itemId }, select: { price: true } });
    // Still the value the owning-factory write set, untouched by the foreign one.
    expect(row.price).toBe(6000);
  });
});
