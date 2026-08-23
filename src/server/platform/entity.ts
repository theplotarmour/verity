import { z } from "zod";
import type { CustomFieldSchema } from "@prisma/client";
import type { TenantScopedClient } from "./tenancy";

/**
 * Entity runtime.
 *
 * Authority: Spec MET-ENT-001→005 (entity classes and registration), MET-FIE-*,
 * PLA-EXT-001 (the `custom_fields` column), PLA-EXT-002 (custom field metadata),
 * PLA-EXT-003 (runtime dynamic schema validation),
 * implementation/04-domain-runtime/entity.md (base entity pattern).
 *
 * Capabilities ship their own tables and register them in `entity_definition`;
 * the platform never generates tables at runtime. Tenant-specific shape is
 * additive and lives in `custom_fields` (JSONB) governed by `custom_field_schema`,
 * so a tenant can extend an entity without a migration and without the platform
 * ontology changing.
 */

/**
 * The system fields every persistent entity carries
 * (implementation/04-domain-runtime/entity.md).
 *
 * `version` is the optimistic-concurrency token (Bible V3); a mismatched write
 * must fail with E_CONFLICT rather than silently overwrite.
 */
export const BASE_ENTITY_FIELDS = [
  "id",
  "tenantId",
  "createdAt",
  "updatedAt",
  "version",
  "customFields",
] as const;

/** Raised when a write loses an optimistic-concurrency race (Bible V3). */
export class ConflictError extends Error {
  readonly code = "E_CONFLICT" as const;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** Raised when `custom_fields` violates the tenant's declared schema. */
export class CustomFieldValidationError extends Error {
  readonly code = "E_VALIDATION" as const;
  constructor(
    message: string,
    readonly issues: string[],
  ) {
    super(message);
    this.name = "CustomFieldValidationError";
  }
}

/**
 * Compiles a tenant's declared custom fields for one entity into a validator.
 *
 * PLA-EXT-003 requires the schema to be read per tenant and per entity at write
 * time, so a tenant's declarations take effect immediately without a deploy.
 * Unknown keys are rejected: silently accepting them would let arbitrary data
 * accumulate in `custom_fields` outside any declaration, which defeats the point
 * of declaring them.
 */
export function compileCustomFieldValidator(schemas: CustomFieldSchema[]): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const s of schemas) {
    let field: z.ZodTypeAny;
    switch (s.fieldType) {
      case "String":
        field = z.string();
        break;
      case "Number":
        field = z.number();
        break;
      case "Boolean":
        field = z.boolean();
        break;
      case "Date":
        // Accepts an ISO string or a Date; JSONB round-trips dates as strings.
        field = z.union([z.string().datetime(), z.date()]);
        break;
      case "Select":
        field =
          s.selectOptions.length > 0
            ? z.enum(s.selectOptions as [string, ...string[]])
            : z.never();
        break;
    }
    shape[s.fieldName] = s.required ? field : field.optional();
  }

  return z.strictObject(shape);
}

/**
 * Validates a `custom_fields` payload against the tenant's declarations.
 *
 * Call before any create or update that carries custom fields; PLA-EXT-003
 * requires the write to abort when validation fails.
 */
export async function validateCustomFields(
  tx: TenantScopedClient,
  entityKey: string,
  value: unknown,
): Promise<Record<string, unknown>> {
  const schemas = await tx.customFieldSchema.findMany({ where: { entityKey } });
  const result = compileCustomFieldValidator(schemas).safeParse(value ?? {});

  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
    );
    throw new CustomFieldValidationError(
      `E_VALIDATION: custom_fields rejected for ${entityKey}`,
      issues,
    );
  }
  return result.data as Record<string, unknown>;
}

/** Looks up a registered entity definition, or null when unregistered. */
export async function getEntityDefinition(tx: TenantScopedClient, key: string) {
  return tx.entityDefinition.findUnique({ where: { key } });
}

/**
 * Asserts an entity key is registered (MET-ENT-004).
 *
 * Commands resolve their target through this, so an unregistered entity cannot
 * be operated on by a typo'd key.
 */
export async function requireEntityDefinition(tx: TenantScopedClient, key: string) {
  const def = await getEntityDefinition(tx, key);
  if (!def) throw new Error(`Entity not registered: ${key}`);
  return def;
}
