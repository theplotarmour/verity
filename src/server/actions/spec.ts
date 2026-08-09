"use server";

import { getResolvedFields, getReferenceOptions } from "@/server/queries/spec";
import type { RefOption } from "@/lib/spec/types";

// Thin "use server" wrappers so client components (the wizard, the sheet) can
// call the spec queries directly. The queries themselves stay plain modules so
// server components can import them without going through an action.

export async function fetchResolvedFields(groupId: string) {
  const fields = await getResolvedFields(groupId);
  // Narrow to what the client actually renders — Prisma rows carry Date objects
  // and factory ids the browser has no use for.
  return fields.map((f) => ({
    id: f.id,
    key: f.key,
    name: f.name,
    kind: f.kind,
    valueType: f.valueType,
    unitSuffix: f.unitSuffix,
    refTarget: f.refTarget,
    targetGroupId: f.targetGroupId,
    targetFieldId: f.targetFieldId,
    isRequired: f.isRequired,
    dependsOnFieldId: f.dependsOnFieldId,
    options: f.options.map((o) => ({
      id: o.id,
      label: o.label,
      shortCode: o.shortCode,
    })),
  }));
}

export async function fetchReferenceOptions(
  fieldId: string,
  parentValueId?: string,
  /** Sibling answers, as target field id -> chosen key. See getColumnOptions. */
  filters?: Record<string, string>,
  /** What the owner has typed, so the list is narrowed in SQL not in the browser. */
  query?: string
): Promise<RefOption[]> {
  return getReferenceOptions(fieldId, parentValueId, filters, query);
}

/** Past values for a field, for the suggestion list on free-text inputs. */
export async function fetchFieldValueSuggestions(fieldId: string) {
  const { getFieldValueSuggestions } = await import("@/server/queries/spec");
  return getFieldValueSuggestions(fieldId);
}
