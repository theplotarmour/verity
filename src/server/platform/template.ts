import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ActorContext } from "./command";
import type { TenantScopedClient } from "./tenancy";
import { enforcePolicy } from "./policy";

/**
 * Versioned document/checklist/form templates (Authority: Task 108 WP-11B,
 * VCA-009, §"Dynamic forms and configuration" + §"Document and checklist
 * templates").
 *
 * A `PackContribution` of kind `form`/`document`/`checklist` (`pack.ts`,
 * WP-10) records OWNERSHIP of a stable contribution ID — never the template
 * body itself. This module is where the body lives: a versioned schema, and
 * typed instances bound to the exact version they were created against.
 */

const TEMPLATE_ENTITY = "verity.platform.template";

export class TemplateError extends Error {
  constructor(
    readonly code:
      | "E_TEMPLATE_UNKNOWN"
      | "E_TEMPLATE_SCHEMA_INVALID"
      | "E_TEMPLATE_SUBMISSION_INVALID"
      | "E_TEMPLATE_STALE_VERSION"
      | "E_TEMPLATE_UNKNOWN_PLACEHOLDER"
      | "E_TEMPLATE_UNKNOWN_STEP",
    message: string,
  ) {
    super(message);
    this.name = "TemplateError";
  }
}

async function requirePolicy(tx: TenantScopedClient, actor: ActorContext, verb: "Read" | "Create" | "Edit"): Promise<void> {
  await enforcePolicy(tx, actor, { verb, entity: TEMPLATE_ENTITY, channel: "human" });
}

/** Matches Prisma `CustomFieldType` (Spec MET custom-field vocabulary) — a form field and a custom field never diverge. */
export const formFieldSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  type: z.enum(["String", "Number", "Boolean", "Select", "Date"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
});
export const formTemplateSchema = z.object({ fields: z.array(formFieldSchema).min(1) });

/** No expression language (WP-11B §"no arbitrary expression or server execution") — `body` may only reference declared `placeholders`. */
export const documentTemplateSchema = z.object({
  body: z.string().min(1).max(50_000),
  placeholders: z.array(z.string().min(1).max(64)),
});

export const checklistTemplateSchema = z.object({
  steps: z.array(z.object({ key: z.string().min(1).max(64), label: z.string().min(1).max(200) })).min(1),
});

/**
 * Creates a new version of a template. Never updates an existing row — see
 * the migration's own `template_definition` RLS (insert/select only, no
 * update policy), so "never edited in place" is enforced by the database,
 * not merely by this function's discipline.
 */
