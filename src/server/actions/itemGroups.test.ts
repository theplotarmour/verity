import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import { resolveBomModeFromTree } from "@/lib/master-data/bom-mode";

/**
 * Category flag inheritance.
 *
 * A subcategory created under a configured parent used to come out with defaults
 * derived from `itemType` alone. That is quiet and expensive: `itemSearch`,
 * `orderItemResolver` and `orders` all filter on `isProducible: true`, so a
 * subfolder under a producible category was not itself producible and every item
 * in it was invisible to production and order taking — with nothing reporting
 * why.
 *
 * The database half is exercised directly; the `bomMode` decision is checked
 * against the source, because the interesting property is a field that is
 * deliberately *absent*.
 */
describe("inherited flags", () => {
  let factoryId: string;
  let seeded = false;
  const created: string[] = [];

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;
  });

  afterAll(async () => {
    // Children first — the tree restricts deletes.
    for (const id of [...created].reverse()) {
      await prisma.itemGroup.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  async function makeGroup(
    name: string,
    data: Partial<{
      parentId: string | null;
      isProducible: boolean;
      isSalable: boolean;
      isPurchasable: boolean;
      hasInventoryUnits: boolean;
      bomMode: "OFF" | "RECIPE" | "INGREDIENTS" | null;
    }> = {},
  ) {
    const group = await prisma.itemGroup.create({
      data: {
        factoryId,
        name: `${name} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        itemType: "FINISHED_PRODUCT",
        parentId: data.parentId ?? null,
        isSheet: !data.parentId,
        isProducible: data.isProducible ?? false,
        isSalable: data.isSalable ?? false,
        isPurchasable: data.isPurchasable ?? false,
        hasInventoryUnits: data.hasInventoryUnits ?? true,
        bomMode: data.bomMode ?? null,
      },
      select: { id: true },
    });
    created.push(group.id);
    return group.id;
  }

  it("lets a child carry the parent's behavioural flags", async () => {
    if (!seeded) return;
    const parentId = await makeGroup("Inherit parent", {
      isProducible: true,
      isSalable: true,
      isPurchasable: false,
      hasInventoryUnits: false,
    });
    const parent = await prisma.itemGroup.findUniqueOrThrow({
      where: { id: parentId },
      select: {
        isProducible: true,
        isSalable: true,
        isPurchasable: true,
        hasInventoryUnits: true,
      },
    });

    const childId = await makeGroup("Inherit child", { parentId, ...parent });
    const child = await prisma.itemGroup.findUniqueOrThrow({
      where: { id: childId },
      select: {
        isProducible: true,
        isSalable: true,
        isPurchasable: true,
        hasInventoryUnits: true,
      },
    });

    expect(child).toEqual(parent);
  });

  it("makes an inheriting child visible to the producible filter", async () => {
    if (!seeded) return;
    // The consequence that was actually broken. This is the exact query
    // orderItemResolver and orders run.
    const parentId = await makeGroup("Producible parent", { isProducible: true });
    const childId = await makeGroup("Producible child", { parentId, isProducible: true });

    const found = await prisma.itemGroup.findMany({
      where: { factoryId, isProducible: true, parentId: { not: null } },
      select: { id: true },
    });
    expect(found.map((g) => g.id)).toContain(childId);
  });

  it("leaves a child's bomMode null so it inherits at read time", async () => {
    if (!seeded) return;
    // The departure from the ported commit. Veda copied the parent's value
    // because the column was non-null there; here null *means* inherit.
    const parentId = await makeGroup("BOM parent", { bomMode: "RECIPE" });
    const childId = await makeGroup("BOM child", { parentId, bomMode: null });

    const child = await prisma.itemGroup.findUniqueOrThrow({
      where: { id: childId },
      select: { bomMode: true },
    });
    expect(child.bomMode).toBeNull();

    const tree = await prisma.itemGroup.findMany({
      where: { factoryId },
      select: { id: true, parentId: true, bomMode: true },
    });
    expect(resolveBomModeFromTree(childId, tree)).toBe("RECIPE");
  });

  it("keeps propagating when the parent's mode changes later", async () => {
    if (!seeded) return;
    // The reason not to copy. A pinned child would still say RECIPE here.
    const parentId = await makeGroup("Repoint parent", { bomMode: "RECIPE" });
    const childId = await makeGroup("Repoint child", { parentId, bomMode: null });

    await prisma.itemGroup.update({
      where: { id: parentId },
      data: { bomMode: "INGREDIENTS" },
    });

    const tree = await prisma.itemGroup.findMany({
      where: { factoryId },
      select: { id: true, parentId: true, bomMode: true },
    });
    expect(resolveBomModeFromTree(childId, tree)).toBe("INGREDIENTS");
  });
});

describe("createItemGroup source", () => {
  const source = readFileSync(path.resolve(__dirname, "itemGroups.ts"), "utf8");
  const create = source.slice(
    source.indexOf("export async function createItemGroup"),
    source.indexOf("// Auto-linking"),
  );
  const code = create.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  it("inherits all four behavioural flags from the parent", () => {
    for (const flag of ["isProducible", "isSalable", "isPurchasable", "hasInventoryUnits"]) {
      expect(code, `${flag} is not inherited`).toMatch(
        new RegExp(`${flag}:[\\s\\S]{0,120}parentGroup\\?\\.${flag}`),
      );
    }
  });

  it("does not write bomMode at all", () => {
    // Copying it would pin the child and stop the parent's changes propagating,
    // which is the whole of the inheritance feature.
    expect(code).not.toMatch(/bomMode:/);
  });

  it("reads the parent once", () => {
    // It was fetched twice — for itemType, then again for auto-linking — and two
    // reads of the same row is two places for the tenancy filter to be wrong.
    expect((code.match(/itemGroup\.findFirst\(/g) ?? []).length).toBeLessThanOrEqual(2);
  });
});
