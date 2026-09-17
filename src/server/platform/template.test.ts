import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { withTenant } from "./tenancy";
import type { ActorContext } from "./command";
import {
  TemplateError,
  completeChecklistStep,
  createTemplateVersion,
  renderDocumentInstance,
  startChecklistInstance,
  submitFormInstance,
} from "./template";

/**
 * Versioned form/document/checklist templates (Authority: Task 108 WP-11B,
 * VCA-009). Same throwaway-tenant pattern as `pack.test.ts`.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "template.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("Template registry (WP-11B)", () => {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const organizationId = randomUUID();
  let roleId = "";
  let actor: ActorContext;

  beforeAll(async () => {
    await withTenant(tenantId, (tx) => tx.tenant.create({ data: { id: tenantId, name: `T-tmpl-${tenantId.slice(0, 4)}` } }));
    const role = await withTenant(tenantId, (tx) => tx.role.create({ data: { tenantId, name: "TemplateAdmin" } }));
    roleId = role.id;
    await withTenant(tenantId, (tx) =>
      tx.permission.createMany({
        data: [
          { tenantId, roleId, verb: "Create", entity: "verity.platform.template", scope: "Tenant" },
          { tenantId, roleId, verb: "Read", entity: "verity.platform.template", scope: "Tenant" },
          { tenantId, roleId, verb: "Edit", entity: "verity.platform.template", scope: "Tenant" },
        ],
      }),
    );
    actor = { tenantId, userId, membershipId, organizationId, roleId };
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("rejects a malformed form schema", async () => {
    await expect(
      withTenant(tenantId, (tx) =>
        createTemplateVersion(tx, actor, { contributionId: "verity.test.tmpl.form", kind: "Form", name: "Bad", schema: { fields: [] } }),
      ),
    ).rejects.toThrow(/E_TEMPLATE_SCHEMA_INVALID/);
  });

  it("submits a valid Form instance and rejects unknown/missing-required fields", async () => {
    const { id } = await withTenant(tenantId, (tx) =>
      createTemplateVersion(tx, actor, {
        contributionId: "verity.test.tmpl.form",
        kind: "Form",
        name: "Intake",
        schema: { fields: [{ key: "name", label: "Name", type: "String", required: true }, { key: "notes", label: "Notes", type: "String" }] },
      }),
    );

    await expect(
      withTenant(tenantId, (tx) => submitFormInstance(tx, actor, { definitionId: id, values: { notes: "hi" } })),
    ).rejects.toThrow(/missing required/);

    await expect(
      withTenant(tenantId, (tx) => submitFormInstance(tx, actor, { definitionId: id, values: { name: "A", bogus: "x" } })),
    ).rejects.toThrow(/unknown field/);

    const submitted = await withTenant(tenantId, (tx) => submitFormInstance(tx, actor, { definitionId: id, values: { name: "Acme" } }));
    expect(submitted.instanceId).toBeTruthy();
  });

  it("refuses a submission against a superseded version", async () => {
    const v1 = await withTenant(tenantId, (tx) =>
      createTemplateVersion(tx, actor, {
        contributionId: "verity.test.tmpl.form_v",
        kind: "Form",
        name: "V1",
        schema: { fields: [{ key: "a", label: "A", type: "String" }] },
      }),
    );
    await withTenant(tenantId, (tx) =>
      createTemplateVersion(tx, actor, {
        contributionId: "verity.test.tmpl.form_v",
        kind: "Form",
        name: "V2",
        schema: { fields: [{ key: "a", label: "A", type: "String" }, { key: "b", label: "B", type: "String" }] },
      }),
    );
    await expect(
      withTenant(tenantId, (tx) => submitFormInstance(tx, actor, { definitionId: v1.id, values: { a: "x" } })),
    ).rejects.toThrow(/E_TEMPLATE_STALE_VERSION/);
  });

  it("renders a document with only allowlisted placeholders substituted", async () => {
    const { id } = await withTenant(tenantId, (tx) =>
      createTemplateVersion(tx, actor, {
        contributionId: "verity.test.tmpl.doc",
        kind: "Document",
        name: "Letter",
        schema: { body: "Dear {{name}}, your total is {{total}}. {{untouched}}", placeholders: ["name", "total"] },
      }),
    );
    const { rendered } = await withTenant(tenantId, (tx) => renderDocumentInstance(tx, actor, { definitionId: id, values: { name: "Alex", total: "$5" } }));
    expect(rendered).toBe("Dear Alex, your total is $5. {{untouched}}");

    await expect(
      withTenant(tenantId, (tx) => renderDocumentInstance(tx, actor, { definitionId: id, values: { name: "Alex", hacked: "x" } })),
    ).rejects.toThrow(/E_TEMPLATE_UNKNOWN_PLACEHOLDER/);
  });

  it("walks a checklist to Completed and rejects an unknown step key", async () => {
    const { id } = await withTenant(tenantId, (tx) =>
      createTemplateVersion(tx, actor, {
        contributionId: "verity.test.tmpl.checklist",
        kind: "Checklist",
        name: "Inspection",
        schema: { steps: [{ key: "s1", label: "Step 1" }, { key: "s2", label: "Step 2" }] },
      }),
    );
    const { instanceId } = await withTenant(tenantId, (tx) => startChecklistInstance(tx, actor, { definitionId: id }));

    await expect(
      withTenant(tenantId, (tx) => completeChecklistStep(tx, actor, { instanceId, stepKey: "bogus" })),
    ).rejects.toThrow(TemplateError);

    const afterFirst = await withTenant(tenantId, (tx) => completeChecklistStep(tx, actor, { instanceId, stepKey: "s1", evidenceNote: "ok" }));
    expect(afterFirst.status).toBe("InProgress");
    const afterSecond = await withTenant(tenantId, (tx) => completeChecklistStep(tx, actor, { instanceId, stepKey: "s2" }));
    expect(afterSecond.status).toBe("Completed");
  });
});
