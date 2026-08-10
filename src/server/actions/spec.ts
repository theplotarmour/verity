"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { getResolvedFields, getReferenceOptions } from "@/server/queries/spec";
import type { RefOption } from "@/lib/spec/types";

// Thin "use server" wrappers so client components (the wizard, the sheet) can
// call the spec queries directly. The queries themselves stay plain modules so
// server components can import them without going through an action.

/**
 * Spec metadata for the item forms.
 *
 * These are `"use server"` exports, so each is a public POST endpoint taking an
 * id. Without the checks below, an id belonging to another workspace returned
 * that workspace's field definitions, option lists and previously entered
 * values to any caller. Product configuration rather than operational data, but
 * still one tenant's setup readable by anyone holding an id.
 *
 * Every entry point now resolves the session and confirms the record belongs to
 * the caller's factory before reading anything.
 */
async function requireFactory(): Promise<string> {
  const session = await getUserSession();
  if (!session) throw new Error("Not authenticated.");
  return session.factoryId;
}

async function assertGroupInFactory(groupId: string, factoryId: string) {
  const group = await prisma.itemGroup.findFirst({
    where: { id: groupId, factoryId },
    select: { id: true },
  });
  if (!group) throw new Error("Not found.");
}

async function assertFieldInFactory(fieldId: string, factoryId: string) {
  const field = await prisma.specField.findFirst({
    where: { id: fieldId, factoryId },
    select: { id: true },
  });
  if (!field) throw new Error("Not found.");
}

export async function fetchResolvedFields(groupId: string) {
  await assertGroupInFactory(groupId, await requireFactory());
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
  await assertFieldInFactory(fieldId, await requireFactory());
  return getReferenceOptions(fieldId, parentValueId, filters, query);
}

/** Past values for a field, for the suggestion list on free-text inputs. */
export async function fetchFieldValueSuggestions(fieldId: string) {
  await assertFieldInFactory(fieldId, await requireFactory());
  const { getFieldValueSuggestions } = await import("@/server/queries/spec");
  return getFieldValueSuggestions(fieldId);
}
