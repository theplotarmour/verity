"use server";

import prisma from "@/lib/prisma";
import { guardDelete } from "@/lib/server/prisma-errors";
import { FABRIC_CATEGORY, DEFAULT_MATERIAL_CATEGORY } from "@/lib/catalog-constants";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { itemsInRootCategory, createItemInRootCategory } from "@/lib/server/categoryItems";

// Master data feeds the production studio, inventory and procurement screens,
// so every catalog change must revalidate those pages too — otherwise their
// dropdowns (colors, fabrics, designs, vehicles) keep serving stale data.
// Catalog edits always refresh the studio + production (which consumes every
// catalog); inventory/purchase caches are only busted for material-ish scopes
// so adding a colour doesn't invalidate three heavy pages (perf audit P0).
function revalidateMasterPaths(scope: "catalog" | "materials" = "catalog") {
  revalidatePath("/owner/production");
  if (scope === "materials") {
    revalidatePath("/owner/inventory");
    revalidatePath("/owner/purchase");
  }
}

// SKUs are globally unique in ItemMaster; suffix until free so two materials
// that normalize to the same code (e.g. "Napa" twice) don't crash the insert.
async function ensureUniqueSku(base: string) {
  const clean = base.trim() || `RM-${Date.now().toString(36).toUpperCase()}`;
  let candidate = clean;
  for (let i = 2; ; i++) {
    const exists = await prisma.itemMaster.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!exists) return candidate;
    candidate = `${clean}-${i}`;
  }
}

// =======================
// Vehicles
// =======================

// Vehicle brand, model and generation CRUD lived here, writing to bespoke
// tables. Vehicles are an ordinary category now — a factory that needs them
// builds one in the studio, and its rows are items like any other.

// Legacy Product / ProductVariant / ProductCategory CRUD lived here. Those
// tables are retired; a factory builds its categories and items in the studio.

// =======================
// Master Data Extensions
// =======================

export async function addWarehouse(name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.warehouse.create({ data: { name, factoryId: user.factoryId } });
  revalidateMasterPaths("materials");
}

