import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import type { ActorContext } from "@/server/platform/command";
import {
  buildFormDescriptor,
  buildNavigation,
  buildTableDescriptor,
  controlForFieldType,
} from "@/server/platform/experience";

/**
 * Experience runtime gate test.
 * Authority: metadata-driven-ui.md, PLA-EXT-002, PLA-CAP-002, INV-002, PRN-002.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "experience-runtime.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY = "verity.test.inspection";
const HIDDEN_ENTITY = "verity.test.hidden";
const CAPABILITY = "verity.capability.experience_test";
const INACTIVE_CAPABILITY = "verity.capability.experience_inactive";

describeDb("experience runtime", () => {
  const tenantA = randomUUID();
  let actor: ActorContext;
  let roleId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.createMany({
        data: [
          { id: CAPABILITY, name: "Inspections", version: "1.0.0", entityTypes: [ENTITY] },
          { id: INACTIVE_CAPABILITY, name: "Never Activated", version: "1.0.0", entityTypes: [HIDDEN_ENTITY] },
        ],
      });
      await admin.entityDefinition.createMany({
        data: [
          { key: ENTITY, capability: CAPABILITY, class: "Persistent", tableName: "inspection" },
          { key: HIDDEN_ENTITY, capability: INACTIVE_CAPABILITY, class: "Persistent", tableName: "hidden" },
        ],
      });
      const open = await admin.stateDefinition.create({
        data: { entityKey: ENTITY, key: "open", category: "Active", isInitial: true },
      });
      await admin.stateDefinition.create({
        data: { entityKey: ENTITY, key: "closed", category: "Completed", isTerminal: true },
      });
      void open;
    } finally {
      await admin.$disconnect();
    }

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Experience Tenant" } });
      await activateCapability(tx, tenantA, CAPABILITY);
      roleId = (await tx.role.create({ data: { tenantId: tenantA, name: "Inspector" } })).id;
      await tx.permission.createMany({
        data: [
          { tenantId: tenantA, roleId, verb: "Read", entity: ENTITY, scope: "Organization" },
          { tenantId: tenantA, roleId, verb: "Edit", entity: ENTITY, scope: "Organization" },
          // Deliberately also granted on the hidden entity: the capability being
          // inactive must be enough to keep it out of navigation.
          { tenantId: tenantA, roleId, verb: "Read", entity: HIDDEN_ENTITY, scope: "Tenant" },
        ],
      });
      await tx.customFieldSchema.createMany({
        data: [
          { tenantId: tenantA, entityKey: ENTITY, fieldName: "rig_id", fieldType: "String", required: true },
          { tenantId: tenantA, entityKey: ENTITY, fieldName: "altitude_m", fieldType: "Number" },
          { tenantId: tenantA, entityKey: ENTITY, fieldName: "hazard", fieldType: "Select", selectOptions: ["low", "high"] },
          { tenantId: tenantA, entityKey: ENTITY, fieldName: "inspected_on", fieldType: "Date" },
          { tenantId: tenantA, entityKey: ENTITY, fieldName: "signed_off", fieldType: "Boolean" },
        ],
      });
    });

    actor = {
      tenantId: tenantA,
      userId: randomUUID(),
      membershipId: randomUUID(),
      organizationId: randomUUID(),
      roleId,
    };
    invalidateCapabilityCache();
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantA}::uuid`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key IN (${ENTITY}, ${HIDDEN_ENTITY})`;
      await admin.$executeRaw`DELETE FROM capability_definition WHERE id IN (${CAPABILITY}, ${INACTIVE_CAPABILITY})`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("maps each declared field type to a control", () => {
    expect(controlForFieldType("String")).toBe("text");
    expect(controlForFieldType("Number")).toBe("number");
    expect(controlForFieldType("Boolean")).toBe("checkbox");
    expect(controlForFieldType("Select")).toBe("select");
    expect(controlForFieldType("Date")).toBe("date");
  });

  it("degrades an unknown field type to read-only instead of throwing", () => {
    expect(controlForFieldType("Quaternion" as never)).toBe("readonly");
  });

  it("builds a form from tenant custom fields with no hardcoded knowledge", async () => {
    const form = await withTenant(tenantA, (tx) => buildFormDescriptor(tx, ENTITY));
    expect(form.fields.map((f) => f.name)).toEqual([
      "altitude_m",
      "hazard",
      "inspected_on",
      "rig_id",
      "signed_off",
    ]);
    expect(form.fields.find((f) => f.name === "hazard")?.options).toEqual(["low", "high"]);
    expect(form.fields.find((f) => f.name === "rig_id")?.required).toBe(true);
  });

  it("includes native fields ahead of custom ones and marks custom as secondary (PRN-002)", async () => {
    const form = await withTenant(tenantA, (tx) =>
      buildFormDescriptor(tx, ENTITY, {
        nativeFields: [{ name: "title", control: "text", required: true }],
      }),
    );
    expect(form.fields[0]?.name).toBe("title");
    expect(form.fields[0]?.secondary).toBe(false);
    expect(form.fields.filter((f) => f.secondary).length).toBe(5);
  });

  it("leaves the form editable in a non-terminal state", async () => {
    const form = await withTenant(tenantA, (tx) =>
      buildFormDescriptor(tx, ENTITY, { stateKey: "open" }),
    );
    expect(form.readOnly).toBe(false);
    expect(form.fields.every((f) => !f.readOnly)).toBe(true);
  });

  it("locks the whole form in a terminal state (INV-002)", async () => {
    const form = await withTenant(tenantA, (tx) =>
      buildFormDescriptor(tx, ENTITY, { stateKey: "closed" }),
    );
    expect(form.readOnly).toBe(true);
    expect(form.fields.every((f) => f.readOnly)).toBe(true);
  });

  it("lists an entity the actor may read in an active capability", async () => {
    const nav = await withTenant(tenantA, (tx) => buildNavigation(tx, actor));
    const entry = nav.find((n) => n.entityKey === ENTITY);
    expect(entry).toBeDefined();
    expect(entry?.capabilityName).toBe("Inspections");
    expect(entry?.verbs).toEqual(["Edit", "Read"]);
  });

  it("omits an entity whose capability is not activated (PLA-CAP-002)", async () => {
    const nav = await withTenant(tenantA, (tx) => buildNavigation(tx, actor));
    expect(nav.some((n) => n.entityKey === HIDDEN_ENTITY)).toBe(false);
  });

  it("shows nothing to an actor with no role", async () => {
    const nav = await withTenant(tenantA, (tx) =>
      buildNavigation(tx, { ...actor, roleId: null }),
    );
    expect(nav).toHaveLength(0);
  });

  it("builds table columns with a formatter per declared type", async () => {
    const columns = await withTenant(tenantA, (tx) =>
      buildTableDescriptor(tx, ENTITY, [{ name: "title", control: "text" }]),
    );
    const byName = Object.fromEntries(columns.map((c) => [c.name, c.format]));
    expect(byName).toMatchObject({
      title: "text",
      altitude_m: "number",
      inspected_on: "date",
      signed_off: "boolean",
      hazard: "badge",
    });
  });
});