export async function createTemplateVersion(
  tx: TenantScopedClient,
  actor: ActorContext,
  args: {
    contributionId: string;
    kind: "Form" | "Document" | "Checklist";
    name: string;
    schema: unknown;
    ownerCapability?: string;
  },
): Promise<{ id: string; version: number }> {
  await requirePolicy(tx, actor, "Create");

  const validator = args.kind === "Form" ? formTemplateSchema : args.kind === "Document" ? documentTemplateSchema : checklistTemplateSchema;
  const parsed = validator.safeParse(args.schema);
  if (!parsed.success) {
    throw new TemplateError("E_TEMPLATE_SCHEMA_INVALID", `E_TEMPLATE_SCHEMA_INVALID: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }

  const latest = await tx.templateDefinition.findFirst({
    where: { tenantId: actor.tenantId, contributionId: args.contributionId },
    orderBy: { version: "desc" },
  });
  const version = (latest?.version ?? 0) + 1;

  const definition = await tx.templateDefinition.create({
    data: {
      tenantId: actor.tenantId,
      contributionId: args.contributionId,
      kind: args.kind,
      version,
      name: args.name,
      schema: parsed.data as never,
      ownerCapability: args.ownerCapability ?? null,
    },
  });
  return { id: definition.id, version: definition.version };
}

/**
 * Validates a Form submission against its exact pinned schema version and
 * records it. Unknown fields, missing required fields, and a submission
 * against a non-latest version all fail closed (WP-11B §"Reject unknown
 * fields/types and incompatible schema versions fail closed").
 */
export async function submitFormInstance(
  tx: TenantScopedClient,
  actor: ActorContext,
  args: { definitionId: string; entityKey?: string; entityId?: string; values: Record<string, unknown> },
): Promise<{ instanceId: string }> {
  await requirePolicy(tx, actor, "Create");

  const definition = await tx.templateDefinition.findUnique({ where: { id: args.definitionId } });
  if (!definition || definition.tenantId !== actor.tenantId || definition.kind !== "Form") {
    throw new TemplateError("E_TEMPLATE_UNKNOWN", `E_TEMPLATE_UNKNOWN: ${args.definitionId}`);
  }
  const latest = await tx.templateDefinition.findFirst({
    where: { tenantId: actor.tenantId, contributionId: definition.contributionId },
    orderBy: { version: "desc" },
  });
  if (latest && latest.id !== definition.id) {
    throw new TemplateError(
      "E_TEMPLATE_STALE_VERSION",
      `E_TEMPLATE_STALE_VERSION: version ${definition.version} is superseded by ${latest.version} — refetch the template before submitting`,
    );
  }

  const schema = formTemplateSchema.parse(definition.schema);
  const knownKeys = new Set(schema.fields.map((f) => f.key));
  const unknown = Object.keys(args.values).filter((k) => !knownKeys.has(k));
  if (unknown.length > 0) {
    throw new TemplateError("E_TEMPLATE_SUBMISSION_INVALID", `E_TEMPLATE_SUBMISSION_INVALID: unknown field(s) ${unknown.join(", ")}`);
  }
  const missing = schema.fields.filter((f) => f.required && (args.values[f.key] === undefined || args.values[f.key] === null || args.values[f.key] === ""));
  if (missing.length > 0) {
    throw new TemplateError(
      "E_TEMPLATE_SUBMISSION_INVALID",
      `E_TEMPLATE_SUBMISSION_INVALID: missing required field(s) ${missing.map((f) => f.key).join(", ")}`,
    );
  }

  const instance = await tx.templateInstance.create({
    data: {
      tenantId: actor.tenantId,
      definitionId: definition.id,
      entityKey: args.entityKey ?? null,
      entityId: args.entityId ?? null,
      status: "Submitted",
      data: args.values as never,
      submittedByPartyId: null,
    },
  });
  return { instanceId: instance.id };
}

/**
 * Renders a Document instance: literal substitution of declared placeholders
 * only, never an expression evaluator (WP-11B §"Safe placeholder allowlist
 * and typed input binding; no arbitrary expression or server execution").
 * `{{key}}` not present in the template's own `placeholders` allowlist is
 * left untouched rather than substituted, so a caller cannot smuggle
 * additional template syntax through the bound values.
 */
export async function renderDocumentInstance(
  tx: TenantScopedClient,
  actor: ActorContext,
  args: { definitionId: string; values: Record<string, string> },
): Promise<{ instanceId: string; rendered: string }> {
  await requirePolicy(tx, actor, "Read");

  const definition = await tx.templateDefinition.findUnique({ where: { id: args.definitionId } });
  if (!definition || definition.tenantId !== actor.tenantId || definition.kind !== "Document") {
    throw new TemplateError("E_TEMPLATE_UNKNOWN", `E_TEMPLATE_UNKNOWN: ${args.definitionId}`);
  }
  const schema = documentTemplateSchema.parse(definition.schema);
  const allowlist = new Set(schema.placeholders);
  const unknown = Object.keys(args.values).filter((k) => !allowlist.has(k));
  if (unknown.length > 0) {
    throw new TemplateError("E_TEMPLATE_UNKNOWN_PLACEHOLDER", `E_TEMPLATE_UNKNOWN_PLACEHOLDER: ${unknown.join(", ")}`);
  }

  const rendered = schema.body.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    allowlist.has(key) && key in args.values ? args.values[key]! : match,
  );

  const instance = await tx.templateInstance.create({
    data: {
      tenantId: actor.tenantId,
      definitionId: definition.id,
      status: "Submitted",
      data: args.values as never,
    },
  });
  return { instanceId: instance.id, rendered };
}

/**
 * Starts a Checklist instance from its template, all steps incomplete.
 */
export async function startChecklistInstance(
  tx: TenantScopedClient,
  actor: ActorContext,
  args: { definitionId: string; entityKey?: string; entityId?: string },
): Promise<{ instanceId: string }> {
  await requirePolicy(tx, actor, "Create");
  const definition = await tx.templateDefinition.findUnique({ where: { id: args.definitionId } });
  if (!definition || definition.tenantId !== actor.tenantId || definition.kind !== "Checklist") {
    throw new TemplateError("E_TEMPLATE_UNKNOWN", `E_TEMPLATE_UNKNOWN: ${args.definitionId}`);
  }
  const instance = await tx.templateInstance.create({
    data: {
      tenantId: actor.tenantId,
      definitionId: definition.id,
      entityKey: args.entityKey ?? null,
      entityId: args.entityId ?? null,
      status: "InProgress",
      data: { steps: {} } as never,
    },
  });
  return { instanceId: instance.id };
}

/**
 * Completes one checklist step with an evidence note (WP-11B
 * §"Checklist steps with assignment, evidence, completion rules, audit
 * history"). Audit history is the `audit_command_mutation` trigger already
 * on `template_instance` — every write here lands in the same activity
 * stream as any other command.
 */
export async function completeChecklistStep(
  tx: TenantScopedClient,
  actor: ActorContext,
  args: { instanceId: string; stepKey: string; evidenceNote?: string },
): Promise<{ status: string }> {
  await requirePolicy(tx, actor, "Edit");

  const instance = await tx.templateInstance.findUnique({ where: { id: args.instanceId }, include: { definition: true } });
  if (!instance || instance.tenantId !== actor.tenantId || instance.definition.kind !== "Checklist") {
    throw new TemplateError("E_TEMPLATE_UNKNOWN", `E_TEMPLATE_UNKNOWN: ${args.instanceId}`);
  }
  const schema = checklistTemplateSchema.parse(instance.definition.schema);
  if (!schema.steps.some((s) => s.key === args.stepKey)) {
    throw new TemplateError("E_TEMPLATE_UNKNOWN_STEP", `E_TEMPLATE_UNKNOWN_STEP: ${args.stepKey}`);
  }

  const data = (instance.data as { steps?: Record<string, unknown> }) ?? {};
  const steps = { ...(data.steps ?? {}) };
  steps[args.stepKey] = {
    completed: true,
    completedByPartyId: null,
    completedAt: new Date().toISOString(),
    evidenceNote: args.evidenceNote ?? null,
    correlationId: randomUUID(),
  };
  const allComplete = schema.steps.every((s) => (steps[s.key] as { completed?: boolean } | undefined)?.completed);
  const status = allComplete ? "Completed" : "InProgress";

  await tx.templateInstance.update({
    where: { id: instance.id },
    data: { data: { steps } as never, status },
  });
  return { status };
}