export async function removeWarehouse(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("location", () => prisma.warehouse.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths("materials");
  return result;
}

export async function addSupplier(name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.supplier.create({ data: { name, factoryId: user.factoryId } });
  revalidateMasterPaths("materials");
}

export async function removeSupplier(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  // Purchase orders reference the supplier (FK PurchaseOrder_supplierId_fkey);
  // deleting one that's in use throws P2003. Block it with a clear message.
  const poCount = await prisma.purchaseOrder.count({ where: { supplierId: id, factoryId: user.factoryId } });
  if (poCount > 0) {
    return { error: `This supplier has ${poCount} purchase order${poCount === 1 ? "" : "s"} and cannot be deleted. Remove or reassign them first.` };
  }
  const result = await guardDelete("supplier", () => prisma.supplier.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths("materials");
  return result;
}

export async function addMaterialCategory(name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.materialCategory.create({ data: { name, factoryId: user.factoryId } });
  revalidateMasterPaths("materials");
}

export async function removeMaterialCategory(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("material category", () => prisma.materialCategory.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths("materials");
  return result;
}

// ---- Subcategories (nested under a MaterialCategory) --------------------

export async function addMaterialSubcategory(categoryId: string, name: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const clean = name.trim();
  if (!clean) return { error: "Enter a name" };
  const category = await prisma.materialCategory.findFirst({ where: { id: categoryId, factoryId: user.factoryId } });
  if (!category) return { error: "Category not found" };
  try {
    await prisma.materialSubcategory.create({ data: { factoryId: user.factoryId, categoryId, name: clean } });
  } catch {
    return { error: "That subcategory already exists" };
  }
  revalidateMasterPaths("materials");
  return { success: true };
}

export async function updateMaterialSubcategory(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await prisma.materialSubcategory.update({ where: { id, factoryId: user.factoryId }, data: { name: name.trim() } });
  revalidateMasterPaths("materials");
  return { success: true };
}

export async function removeMaterialSubcategory(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("subcategory", () => prisma.materialSubcategory.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths("materials");
  return result;
}

// Seeds the client's default category tree the first time it's needed. Idempotent
// — existing categories/subcategories are left untouched, only missing ones are
// created, so it is safe to call on demand.
const DEFAULT_CATEGORY_TREE: Record<string, string[]> = {
  "Raw Material": [
    "PU Leather", "PVC Leather", "Fabric", "Foam", "Thread", "Elastic",
    "Velcro", "Zipper", "Piping", "Labels", "Plastic Parts", "Metal Parts", "Rubber Parts",
  ],
  "Finished Goods": [],
  "Semi Finished": [],
  "Packaging": [],
  "Consumables": [],
  "Machinery": [],
  "Spare Parts": [],
};

export async function seedMasterDefaults() {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const factoryId = user.factoryId;

  for (const [catName, subs] of Object.entries(DEFAULT_CATEGORY_TREE)) {
    let category = await prisma.materialCategory.findFirst({
      where: { factoryId, name: { equals: catName, mode: "insensitive" } },
    });
    if (!category) {
      category = await prisma.materialCategory.create({ data: { factoryId, name: catName } });
    }
    for (const sub of subs) {
      const exists = await prisma.materialSubcategory.findFirst({
        where: { factoryId, categoryId: category.id, name: { equals: sub, mode: "insensitive" } },
      });
      if (!exists) {
        await prisma.materialSubcategory.create({ data: { factoryId, categoryId: category.id, name: sub } });
      }
    }
  }
  revalidateMasterPaths("materials");
  return { success: true };
}

// Fabrics and materials are separate catalogs that happen to share the
// ItemMaster table, told apart by category. A material must therefore never be
// filed under "Fabric" — that is what made new materials vanish from the
// Materials sheet and reappear under Fabrics. The category is resolved here,
// creating it when missing, so the caller cannot fall back to the wrong one.
export async function addCatalogItem(kind: "FABRIC" | "MATERIAL", name: string, unit = "Units", categoryName?: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const clean = name.trim();
  if (!clean) return { error: "Enter a name" };

  const wanted =
    kind === "FABRIC"
      ? FABRIC_CATEGORY
      : (categoryName?.trim() && categoryName.trim().toLowerCase() !== FABRIC_CATEGORY.toLowerCase()
          ? categoryName.trim()
          : DEFAULT_MATERIAL_CATEGORY);

  let category = await prisma.materialCategory.findFirst({
    where: { factoryId: user.factoryId, name: { equals: wanted, mode: "insensitive" } },
  });
  if (!category) {
    category = await prisma.materialCategory.create({ data: { factoryId: user.factoryId, name: wanted } });
  }

  const duplicate = await prisma.itemMaster.findFirst({
    where: { factoryId: user.factoryId, name: { equals: clean, mode: "insensitive" }, categoryId: category.id },
    select: { id: true },
  });
  if (duplicate) return { error: `"${clean}" already exists in ${wanted}` };

  const sku = await ensureUniqueSku(`RM-${clean.replace(/[^A-Za-z0-9]+/g, "-").toUpperCase()}`);
  await prisma.itemMaster.create({
    data: { categoryId: category.id, name: clean, sku, defaultUOM: unit, itemType: "RAW_MATERIAL", factoryId: user.factoryId },
  });
  revalidateMasterPaths("materials");
  return { success: true };
}

export async function addMaterial(categoryId: string, name: string, sku: string, unit: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const duplicate = await prisma.itemMaster.findFirst({
    where: { factoryId: user.factoryId, name: { equals: name, mode: "insensitive" }, categoryId },
    select: { id: true },
  });
  if (duplicate) throw new Error(`"${name}" already exists in this category`);
  const uniqueSku = await ensureUniqueSku(sku);
  await prisma.itemMaster.create({
    data: { categoryId, name, sku: uniqueSku, defaultUOM: unit, itemType: "RAW_MATERIAL", factoryId: user.factoryId },
  });
  revalidateMasterPaths("materials");
}

export async function removeMaterial(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("material", () => prisma.itemMaster.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths("materials");
  return result;
}

// Vehicle generation, year and variant helpers lived here. Vehicles are an
// ordinary category now; their rows are items and need no bespoke CRUD.

export async function addWarehouseZone(warehouseId: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.warehouseZone.create({ data: { warehouseId, name, factoryId: user.factoryId } });
  revalidateMasterPaths("materials");
}

export async function addWarehouseRack(zoneId: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.warehouseRack.create({ data: { zoneId, name, factoryId: user.factoryId } });
  revalidateMasterPaths("materials");
}

export async function addWarehouseShelf(rackId: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.warehouseShelf.create({ data: { rackId, name, factoryId: user.factoryId } });
  revalidateMasterPaths("materials");
}

export async function addWarehouseBin(shelfId: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.warehouseBin.create({ data: { shelfId, name, factoryId: user.factoryId } });
  revalidateMasterPaths("materials");
}

// Bulk vehicle import lived here, writing to five bespoke tables. Vehicles are
// ordinary categories now, so importing them is the generic CSV import.

// Vehicle rules import lived here, creating brand/model/generation rows and
// ProductCombination entries. Vehicles are ordinary categories now.

// addSpecField (legacy ProductType/ProductField) removed — spec columns live on
// ItemGroup via the studio's Configure mode now.

export async function addColor(name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const row = await createItemInRootCategory(user.factoryId, "Colour", name);
  if (!row) throw new Error("There is no Colour category to add this to.");
  revalidateMasterPaths();
}

export async function updateColor(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.itemMaster.update({
    where: { id, factoryId: user.factoryId },
    data: { name: name.trim() },
  });
  revalidateMasterPaths();
}

export async function removeColor(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("colour", () =>
    prisma.itemMaster.delete({ where: { id, factoryId: user.factoryId } })
  );
  if ("error" in result) return result;
  revalidateMasterPaths();
  return result;
}

// =======================
// Missing update/remove paths for the studio grid
// =======================

export async function updateMaterial(id: string, data: { name?: string; sku?: string; unit?: string }) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  try {
    await prisma.itemMaster.update({
      where: { id, factoryId: user.factoryId },
      data: { name: data.name, sku: data.sku, defaultUOM: data.unit },
    });
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error(`SKU "${data.sku}" is already used by another item`);
    throw err;
  }
  revalidateMasterPaths("materials");
}

export async function updateSupplier(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.supplier.update({ where: { id, factoryId: user.factoryId }, data: { name } });
  revalidateMasterPaths("materials");
}

export async function updateWarehouse(id: string, data: { name?: string; kind?: string }) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.warehouse.update({ where: { id, factoryId: user.factoryId }, data });
  revalidateMasterPaths("materials");
  revalidatePath("/owner/inventory");
}

export async function updateMaterialCategory(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.materialCategory.update({ where: { id, factoryId: user.factoryId }, data: { name } });
  revalidateMasterPaths("materials");
}

// =======================
// Generic CSV import per sheet
// =======================

export async function importMasterCsv(sheet: string, rows: Array<Record<string, string>>) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const factoryId = user.factoryId;
  let imported = 0;

  // One existence prefetch per entity instead of a findFirst per CSV row
  // (perf audit P1: the old find-then-create pattern cost 2–3 queries per row).
  const lower = (s: string) => (s ?? "").trim().toLowerCase();
  const [pfDesigns, pfColors, pfMaterials, pfSuppliers, pfProducts, pfMaterialCats, pfProductCats] = await Promise.all([
    Promise.resolve([]),
    sheet === "colors" ? itemsInRootCategory(factoryId, "Colour") : Promise.resolve([]),
    sheet === "materials" ? prisma.itemMaster.findMany({ where: { factoryId }, select: { name: true, sku: true } }) : Promise.resolve([]),
    sheet === "suppliers" ? prisma.supplier.findMany({ where: { factoryId }, select: { name: true } }) : Promise.resolve([]),
    Promise.resolve([]),
    sheet === "materials" ? prisma.materialCategory.findMany({ where: { factoryId }, select: { id: true, name: true } }) : Promise.resolve([]),
    Promise.resolve([]),
  ]);
  const designSet = new Set(pfDesigns.map((d: any) => lower(d.name)));
  const colorSet = new Set(pfColors.map((c: any) => lower(c.name)));
  const materialNameSet = new Set(pfMaterials.map((m: any) => lower(m.name)));
  const materialSkuSet = new Set(pfMaterials.map((m: any) => lower(m.sku)));
  const supplierSet = new Set(pfSuppliers.map((s: any) => lower(s.name)));
  const productByName = new Map(pfProducts.map((p: any) => [lower(p.name), p.id]));
  const materialCatByName = new Map(pfMaterialCats.map((c: any) => [lower(c.name), c.id]));
  const productCatByName = new Map(pfProductCats.map((c: any) => [lower(c.name), c.id]));

  for (const row of rows) {
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
        if (v && String(v).trim()) return String(v).trim();
      }
      return "";
    };

    try {
      if (sheet === "colors") {
        const name = get("Color", "Name");
        if (!name) continue;
        if (!colorSet.has(lower(name))) { await createItemInRootCategory(factoryId, "Colour", name); colorSet.add(lower(name)); imported++; }
      } else if (sheet === "materials") {
        const name = get("Material", "Name");
        if (!name) continue;
        const sku = get("SKU") || `RM-${name.replace(/[^A-Za-z0-9]+/g, "-").toUpperCase()}`;
        const unit = get("Unit", "UOM") || "Units";
        const catName = get("Category");
        let categoryId: string | null = null;
        if (catName) {
          categoryId = materialCatByName.get(lower(catName)) ?? null;
          if (!categoryId) {
            const cat = await prisma.materialCategory.create({ data: { factoryId, name: catName } });
            categoryId = cat.id;
            materialCatByName.set(lower(catName), cat.id);
          }
        }
        if (!materialSkuSet.has(lower(sku)) && !materialNameSet.has(lower(name))) {
          await prisma.itemMaster.create({ data: { factoryId, name, sku, defaultUOM: unit, itemType: "RAW_MATERIAL", categoryId } });
          materialSkuSet.add(lower(sku)); materialNameSet.add(lower(name));
          imported++;
        }
      } else if (sheet === "suppliers") {
        const name = get("Supplier", "Name");
        if (!name) continue;
        if (!supplierSet.has(lower(name))) { await prisma.supplier.create({ data: { factoryId, name } }); supplierSet.add(lower(name)); imported++; }
      } else if (sheet === "colorsheet") {
        // reserved
      }
    } catch (err) {
      console.error(`CSV import row failed (${sheet}):`, err);
    }
  }

  revalidateMasterPaths("materials");
  return { imported };
}

