import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import {
  CustomFieldValidationError,
  requireEntityDefinition,
  validateCustomFields,
} from "@/server/platform/entity";

/**
 * Entity runtime gate test.
 * Authority: MET-ENT-001→005, PLA-EXT-001→003.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "entity-runtime.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY_KEY = "verity.test.sample_entity";

describeDb("entity runtime", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  beforeAll(async () => {
    await assertRlsEnforceable();
    // Entity definitions are written by migrations (capability installation),
    // so the fixture uses the migration role — the app role cannot write them,
    // which is itself asserted below.
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.entityDefinition.create({
        data: {
          key: ENTITY_KEY,
          capability: "test",
          class: "Persistent",
          tableName: "sample_entity",
          tenantScoped: true,
        },
      });
    } finally {
      await admin.$disconnect();
    }

    for (const id of [tenantA, tenantB]) {
      await withTenant(id, (tx) => tx.tenant.create({ data: { id, name: `T-${id.slice(0, 4)}` } }));
    }

    await withTenant(tenantA, (tx) =>
      tx.customFieldSchema.createMany({
        data: [
          { tenantId: tenantA, entityKey: ENTITY_KEY, fieldName: "rig_id", fieldType: "String", required: true },
          { tenantId: tenantA, entityKey: ENTITY_KEY, fieldName: "altitude_m", fieldType: "Number" },
          { tenantId: tenantA, entityKey: ENTITY_KEY, fieldName: "hazard", fieldType: "Select", selectOptions: ["low", "high"] },
        ],
      }),
    );
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY_KEY}`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("resolves a registered entity definition (MET-ENT-004)", async () => {
    const def = await withTenant(tenantA, (tx) => requireEntityDefinition(tx, ENTITY_KEY));
    expect(def.capability).toBe("test");
    expect(def.class).toBe("Persistent");
    expect(def.tenantScoped).toBe(true);
  });

  it("rejects an unregistered entity key", async () => {
    await expect(
      withTenant(tenantA, (tx) => requireEntityDefinition(tx, "verity.test.nope")),
    ).rejects.toThrow(/not registered/);
  });

  it("exposes the registry to every tenant (it is global platform metadata)", async () => {
    const def = await withTenant(tenantB, (tx) => requireEntityDefinition(tx, ENTITY_KEY));
    expect(def.key).toBe(ENTITY_KEY);
  });

  it("hides the registry from an unscoped connection", async () => {
    expect(await prisma.entityDefinition.findMany()).toHaveLength(0);
  });

  it("forbids the application role from mutating the registry", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.entityDefinition.create({
          data: { key: "verity.test.rogue", capability: "x", class: "Persistent" },
        }),
      ),
    ).rejects.toThrow();
  });

  it("accepts custom fields that match the tenant's schema (PLA-EXT-003)", async () => {
    const value = await withTenant(tenantA, (tx) =>
      validateCustomFields(tx, ENTITY_KEY, { rig_id: "R-1", altitude_m: 120, hazard: "high" }),
    );
    expect(value).toEqual({ rig_id: "R-1", altitude_m: 120, hazard: "high" });
  });

  it("accepts omission of an optional field", async () => {
    const value = await withTenant(tenantA, (tx) =>
      validateCustomFields(tx, ENTITY_KEY, { rig_id: "R-2" }),
    );
    expect(value).toEqual({ rig_id: "R-2" });
  });

  it("rejects a missing required field", async () => {
    await expect(
      withTenant(tenantA, (tx) => validateCustomFields(tx, ENTITY_KEY, { altitude_m: 1 })),
    ).rejects.toBeInstanceOf(CustomFieldValidationError);
  });

  it("rejects a wrong field type", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        validateCustomFields(tx, ENTITY_KEY, { rig_id: "R-3", altitude_m: "high up" }),
      ),
    ).rejects.toBeInstanceOf(CustomFieldValidationError);
  });

  it("rejects a value outside a Select's options", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        validateCustomFields(tx, ENTITY_KEY, { rig_id: "R-4", hazard: "catastrophic" }),
      ),
    ).rejects.toBeInstanceOf(CustomFieldValidationError);
  });

  it("rejects an undeclared field rather than silently storing it", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        validateCustomFields(tx, ENTITY_KEY, { rig_id: "R-5", smuggled: true }),
      ),
    ).rejects.toBeInstanceOf(CustomFieldValidationError);
  });

  it("applies each tenant's own schema, not another's", async () => {
    // Tenant B declared nothing, so the same payload that is valid for A is not for B.
    await expect(
      withTenant(tenantB, (tx) => validateCustomFields(tx, ENTITY_KEY, { rig_id: "R-6" })),
    ).rejects.toBeInstanceOf(CustomFieldValidationError);

    const empty = await withTenant(tenantB, (tx) => validateCustomFields(tx, ENTITY_KEY, {}));
    expect(empty).toEqual({});
  });

  it("hides one tenant's custom field declarations from another", async () => {
    const seen = await withTenant(tenantB, (tx) => tx.customFieldSchema.findMany());
    expect(seen).toHaveLength(0);
  });
});
