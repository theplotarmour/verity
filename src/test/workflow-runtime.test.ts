import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import type { ActorContext } from "@/server/platform/command";
import {
  clearNodeHandlers,
  evaluateCondition,
  executeWorkflow,
  registerNodeHandler,
  revealCredential,
  storeCredential,
  WorkflowError,
  type AutomationPayload,
} from "@/server/platform/workflow";

/**
 * Workflow runtime gate test.
 * Authority: MET-AUT-001→003, MET-WKF-001→003.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "workflow-runtime.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("workflow runtime", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let actor: ActorContext;

  /** Builds a workflow: trigger -> (approve | dispatch) based on a threshold. */
  async function buildRoutingWorkflow(key: string) {
    return withTenant(tenantA, async (tx) => {
      const wf = await tx.workflowDefinition.create({ data: { tenantId: tenantA, key } });
      const trigger = await tx.workflowNode.create({
        data: { tenantId: tenantA, workflowId: wf.id, key: "start", type: "Trigger", handlerKey: "test.passthrough" },
      });
      const approve = await tx.workflowNode.create({
        data: { tenantId: tenantA, workflowId: wf.id, key: "approve", type: "Action", handlerKey: "test.mark", config: { mark: "awaiting_vp_approval" } },
      });
      const dispatch = await tx.workflowNode.create({
        data: { tenantId: tenantA, workflowId: wf.id, key: "dispatch", type: "Action", handlerKey: "test.mark", config: { mark: "awaiting_scheduler_dispatch" } },
      });
      // Conditional edge first, unconditional fallback second — order matters.
      await tx.workflowEdge.create({
        data: { tenantId: tenantA, workflowId: wf.id, fromNodeId: trigger.id, toNodeId: approve.id, condition: { path: "total", op: "gt", value: 5000 } },
      });
      await tx.workflowEdge.create({
        data: { tenantId: tenantA, workflowId: wf.id, fromNodeId: trigger.id, toNodeId: dispatch.id },
      });
      return { wf, trigger, approve, dispatch };
    });
  }

  beforeAll(async () => {
    await assertRlsEnforceable();
    for (const id of [tenantA, tenantB]) {
      await withTenant(id, (tx) => tx.tenant.create({ data: { id, name: `T-${id.slice(0, 4)}` } }));
    }
    actor = {
      tenantId: tenantA,
      userId: randomUUID(),
      membershipId: randomUUID(),
      organizationId: randomUUID(),
      roleId: null,
    };
  });

  beforeEach(() => {
    registerNodeHandler("test.passthrough", async (_ctx, input) => input);
    registerNodeHandler("test.mark", async (ctx, input) => ({
      json: { ...input.json, routedTo: (ctx.node.config as { mark: string }).mark },
    }));
    registerNodeHandler("test.boom", async () => {
      throw new Error("node exploded");
    });
  });

  afterEach(() => clearNodeHandlers());

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("evaluates declarative conditions over the envelope (MET-WKF-002)", () => {
    const p: AutomationPayload = { json: { total: 6000, nested: { flag: true } } };
    expect(evaluateCondition({ path: "total", op: "gt", value: 5000 }, p)).toBe(true);
    expect(evaluateCondition({ path: "total", op: "lt", value: 5000 }, p)).toBe(false);
    expect(evaluateCondition({ path: "nested.flag", op: "eq", value: true }, p)).toBe(true);
    expect(evaluateCondition({ path: "missing", op: "exists" }, p)).toBe(false);
    expect(evaluateCondition(null, p)).toBe(true);
  });

  it("does not let a mis-declared ordering comparison evaluate true", () => {
    const p: AutomationPayload = { json: { total: "lots" } };
    expect(evaluateCondition({ path: "total", op: "gt", value: 5000 }, p)).toBe(false);
  });

  it("routes down the branch whose condition holds (MET-WKF-002)", async () => {
    await buildRoutingWorkflow("wf.routing.high");
    const out = await executeWorkflow(actor, "wf.routing.high", { json: { total: 9000 } });
    expect(out.status).toBe("Succeeded");
    expect(out.output.json.routedTo).toBe("awaiting_vp_approval");
  });

  it("falls through to the unconditional branch otherwise", async () => {
    await buildRoutingWorkflow("wf.routing.low");
    const out = await executeWorkflow(actor, "wf.routing.low", { json: { total: 100 } });
    expect(out.output.json.routedTo).toBe("awaiting_scheduler_dispatch");
  });

  it("records each node as its own step (MET-WKF-001)", async () => {
    await buildRoutingWorkflow("wf.steps");
    const out = await executeWorkflow(actor, "wf.steps", { json: { total: 9000 } });
    const steps = await withTenant(tenantA, (tx) =>
      tx.workflowStepRun.findMany({ where: { runId: out.runId }, orderBy: { sequence: "asc" } }),
    );
    expect(steps).toHaveLength(2);
    expect(steps.every((s) => s.status === "Succeeded")).toBe(true);
  });

  it("marks the run failed and preserves completed steps when a node throws", async () => {
    const { wf, trigger } = await buildRoutingWorkflow("wf.failing");
    await withTenant(tenantA, async (tx) => {
      const boom = await tx.workflowNode.create({
        data: { tenantId: tenantA, workflowId: wf.id, key: "boom", type: "Action", handlerKey: "test.boom" },
      });
      // Re-point: remove existing edges from trigger, then route to the failing node.
      await tx.workflowEdge.deleteMany({ where: { fromNodeId: trigger.id } });
      await tx.workflowEdge.create({
        data: { tenantId: tenantA, workflowId: wf.id, fromNodeId: trigger.id, toNodeId: boom.id },
      });
    });

    await expect(executeWorkflow(actor, "wf.failing", { json: {} })).rejects.toThrow(/node exploded/);

    const run = await withTenant(tenantA, (tx) =>
      tx.workflowRun.findFirstOrThrow({ where: { workflowId: wf.id }, orderBy: { startedAt: "desc" } }),
    );
    expect(run.status).toBe("Failed");
    expect(run.error).toMatch(/node exploded/);

    // The trigger step committed before the failure and is still recorded.
    const steps = await withTenant(tenantA, (tx) =>
      tx.workflowStepRun.findMany({ where: { runId: run.id } }),
    );
    expect(steps.some((s) => s.status === "Succeeded")).toBe(true);
  });

  it("deduplicates runs by idempotency key", async () => {
    await buildRoutingWorkflow("wf.idem");
    const key = `idem-${randomUUID()}`;
    const first = await executeWorkflow(actor, "wf.idem", { json: { total: 1 } }, { idempotencyKey: key });
    const second = await executeWorkflow(actor, "wf.idem", { json: { total: 1 } }, { idempotencyKey: key });
    expect(second.runId).toBe(first.runId);

    const runs = await withTenant(tenantA, (tx) =>
      tx.workflowRun.findMany({ where: { idempotencyKey: key } }),
    );
    expect(runs).toHaveLength(1);
  });

  it("refuses an unknown or disabled workflow", async () => {
    await expect(executeWorkflow(actor, "wf.missing", { json: {} })).rejects.toBeInstanceOf(
      WorkflowError,
    );
    const { wf } = await buildRoutingWorkflow("wf.disabled");
    await withTenant(tenantA, (tx) =>
      tx.workflowDefinition.update({ where: { id: wf.id }, data: { enabled: false } }),
    );
    await expect(executeWorkflow(actor, "wf.disabled", { json: {} })).rejects.toThrow(/disabled/);
  });

  it("refuses a node type that has no registered handler", async () => {
    await withTenant(tenantA, async (tx) => {
      const wf = await tx.workflowDefinition.create({ data: { tenantId: tenantA, key: "wf.nohandler" } });
      await tx.workflowNode.create({
        data: { tenantId: tenantA, workflowId: wf.id, key: "start", type: "Trigger", handlerKey: "test.unregistered" },
      });
    });
    await expect(executeWorkflow(actor, "wf.nohandler", { json: {} })).rejects.toThrow(
      /No handler registered/,
    );
  });

  it("rejects a cyclic graph on write (MET-AUT-001 requires a DAG)", async () => {
    const { wf, trigger, approve } = await buildRoutingWorkflow("wf.cycle");
    await expect(
      withTenant(tenantA, (tx) =>
        tx.workflowEdge.create({
          data: { tenantId: tenantA, workflowId: wf.id, fromNodeId: approve.id, toNodeId: trigger.id },
        }),
      ),
    ).rejects.toThrow();

    await expect(
      withTenant(tenantA, (tx) =>
        tx.workflowEdge.create({
          data: { tenantId: tenantA, workflowId: wf.id, fromNodeId: trigger.id, toNodeId: trigger.id },
        }),
      ),
    ).rejects.toThrow();
  });

  it("round-trips an encrypted credential (MET-AUT-003)", async () => {
    const key = "unit-test-key";
    await withTenant(tenantA, (tx) => storeCredential(tx, "stripe", "sk_live_secret", key));
    const revealed = await withTenant(tenantA, (tx) => revealCredential(tx, "stripe", key));
    expect(revealed).toBe("sk_live_secret");
  });

  it("stores the secret as ciphertext, not plaintext", async () => {
    const row = await withTenant(tenantA, (tx) =>
      tx.credential.findFirstOrThrow({ where: { name: "stripe" } }),
    );
    expect(Buffer.from(row.secret).toString("utf8")).not.toContain("sk_live_secret");
  });

  it("does not reveal a credential under the wrong key", async () => {
    await expect(
      withTenant(tenantA, (tx) => revealCredential(tx, "stripe", "wrong-key")),
    ).rejects.toThrow();
  });

  it("keeps workflows, runs and credentials invisible to another tenant", async () => {
    const seen = await withTenant(tenantB, async (tx) => ({
      workflows: await tx.workflowDefinition.count(),
      runs: await tx.workflowRun.count(),
      credentials: await tx.credential.count(),
    }));
    expect(seen).toEqual({ workflows: 0, runs: 0, credentials: 0 });
    expect(await withTenant(tenantB, (tx) => revealCredential(tx, "stripe", "unit-test-key"))).toBeNull();
  });
});