// =======================
// Product Types (preset specifications per product kind)
// =======================

// Legacy ProductType / ProductField CRUD and the ProductCombination catalog
// lived here. All retired — spec columns live on ItemGroup, and the studio's
// variant search replaced the combination catalogue.

// =======================
// Spec BOMs (design- and fabric-level bills of material)
// =======================



// Additional CSV import sheets (variants, locations, spec presets, templates)
export async function importMasterCsvExtra(sheet: string, rows: Array<Record<string, string>>) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const factoryId = user.factoryId;
  let imported = 0;

  const get = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
      if (v && String(v).trim()) return String(v).trim();
    }
    return "";
  };

  for (const row of rows) {
    try {
      if (sheet === "locations") {
        const name = get(row, "Location", "Name");
        if (!name) continue;
        const kind = get(row, "Kind").toUpperCase() === "STORE" ? "STORE" : "WAREHOUSE";
        const exists = await prisma.warehouse.findFirst({ where: { factoryId, name } });
        if (!exists) { await prisma.warehouse.create({ data: { factoryId, name, kind } }); imported++; }
      } else if (sheet === "templates") {
        const templateName = get(row, "Template");
        const sectionTitle = get(row, "Section");
        const checkpointName = get(row, "Checkpoint");
        if (!templateName) continue;
        let template = await prisma.checklistTemplate.findFirst({ where: { factoryId, name: templateName }, });
        if (!template) {
          // Don't blanket-mark imported templates "latest" — only the very first
          // template a factory has should be, so QC's isLatest fallback stays
          // unambiguous.
          const anyTemplate = await prisma.checklistTemplate.findFirst({ where: { factoryId }, select: { id: true } });
          template = await prisma.checklistTemplate.create({
            data: { factoryId, name: templateName, version: "1.0", isLatest: !anyTemplate, status: "active" },
          });
          imported++;
        }
        if (!sectionTitle) continue;
        let section = await prisma.templateSection.findFirst({ where: { templateId: template.id, title: sectionTitle } });
        if (!section) {
          const count = await prisma.templateSection.count({ where: { templateId: template.id } });
          section = await prisma.templateSection.create({
            data: { factoryId, templateId: template.id, title: sectionTitle, sortOrder: count + 1 },
          });
          imported++;
        }
        if (!checkpointName) continue;
        const cpExists = await prisma.checkpoint.findFirst({ where: { sectionId: section.id, name: checkpointName } });
        if (!cpExists) {
          const count = await prisma.checkpoint.count({ where: { sectionId: section.id } });
          await prisma.checkpoint.create({
            data: {
              factoryId,
              sectionId: section.id,
              name: checkpointName,
              instructions: get(row, "Instructions") || "",
              // Photos are opt-in: only "Yes" requires one (an empty column no
              // longer forces a photo).
              requireImage: get(row, "Require Image").toLowerCase() === "yes",
              requireRemarks: get(row, "Require Remarks").toLowerCase() === "yes",
              sortOrder: count + 1,
            },
          });
          imported++;
        }
      }
    } catch (err) {
      console.error(`CSV extra import failed (${sheet}):`, err);
    }
  }

  revalidateMasterPaths();
  return { imported };
}

