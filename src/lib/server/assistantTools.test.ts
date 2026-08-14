import { describe, it, expect } from "vitest";

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
    const restaurant = assistantToolSpecs(["tables_orders", "kitchen", "billing"]);
    const names = restaurant.map((t) => t.function.name);
    expect(names).toContain("count_active_orders");
    expect(names).toContain("find_order");
    // No booking module here, so its tool is not offered.
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
    for (const spec of assistantToolSpecs(["tables_orders", "booking"])) {
      expect(spec.type).toBe("function");
      expect(typeof spec.function.name).toBe("string");
      expect(spec.function.parameters.type).toBe("object");
    }
  });
});
