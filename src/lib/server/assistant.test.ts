import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { $Enums } from "@prisma/client";
import prisma from "@/lib/prisma";
import { GROQ_MODELS, routeModel } from "./groq";
import { schemaEnums, buildAssistantContext, contextToPrompt } from "./assistantContext";
import { ASSISTANT_TOKEN_CAP, checkAssistantBudget } from "./assistantBudget";

/**
 * The assistant's foundation.
 *
 * Everything here is about what the model is allowed to be told and what it is
 * allowed to cost. Both are grounding problems: a model told about a module the
 * tenant does not have will confidently describe a screen that redirects, and a
 * model told a status called COMPLETED will send someone hunting for a button that
 * the schema calls ATTENDED.
 */

describe("model routing", () => {
  it("sends the latency-sensitive path to the small model", () => {
    // "Where is order 41" must feel instant.
    expect(routeModel("operational")).toBe(GROQ_MODELS.fast);
  });

  it("sends the analytical path to the large one", () => {
    // "Why did rework double last week" is asked once and worth four seconds.
    expect(routeModel("analytical")).toBe(GROQ_MODELS.analytical);
  });
});

describe("schema enums", () => {
  it("matches the generated client exactly", () => {
    // The whole point: nothing hand-maintained. If this drifts, the schema drifted.
    expect(schemaEnums().ScheduleStatus).toEqual(Object.values($Enums.ScheduleStatus));
  });

  it("carries ATTENDED, not COMPLETED", () => {
    // The concrete trap. ScheduleStatus has no COMPLETED, and a model that invents
    // one sends a user looking for a button that does not exist.
    expect(schemaEnums().ScheduleStatus).toContain("ATTENDED");
    expect(schemaEnums().ScheduleStatus).not.toContain("COMPLETED");
  });

  it("carries the restaurant enums the new modules added", () => {
    expect(schemaEnums().OrderState).toEqual(Object.values($Enums.OrderState));
    expect(schemaEnums().PaymentMethod).toEqual(["CASH", "UPI", "CARD", "OTHER"]);
  });

  it("drops an enum that no longer exists rather than shipping a stale list", () => {
    // A renamed enum stops appearing. It never reads as authoritative-but-wrong.
    const values = schemaEnums();
    for (const [name, list] of Object.entries(values)) {
      expect(list.length, `${name} is empty`).toBeGreaterThan(0);
      expect((($Enums as unknown as Record<string, object>)[name]), `${name} is not a real enum`).toBeDefined();
    }
  });
});

describe("assistant context", () => {
  let factoryId: string;
  let seeded = false;

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists only the modules this tenant actually has", async () => {
    if (!seeded) return;
    const context = await buildAssistantContext(factoryId, "/owner/dashboard");
    const keys = context.modules.map((m) => m.key);

    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toContain("core");
    // Carxen is auto components. Restaurant modules are not installed, and the
    // assistant must not describe a kitchen display it cannot open.
    for (const absent of ["menu", "tables_orders", "kitchen", "serving"]) {
      expect(keys, `${absent} is not entitled and must not be in context`).not.toContain(absent);
    }
  });

  it("carries the route it was given", async () => {
    if (!seeded) return;
    const context = await buildAssistantContext(factoryId, "/owner/production");
    expect(context.route).toBe("/owner/production");
  });

  it("returns an empty module list for an unknown factory rather than throwing", async () => {
    const context = await buildAssistantContext("does-not-exist", "/owner/dashboard");
    expect(context.modules).toEqual([]);
    expect(context.enums.ScheduleStatus).toBeTruthy();
  });

  it("puts the modules and the exact enum values into the prompt", async () => {
    if (!seeded) return;
    const prompt = contextToPrompt(await buildAssistantContext(factoryId, "/owner/dashboard"));
    expect(prompt).toContain("Installed modules");
    expect(prompt).toContain("ATTENDED");
    expect(prompt).toContain("Never invent one");
  });
});