// =======================
// Location structure — update and delete
// =======================

/**
 * Renaming and removing the warehouse subtree.
 *
 * Only `add*` existed, so a typo in a zone name was permanent and an
 * experimental rack could never be cleared away.
 *
 * Deleting needs care that renaming does not. The subtree cascades — zone →
 * racks → shelves → bins — but `BinBalance` and `StockLedgerEntry` hold a
 * required relation to a bin with no `onDelete`, which Prisma defaults to
 * `Restrict`. So the database already refuses to destroy stock; what it produces
 * is a raw foreign-key error from three levels down the cascade, which tells an
 * operator nothing about which bin is holding what. These check first and name
 * the blocker.
 */

/** A bin holding stock, or carrying history that must not be destroyed. */
interface LocationBlocker {
  reason: "stock" | "history";
  binName: string;
  detail: string;
}

/** The four levels, and the word used when talking to the operator. */
type LocationLevel = "zone" | "rack" | "shelf" | "bin";

/**
 * What is stopping this part of the subtree from being removed.
 *
 * Takes a bin-id list so one implementation serves all four levels — the check
 * is identical, only the way the bins are found differs. Four copies would be
 * four chances for one of them to forget the ledger.
 */
async function locationBlockers(binIds: string[]): Promise<LocationBlocker[]> {
  if (binIds.length === 0) return [];

  const [balances, movements] = await Promise.all([
    prisma.binBalance.findMany({
      // All three buckets count. Stock on QC hold or marked rejected is still
      // physically in the bin — checking only `stockAvailable` would let a bin
      // full of quarantined goods be deleted, which is the case most worth
      // catching because nobody is looking at it.
      //
      // An all-zero row is not a blocker: it records that a bin once held an
      // item and now holds none, which the ledger already says.
      where: {
        binId: { in: binIds },
        OR: [
          { stockAvailable: { not: 0 } },
          { stockQcHold: { not: 0 } },
          { stockRejected: { not: 0 } },
        ],
      },
      select: {
        stockAvailable: true,
        stockQcHold: true,
        stockRejected: true,
        bin: { select: { name: true } },
        item: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.stockLedgerEntry.groupBy({
      by: ["binId"],
      where: { binId: { in: binIds } },
      _count: { binId: true },
    }),
  ]);

  const blockers: LocationBlocker[] = balances.map((balance) => {
    const held = balance.stockAvailable + balance.stockQcHold + balance.stockRejected;
    const onHold = balance.stockQcHold + balance.stockRejected;
    return {
      reason: "stock" as const,
      binName: balance.bin.name,
      // Name the held portion separately: "12 × Nappa Leather (4 on hold)" tells
      // an operator why the number does not match what they can see as available.
      detail: `${held} × ${balance.item?.name ?? "item"}${onHold > 0 ? ` (${onHold} on hold)` : ""}`,
    };
  });

  if (movements.length > 0) {
    // History is the audit trail. A bin that has ever moved stock cannot be
    // deleted, because the ledger entry pointing at it must keep resolving —
    // that record is what a stock reconciliation is built from.
    const named = await prisma.warehouseBin.findMany({
      where: { id: { in: movements.map((m) => m.binId) } },
      select: { id: true, name: true },
      take: 5,
    });
    const counts = new Map(movements.map((m) => [m.binId, m._count.binId]));
    for (const bin of named) {
      const n = counts.get(bin.id) ?? 0;
      blockers.push({
        reason: "history",
        binName: bin.name,
        detail: `${n} stock movement${n === 1 ? "" : "s"}`,
      });
    }
  }

  return blockers;
}

/** One readable sentence from a blocker list. */
function blockerMessage(what: string, blockers: LocationBlocker[]): string {
  const stock = blockers.filter((b) => b.reason === "stock");
  const history = blockers.filter((b) => b.reason === "history");

  if (stock.length > 0) {
    const named = stock.slice(0, 3).map((b) => `${b.binName} (${b.detail})`).join(", ");
    const more = stock.length > 3 ? ` and ${stock.length - 3} more` : "";
    return `Cannot delete this ${what}: stock is still held in ${named}${more}. Move or adjust it first.`;
  }

  const named = history.slice(0, 3).map((b) => `${b.binName} (${b.detail})`).join(", ");
  const more = history.length > 3 ? ` and ${history.length - 3} more` : "";
  return `Cannot delete this ${what}: ${named}${more} carry stock history, which has to keep resolving for reconciliation. Rename it instead.`;
}

/**
 * Every bin under a node, for the blocker check.
 *
 * Scoped through the parent chain rather than on the node's own `factoryId`,
 * which is nullable on all four of these tables — it was added after the rows
 * existed, so it cannot be trusted as the tenancy filter. `Warehouse.factoryId`
 * is required, and it is what ownership resolves to.
 */
async function binsUnder(factoryId: string, level: LocationLevel, id: string): Promise<string[]> {
  const where =
    level === "zone"
      ? { shelf: { rack: { zone: { id, warehouse: { factoryId } } } } }
      : level === "rack"
        ? { shelf: { rack: { id, zone: { warehouse: { factoryId } } } } }
        : level === "shelf"
          ? { shelf: { id, rack: { zone: { warehouse: { factoryId } } } } }
          : { id, shelf: { rack: { zone: { warehouse: { factoryId } } } } };

  const bins = await prisma.warehouseBin.findMany({ where, select: { id: true } });
  return bins.map((b) => b.id);
}

/** Confirm a node belongs to the caller's factory. See the note on `binsUnder`. */
async function ownsLocation(factoryId: string, level: LocationLevel, id: string): Promise<boolean> {
  if (level === "zone") {
    return (await prisma.warehouseZone.count({ where: { id, warehouse: { factoryId } } })) > 0;
  }
  if (level === "rack") {
    return (
      (await prisma.warehouseRack.count({ where: { id, zone: { warehouse: { factoryId } } } })) > 0
    );
  }
  if (level === "shelf") {
    return (
      (await prisma.warehouseShelf.count({
        where: { id, rack: { zone: { warehouse: { factoryId } } } },
      })) > 0
    );
  }
  return (
    (await prisma.warehouseBin.count({
      where: { id, shelf: { rack: { zone: { warehouse: { factoryId } } } } },
    })) > 0
  );
}

/** Rename any node in the subtree. One implementation, four thin exports. */
async function renameLocation(
  level: LocationLevel,
  id: string,
  name: string,
): Promise<{ success: true } | { error: string }> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const clean = name?.trim();
  if (!clean) return { error: `Give the ${level} a name.` };

  if (!(await ownsLocation(user.factoryId, level, id))) {
    return { error: `That ${level} was not found.` };
  }

  const data = { name: clean };
  if (level === "zone") await prisma.warehouseZone.update({ where: { id }, data });
  else if (level === "rack") await prisma.warehouseRack.update({ where: { id }, data });
  else if (level === "shelf") await prisma.warehouseShelf.update({ where: { id }, data });
  else await prisma.warehouseBin.update({ where: { id }, data });

  revalidateMasterPaths("materials");
  return { success: true };
}

/** Delete any node, refusing when stock or history depends on it. */
async function deleteLocation(
  level: LocationLevel,
  id: string,
): Promise<{ success: true } | { error: string }> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  if (!(await ownsLocation(user.factoryId, level, id))) {
    return { error: `That ${level} was not found.` };
  }

  const binIds = await binsUnder(user.factoryId, level, id);
  const blockers = await locationBlockers(binIds);
  if (blockers.length > 0) return { error: blockerMessage(level, blockers) };

  // Only zero-quantity balance rows can remain, and they carry nothing the
  // ledger does not. Removing them lets the cascade through; without this the
  // Restrict on BinBalance turns an allowed delete into a raw FK error.
  if (binIds.length > 0) {
    await prisma.binBalance.deleteMany({ where: { binId: { in: binIds } } });
  }

  // guardDelete turns a constraint violation into a sentence, for anything the
  // checks above did not anticipate — a relation added later, most likely.
  const result = await guardDelete(level, async () => {
    if (level === "zone") await prisma.warehouseZone.delete({ where: { id } });
    else if (level === "rack") await prisma.warehouseRack.delete({ where: { id } });
    else if (level === "shelf") await prisma.warehouseShelf.delete({ where: { id } });
    else await prisma.warehouseBin.delete({ where: { id } });
  });

  if ("error" in result) return { error: result.error ?? `Could not delete that ${level}.` };

  revalidateMasterPaths("materials");
  return { success: true };
}

export async function updateWarehouseZone(id: string, name: string) {
  return renameLocation("zone", id, name);
}
export async function removeWarehouseZone(id: string) {
  return deleteLocation("zone", id);
}

export async function updateWarehouseRack(id: string, name: string) {
  return renameLocation("rack", id, name);
}
export async function removeWarehouseRack(id: string) {
  return deleteLocation("rack", id);
}

export async function updateWarehouseShelf(id: string, name: string) {
  return renameLocation("shelf", id, name);
}
export async function removeWarehouseShelf(id: string) {
  return deleteLocation("shelf", id);
}

export async function updateWarehouseBin(id: string, name: string) {
  return renameLocation("bin", id, name);
}
export async function removeWarehouseBin(id: string) {
  return deleteLocation("bin", id);
}
