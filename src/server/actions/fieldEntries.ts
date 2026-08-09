"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import type { RefOption } from "@/lib/spec/types";
import { resolveAnswers, type RawAnswer } from "@/lib/spec/resolve";
import { renderTemplate } from "@/lib/spec/template";

/**
 * Create the thing the owner just typed into a dropdown, and hand back the
 * option so it can be selected without leaving the form.
 *
 * What gets created depends on the field: an OPTION field gains a new option,
 * a reference to items mints a draft item, and a reference to a master record
 * (design, colour, supplier…) creates that record. All three are "stored as a
 * new entry for that field" from where the owner is standing.
 */
export async function createFieldEntry(
  fieldId: string,
  text: string,
  parentValueId?: string,
  filters: Record<string, string> = {}
): Promise<{ option: RefOption } | { error: string }> {
  const user = await getOwnerUser();
  const label = text.trim();
  if (!label) return { error: "Type a name first" };

  const field = await prisma.specField.findFirst({
    where: { id: fieldId, factoryId: user.factoryId },
  });
  if (!field) return { error: "Unknown field" };

  const done = (id: string, sublabel: string | null = null, kind?: RefOption["kind"]) => {
    revalidatePath("/owner/master-data");
    revalidatePath("/owner/settings/master-data/studio");
    return {
      option: { id, label, sublabel, searchText: label.toLowerCase(), kind },
    };
  };

  const uniqueSku = async (base: string) => {
    const clean = base.trim() || `ITEM-${Date.now().toString(36).toUpperCase()}`;
    let candidate = clean;
    for (let i = 2; ; i++) {
      const exists = await prisma.itemMaster.findUnique({
        where: { sku: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      candidate = `${clean}-${i}`;
    }
  };

  const uniqueItemCode = async (base: string) => {
    const clean = base.trim() || `ITEM-${Date.now().toString(36).toUpperCase()}`;
    const existing = await prisma.itemMaster.findMany({
      where: {
        factoryId: user.factoryId,
        OR: [{ itemCode: clean }, { itemCode: { startsWith: `${clean}-` } }],
      },
      select: { itemCode: true },
    });
    const used = new Set(existing.map((item) => item.itemCode).filter(Boolean));
    if (!used.has(clean)) return clean;

    for (let i = 1; ; i++) {
      const candidate = `${clean}-${String(i).padStart(4, "0")}`;
      if (!used.has(candidate)) return candidate;
    }
  };

  if (field.kind === "OPTION") {
    const existing = await prisma.specFieldOption.findFirst({
      where: { fieldId, label: { equals: label, mode: "insensitive" } },
      select: { id: true, label: true, shortCode: true },
    });
    // Re-selecting rather than erroring: the owner asked for this value, and
    // they do not care whether it was already there.
    if (existing) return done(existing.id, existing.shortCode, "option");

    const count = await prisma.specFieldOption.count({ where: { fieldId } });
    const option = await prisma.specFieldOption.create({
      data: { fieldId, value: label, label, sortOrder: count },
    });
    return done(option.id, null, "option");
  }

  if (field.kind !== "REFERENCE" || !field.refTarget) {
    return { error: "This field takes typed values, so there is nothing to add" };
  }

  type TargetField = {
    id: string;
    key: string;
    kind: "VALUE" | "OPTION" | "REFERENCE";
    valueType: string | null;
    unitSuffix: string | null;
  };
  type ValueData = {
    valueText: string | null;
    valueNumber: number | null;
    valueBool: boolean | null;
    optionId: string | null;
    valueItemId: string | null;
    valueRefId: string | null;
  };

  const emptyValue = (): ValueData => ({
    valueText: null,
    valueNumber: null,
    valueBool: null,
    optionId: null,
    valueItemId: null,
    valueRefId: null,
  });

  const loadTargetFields = async () => {
    const ids = [...new Set([field.targetFieldId, ...Object.keys(filters)].filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) return new Map<string, TargetField>();
    const rows = await prisma.specField.findMany({
      where: { id: { in: ids }, factoryId: user.factoryId },
      select: { id: true, key: true, kind: true, valueType: true, unitSuffix: true },
    });
    return new Map(rows.map((row) => [row.id, row as TargetField]));
  };

  const valueForLabel = async (target: TargetField): Promise<ValueData> => {
    const empty = emptyValue();
    if (target.kind === "OPTION") {
      const existing = await prisma.specFieldOption.findFirst({
        where: { fieldId: target.id, label: { equals: label, mode: "insensitive" } },
        select: { id: true },
      });
      if (existing) return { ...empty, optionId: existing.id };

      const count = await prisma.specFieldOption.count({ where: { fieldId: target.id } });
      const option = await prisma.specFieldOption.create({
        data: { fieldId: target.id, value: label, label, sortOrder: count },
        select: { id: true },
      });
      return { ...empty, optionId: option.id };
    }
    if (target.kind === "VALUE" && (target.valueType === "NUMBER" || target.valueType === "MEASUREMENT")) {
      return { ...empty, valueNumber: Number.isNaN(Number(label)) ? null : Number(label) };
    }
    if (target.kind === "VALUE" && (target.valueType === "TOGGLE" || target.valueType === "CHECKBOX")) {
      return { ...empty, valueBool: /^(yes|true|1|y)$/i.test(label) };
    }
    return { ...empty, valueText: label };
  };

  const valueForKey = async (target: TargetField, key: string) => {
    const empty = emptyValue();

    // Check if key is a valid ItemMaster record (e.g. Maruti, Brezza)
    const item = await prisma.itemMaster.findFirst({
      where: { id: key },
      select: { id: true }
    });

    if (item) {
      // Look up if this item has a value stored for the target field
      const itemVal = await prisma.itemFieldValue.findFirst({
        where: { itemId: key, fieldId: target.id },
        select: {
          optionId: true,
          valueItemId: true,
          valueRefId: true,
          valueText: true,
          valueNumber: true,
          valueBool: true
        }
      });
      if (itemVal) {
        return {
          optionId: itemVal.optionId,
          valueItemId: itemVal.valueItemId,
          valueRefId: itemVal.valueRefId,
          valueText: itemVal.valueText,
          valueNumber: itemVal.valueNumber,
          valueBool: itemVal.valueBool
        };
      }

      // If no field value exists on the item, but the target field is a REFERENCE targeting this group
      if (target.kind === "REFERENCE") {
        return { ...empty, valueItemId: item.id };
      }
    }

    if (target.kind === "OPTION") {
      const option = await prisma.specFieldOption.findFirst({
        where: { id: key, fieldId: target.id },
        select: { id: true },
      });
      return option ? { ...empty, optionId: option.id } : { ...empty, valueText: key };
    }
    if (target.kind === "REFERENCE") {
      return { ...empty, valueText: key };
    }
    if (target.valueType === "NUMBER" || target.valueType === "MEASUREMENT") {
      const n = Number(key);
      return { ...empty, valueNumber: Number.isNaN(n) ? null : n };
    }
    if (target.valueType === "TOGGLE" || target.valueType === "CHECKBOX") {
      return { ...empty, valueBool: /^(yes|true|1|y)$/i.test(key) };
    }
    return { ...empty, valueText: key };
  };

  const rawFromData = async (target: TargetField, data: ValueData): Promise<RawAnswer> => {
    if (data.optionId) {
      const option = await prisma.specFieldOption.findUnique({
        where: { id: data.optionId },
        select: { label: true, shortCode: true },
      });
      return { option };
    }
    if (data.valueItemId) {
      const valueItem = await prisma.itemMaster.findUnique({
        where: { id: data.valueItemId },
        select: { name: true, aliasName: true, itemCode: true },
      });
      return { valueItem };
    }
    return {
      valueText: data.valueText,
      valueNumber: data.valueNumber,
      valueBool: data.valueBool,
    };
  };

  const writeTargetColumnValue = async (itemId: string, target: TargetField | null, data: ValueData | null) => {
    if (!target) return;
    if (!data) return;
    await writeValue(itemId, target, data);
  };

  const writeValue = async (
    itemId: string,
    target: TargetField,
    data: ValueData
  ) => {
    await prisma.itemFieldValue.upsert({
      where: { itemId_fieldId: { itemId, fieldId: target.id } },
      create: { factoryId: user.factoryId, itemId, fieldId: target.id, ...data },
      update: data,
    });
  };

  const valueCondition = (fieldId: string, data: ValueData) => {
    if (data.optionId) return { specValues: { some: { fieldId, optionId: data.optionId } } };
    if (data.valueItemId) return { specValues: { some: { fieldId, valueItemId: data.valueItemId } } };
    if (data.valueRefId) return { specValues: { some: { fieldId, valueRefId: data.valueRefId } } };
    if (data.valueNumber !== null) return { specValues: { some: { fieldId, valueNumber: data.valueNumber } } };
    if (data.valueBool !== null) return { specValues: { some: { fieldId, valueBool: data.valueBool } } };
    return { specValues: { some: { fieldId, valueText: { equals: data.valueText ?? "", mode: "insensitive" as const } } } };
  };

  const renderTargetIdentity = async (
    group: { name: string; shortCode: string | null; nameTemplate: string | null; codeTemplate: string | null },
    target: TargetField | null,
    targetData: ValueData | null,
    filterFields: Map<string, TargetField>,
    fallbackCode: string
  ) => {
    if (!target || !targetData) return { name: label, code: fallbackCode };
    const fields = [target];
    const rawByKey: Record<string, RawAnswer> = { [target.key]: await rawFromData(target, targetData) };
    for (const [fieldId] of Object.entries(filters)) {
      const f = filterFields.get(fieldId);
      if (!f || f.id === target.id) continue;
      fields.push(f);
      rawByKey[f.key] = await rawFromData(f, await valueForKey(f, filters[fieldId]));
    }
    const resolved = resolveAnswers(fields, rawByKey);
    resolved.group = { name: group.name, code: group.shortCode || group.name };
    return {
      name: renderTemplate(group.nameTemplate ?? "{group}", resolved, "name") || label,
      code: renderTemplate(group.codeTemplate ?? "{group}", resolved, "code") || fallbackCode,
    };
  };

  switch (field.refTarget) {
    case "ITEM_GROUP": {
      if (!field.targetGroupId) return { error: "This field has no target category" };
      const targetFields = await loadTargetFields();
      const target = field.targetFieldId ? targetFields.get(field.targetFieldId) ?? null : null;
      const targetData = target ? await valueForLabel(target) : null;
      const filterData = await Promise.all(
        Object.entries(filters).map(async ([fieldId, key]) => {
          const f = targetFields.get(fieldId);
          return f ? { field: f, data: await valueForKey(f, key) } : null;
        })
      );
      const fieldValueConditions = [
        ...(target && targetData ? [valueCondition(target.id, targetData)] : []),
        ...filterData
          .filter((entry): entry is { field: TargetField; data: ValueData } => Boolean(entry && entry.field.id !== target?.id))
          .map((entry) => valueCondition(entry.field.id, entry.data)),
      ];
      const existing = await prisma.itemMaster.findFirst({
        where: target
          ? {
              factoryId: user.factoryId,
              groupId: field.targetGroupId,
              AND: fieldValueConditions,
            }
          : {
              factoryId: user.factoryId,
              groupId: field.targetGroupId,
              name: { equals: label, mode: "insensitive" },
            },
        select: { id: true, itemCode: true },
      });
      if (existing) {
        for (const entry of filterData) if (entry) await writeValue(existing.id, entry.field, entry.data);
        await writeTargetColumnValue(existing.id, target, targetData);
        return done(existing.id, existing.itemCode, "item");
      }

      const group = await prisma.itemGroup.findFirst({
        where: { id: field.targetGroupId, factoryId: user.factoryId },
      });
      if (!group) return { error: "Target category not found" };

      // Named directly rather than composed from a template: the owner typed
      // the name, and a raw material usually has no spec fields to compose from.
      // DRAFT flags it for review — it is immediately usable either way.
      const code = `${(group.shortCode || group.name).slice(0, 6).toUpperCase().replace(/\s+/g, "")}-${Date.now().toString(36).toUpperCase()}`;
      const identity = await renderTargetIdentity(group, target, targetData, targetFields, code);
      const itemCode = await uniqueItemCode(identity.code);
      const sku = await uniqueSku(itemCode);
      const item = await prisma.itemMaster.create({
        data: {
          factoryId: user.factoryId,
          groupId: group.id,
          itemType: group.itemType,
          name: identity.name,
          itemCode,
          sku,
          defaultUOM: "PCS",
          status: "DRAFT",
          manufacturingType: group.isProducible ? "MAKE" : "BUY",
        },
      });
      for (const entry of filterData) if (entry) await writeValue(item.id, entry.field, entry.data);
      await writeTargetColumnValue(item.id, target, targetData);
      return done(item.id, item.itemCode, "item");
    }

    // DESIGN and the vehicle targets are gone: they created rows in bespoke
    // tables. Those are ordinary categories now, so inline creation goes
    // through the ITEM_GROUP branch like everything else.

    case "SUPPLIER": {
      const row = await prisma.supplier.create({
        data: { factoryId: user.factoryId, name: label },
      });
      return done(row.id);
    }

    case "CUSTOMER": {
      const row = await prisma.customer.create({
        data: { factoryId: user.factoryId, name: label },
      });
      return done(row.id);
    }

    default:
      // Employees and departments carry access and routing decisions that a
      // dropdown cannot make. Better to send the owner to the proper screen
      // than to create a half-formed record that grants or blocks work.
      return {
        error: `Add a new ${field.name.toLowerCase()} from its own screen — it needs more than a name.`,
      };
  }
}