describe("token budget", () => {
  let organizationId: string;
  let factoryId: string;
  let seeded = false;
  let original: { status: string; used: number; resetAt: Date | null } | null = null;

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({
      where: { slug: "carxen" },
      select: { id: true, organizationId: true },
    });
    if (!factory) return;
    factoryId = factory.id;
    organizationId = factory.organizationId;

    const subscription = await prisma.tenantSubscription.findUnique({
      where: { organizationId },
      select: { status: true, assistantTokensUsed: true, assistantTokenResetAt: true },
    });
    if (!subscription) return;
    original = {
      status: subscription.status,
      used: subscription.assistantTokensUsed,
      resetAt: subscription.assistantTokenResetAt,
    };
    seeded = true;
  });

  afterAll(async () => {
    // Put the tenant back exactly as found — this is a live subscription row.
    if (original) {
      await prisma.tenantSubscription.update({
        where: { organizationId },
        data: {
          status: original.status as never,
          assistantTokensUsed: original.used,
          assistantTokenResetAt: original.resetAt,
        },
      });
    }
    await prisma.$disconnect();
  });

  async function setSubscription(status: string, used: number) {
    await prisma.tenantSubscription.update({
      where: { organizationId },
      data: { status: status as never, assistantTokensUsed: used, assistantTokenResetAt: new Date() },
    });
  }

  it("refuses a TRIAL_EXPIRED tenant before the model is ever called", async () => {
    if (!seeded) return;
    await setSubscription("TRIAL_EXPIRED", 0);
    const verdict = await checkAssistantBudget(factoryId);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/read-only/i);
  });

  it("refuses a READ_ONLY tenant too", async () => {
    if (!seeded) return;
    await setSubscription("READ_ONLY", 0);
    expect((await checkAssistantBudget(factoryId)).ok).toBe(false);
  });

  it("caps a trial tighter than a paying tenant", async () => {
    if (!seeded) return;
    expect(ASSISTANT_TOKEN_CAP.trial).toBeLessThan(ASSISTANT_TOKEN_CAP.paid);

    await setSubscription("TRIAL", ASSISTANT_TOKEN_CAP.trial);
    expect((await checkAssistantBudget(factoryId)).ok, "trial over cap").toBe(false);

    // The same spend is fine on a paid plan.
    await setSubscription("ACTIVE", ASSISTANT_TOKEN_CAP.trial);
    expect((await checkAssistantBudget(factoryId)).ok, "paid under cap").toBe(true);
  });

  it("allows an active tenant under the cap", async () => {
    if (!seeded) return;
    await setSubscription("ACTIVE", 10);
    const verdict = await checkAssistantBudget(factoryId);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.cap).toBe(ASSISTANT_TOKEN_CAP.paid);
  });

  it("does not lock out a tenant with no subscription row", async () => {
    // Tenants predating billing. A missing row must not mean no assistant.
    const orphan = await prisma.factory.findFirst({
      where: { organization: { subscription: null } },
      select: { id: true },
    });
    if (!orphan) return;
    expect((await checkAssistantBudget(orphan.id)).ok).toBe(true);
  });
});

describe("the assistant route", () => {
  const code = readFileSync(
    path.resolve(__dirname, "../../app/api/assistant/route.ts"),
    "utf8"
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "");

  it("reads the tenant from the session, never from the body", () => {
    expect(code).toMatch(/getActiveSessionUser\(\)/);
    expect(code).toMatch(/session\.factoryId/);
    expect(code).not.toMatch(/body\.factoryId/);
  });

  // Measured inside the handler: at file scope the imports come first, so every
  // ordering claim would be about import order rather than execution order.
  const body = code.slice(code.indexOf("export async function POST"));

  it("checks configuration before anything else", () => {
    // An unset key arrives from Groq as a 401 that reads like a revoked
    // credential — and sends somebody to rotate a key that was never set.
    expect(body.indexOf("isGroqConfigured")).toBeLessThan(body.indexOf("getActiveSessionUser"));
  });

  it("authenticates before spending a query on context", () => {
    expect(body.indexOf("getActiveSessionUser")).toBeLessThan(body.indexOf("buildAssistantContext"));
  });

  it("checks the budget before calling the model", () => {
    expect(body.indexOf("checkAssistantBudget")).toBeLessThan(body.indexOf("groqClient()"));
  });

  it("reports a cap as 429, not 500", () => {
    expect(code).toMatch(/status: 429/);
  });

  it("records what the call actually cost", () => {
    expect(code).toMatch(/recordAssistantTokens\(budget\.organizationId, tokens\)/);
  });
});
