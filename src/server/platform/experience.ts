import type { CustomFieldType } from "@prisma/client";
import { resolvePermissions } from "./authorization";
import type { ActorContext } from "./command";
import type { TenantScopedClient } from "./tenancy";

/**
 * Experience runtime.
 *
 * Authority: implementation/08-experience/metadata-driven-ui.md, Spec
 * PLA-EXT-002 (CustomFieldSchema), PLA-CAP-002 (inactive capabilities are
 * hidden), INV-002 (terminal states are read-only), PRN-002 (progressive
 * disclosure).
 *
 * This is the reusable runtime that lets a future capability expose entities,
 * actions, forms and tables — not a product UI. It produces *descriptors*; the
 * React primitives render them. Keeping the decisions here rather than in
 * components means a capability that adds an entity or a tenant that adds a
 * custom field changes what the interface shows without any component being
 * edited, which is foundation-ready condition F.
 */

export type FieldControl = "text" | "number" | "checkbox" | "select" | "date" | "readonly";

export type FieldDescriptor = {
  name: string;
  control: FieldControl;
  required: boolean;
  options?: string[];
  /** True when the field cannot be edited in the current state (INV-002). */
  readOnly: boolean;
  /** Custom fields are secondary metadata; PRN-002 puts them behind disclosure. */
  secondary: boolean;
};

export type FormDescriptor = {
  entityKey: string;
  /** Whole-form lock when the record sits in a terminal state (INV-002). */
  readOnly: boolean;
  fields: FieldDescriptor[];
};

/**
 * Maps a declared custom field type to a control.
 *
 * An unrecognised type degrades to a read-only control rather than throwing.
 * metadata-driven-ui.md is explicit that a generator must fail safely: a form
 * that refuses to render because one field is unfamiliar takes away the user's
 * ability to edit everything else too.
 */
export function controlForFieldType(type: CustomFieldType | string): FieldControl {
  switch (type) {
    case "String":
      return "text";
    case "Number":
      return "number";
    case "Boolean":
      return "checkbox";
    case "Select":
      return "select";
    case "Date":
      return "date";
    default:
      return "readonly";
  }
}

/**
 * Builds the form for an entity from platform metadata plus the tenant's own
 * custom fields, with no hardcoded knowledge of either.
 *
 * `stateKey`, when supplied, decides whether the form is editable at all: a
 * record in a terminal state is permanently locked (INV-002), and a UI that
 * still offers inputs for it is inviting a write the platform will reject.
 */
export async function buildFormDescriptor(
  tx: TenantScopedClient,
  entityKey: string,
  options: { stateKey?: string; nativeFields?: Array<{ name: string; control: FieldControl; required?: boolean }> } = {},
): Promise<FormDescriptor> {
  let readOnly = false;
  if (options.stateKey) {
    const state = await tx.stateDefinition.findUnique({
      where: { entityKey_key: { entityKey, key: options.stateKey } },
    });
    readOnly = state?.isTerminal ?? false;
  }

  const custom = await tx.customFieldSchema.findMany({
    where: { entityKey },
    orderBy: { fieldName: "asc" },
  });

  const fields: FieldDescriptor[] = [
    ...(options.nativeFields ?? []).map((f) => ({
      name: f.name,
      control: f.control,
      required: f.required ?? false,
      readOnly,
      secondary: false,
    })),
    ...custom.map((c) => ({
      name: c.fieldName,
      control: controlForFieldType(c.fieldType),
      required: c.required,
      options: c.selectOptions.length > 0 ? c.selectOptions : undefined,
      readOnly,
      secondary: true,
    })),
  ];

  return { entityKey, readOnly, fields };
}

export type NavigationEntry = {
  capabilityId: string;
  capabilityName: string;
  entityKey: string;
  /** Verbs this actor holds on the entity; drives which actions render. */
  verbs: string[];
};

/**
 * Builds navigation for an actor.
 *
 * Two filters, both necessary. A capability the tenant has not activated is
 * absent entirely (PLA-CAP-002), and within an active capability only entities
 * the actor can actually Read appear — showing a menu item that leads to
 * E_FORBIDDEN is worse than not showing it. Neither filter substitutes for the
 * server-side checks; this only decides what to draw.
 */
export async function buildNavigation(
  tx: TenantScopedClient,
  actor: ActorContext,
): Promise<NavigationEntry[]> {
  const activations = await tx.tenantActivation.findMany({
    where: { status: "Active" },
    include: { capability: true },
  });
  if (activations.length === 0) return [];

  const permissions = actor.roleId ? await resolvePermissions(tx, actor.roleId) : [];
  const byEntity = new Map<string, Set<string>>();
  for (const p of permissions) {
    if (!byEntity.has(p.entity)) byEntity.set(p.entity, new Set());
    byEntity.get(p.entity)!.add(p.verb);
  }

  const entries: NavigationEntry[] = [];
  for (const activation of activations) {
    for (const entityKey of activation.capability.entityTypes) {
      const verbs = byEntity.get(entityKey);
      if (!verbs?.has("Read")) continue;
      entries.push({
        capabilityId: activation.capabilityId,
        capabilityName: activation.capability.name,
        entityKey,
        verbs: [...verbs].sort(),
      });
    }
  }
  return entries.sort((a, b) => a.entityKey.localeCompare(b.entityKey));
}

export type ColumnDescriptor = {
  name: string;
  control: FieldControl;
  /** Rendering hint so a table formats dates and numbers consistently. */
  format: "text" | "number" | "date" | "boolean" | "badge";
};

/** Builds table columns from the same metadata the form uses. */
export async function buildTableDescriptor(
  tx: TenantScopedClient,
  entityKey: string,
  nativeColumns: Array<{ name: string; control: FieldControl }> = [],
): Promise<ColumnDescriptor[]> {
  const custom = await tx.customFieldSchema.findMany({
    where: { entityKey },
    orderBy: { fieldName: "asc" },
  });

  const toFormat = (control: FieldControl): ColumnDescriptor["format"] => {
    if (control === "number") return "number";
    if (control === "date") return "date";
    if (control === "checkbox") return "boolean";
    if (control === "select") return "badge";
    return "text";
  };

  return [
    ...nativeColumns.map((c) => ({ name: c.name, control: c.control, format: toFormat(c.control) })),
    ...custom.map((c) => {
      const control = controlForFieldType(c.fieldType);
      return { name: c.fieldName, control, format: toFormat(control) };
    }),
  ];
}
