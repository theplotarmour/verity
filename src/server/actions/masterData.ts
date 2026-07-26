"use server";

import prisma from "@/lib/prisma";
import { guardDelete } from "@/lib/server/prisma-errors";
import { FABRIC_CATEGORY, DEFAULT_MATERIAL_CATEGORY } from "@/lib/catalog-constants";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";

// Master data feeds the production studio, inventory and procurement screens,
// so every catalog change must revalidate those pages too — otherwise their
// dropdowns (colors, fabrics, designs, vehicles) keep serving stale data.
// Catalog edits always refresh the studio + production (which consumes every
// catalog); inventory/purchase caches are only busted for material-ish scopes
// so adding a colour doesn't invalidate three heavy pages (perf audit P0).
function revalidateMasterPaths(scope: "catalog" | "materials" = "catalog") {
  revalidatePath("/owner/settings/master-data");
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

export async function addBrand(name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleBrand.create({ data: { name, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

export async function removeBrand(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("brand", () => prisma.vehicleBrand.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths();
  return result;
}

export async function addModel(brandId: string, name: string, year?: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleModel.create({ data: { name, year, brandId, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

export async function addModelByName(brandName: string, name: string, year?: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  // Find or create brand case-insensitively
  let brand = await prisma.vehicleBrand.findFirst({
    where: { name: { equals: brandName, mode: "insensitive" }, factoryId: user.factoryId }
  });

  if (!brand) {
    brand = await prisma.vehicleBrand.create({
      data: { name: brandName, factoryId: user.factoryId }
    });
  }

  await prisma.vehicleModel.create({
    data: { name, year, brandId: brand.id, factoryId: user.factoryId }
  });

  revalidateMasterPaths();
}

// Adds a model under a brand (created on the fly) and optionally records a
// generation year-range (e.g. "2018-2022" or "2019-Present") in one shot.
export async function addModelWithGeneration(brandName: string, name: string, generation?: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  let brand = await prisma.vehicleBrand.findFirst({
    where: { name: { equals: brandName, mode: "insensitive" }, factoryId: user.factoryId }
  });
  if (!brand) {
    brand = await prisma.vehicleBrand.create({ data: { name: brandName, factoryId: user.factoryId } });
  }

  const model = await prisma.vehicleModel.create({
    data: { name, brandId: brand.id, factoryId: user.factoryId }
  });

  if (generation?.trim()) {
    await prisma.vehicleGeneration.create({
      data: { modelId: model.id, name: generation.trim(), factoryId: user.factoryId }
    });
  }

  revalidateMasterPaths();
}

export async function removeModel(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("model", () => prisma.vehicleModel.delete({ where: { id, brand: { factoryId: user.factoryId } } }));
  if ("error" in result) return result;
  revalidateMasterPaths();
  return result;
}

export async function updateBrand(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleBrand.update({ where: { id, factoryId: user.factoryId }, data: { name } });
  revalidateMasterPaths();
}

export async function updateModel(id: string, name: string, year?: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleModel.update({ where: { id, brand: { factoryId: user.factoryId } }, data: { name, year } });
  revalidateMasterPaths();
}

// =======================
// Catalog (Categories, Products, Variants)
// =======================

export async function addCategory(name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.productCategory.create({ data: { name, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

export async function removeCategory(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("category", () => prisma.productCategory.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths();
  return result;
}

export async function updateCategory(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.productCategory.update({ where: { id, factoryId: user.factoryId }, data: { name } });
  revalidateMasterPaths();
}

export async function addProduct(categoryId: string, name: string, skuPrefix: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.product.create({ data: { categoryId, name, skuPrefix, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

// Products are entered by name only; the category FK is still required by the
// schema, so a default is resolved (and created) here rather than asking the
// user for something the sheet no longer shows.
export async function addProductSimple(name: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const clean = name.trim();
  if (!clean) return { error: "Enter a product name" };

  const duplicate = await prisma.product.findFirst({
    where: { factoryId: user.factoryId, name: { equals: clean, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) return { error: `"${clean}" already exists` };

  let category = await prisma.productCategory.findFirst({ where: { factoryId: user.factoryId } });
  if (!category) {
    category = await prisma.productCategory.create({ data: { factoryId: user.factoryId, name: "General" } });
  }
  await prisma.product.create({
    data: { factoryId: user.factoryId, categoryId: category.id, name: clean, skuPrefix: "SKU" },
  });
  revalidateMasterPaths();
  return { success: true };
}

export async function removeProduct(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("product", () => prisma.product.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths();
  return result;
}

export async function updateProduct(id: string, name: string, skuPrefix: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.product.update({ where: { id, factoryId: user.factoryId }, data: { name, skuPrefix } });
  revalidateMasterPaths();
}

export async function addVariant(productId: string, name: string, sku: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  // Validate product belongs to factory
  const product = await prisma.product.findUnique({ where: { id: productId, factoryId: user.factoryId } });
  if (!product) throw new Error("Product not found");
  
  await prisma.productVariant.create({ data: { productId, name, sku } });
  revalidateMasterPaths();
}

export async function removeVariant(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  // Ensure the variant belongs to a product in this factory
  const variant = await prisma.productVariant.findUnique({ where: { id }, include: { product: true } });
  if (!variant || variant.product.factoryId !== user.factoryId) return { error: "Unauthorized" };

  const result = await guardDelete("variant", () => prisma.productVariant.delete({ where: { id } }));
  if ("error" in result) return result;
  revalidateMasterPaths();
  return result;
}

export async function updateVariant(id: string, name: string, sku: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const variant = await prisma.productVariant.findUnique({ where: { id }, include: { product: true } });
  if (!variant || variant.product.factoryId !== user.factoryId) throw new Error("Unauthorized");

  await prisma.productVariant.update({ where: { id }, data: { name, sku } });
  revalidateMasterPaths();
}

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

export async function addVehicleGeneration(modelId: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleGeneration.create({ data: { modelId, name, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

export async function removeVehicleGeneration(id: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleGeneration.delete({ where: { id, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

// Per Model+Generation spec constraints for variant search. Empty arrays / null
// mean "no restriction" — the variant search offers every spec, unchanged. The
// owner curates real-world specs here so nonsense combos (e.g. "Alto 7HDR")
// never generate. Fabrics/designs stay open for all vehicles.
export async function updateGenerationSpecs(
  generationId: string,
  specs: { allowedSeatTypes: string[]; allowedHeadrests: number[]; allowedArmrests: string[] }
) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleGeneration.updateMany({
    where: { id: generationId, factoryId: user.factoryId },
    data: {
      allowedSeatTypes: specs.allowedSeatTypes,
      allowedHeadrests: specs.allowedHeadrests,
      allowedArmrests: specs.allowedArmrests,
    },
  });
  revalidateMasterPaths();
}

// Vehicles Full Hierarchy
export async function addVehicleYear(generationId: string, year: number) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleYear.create({ data: { generationId, year, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

export async function addVehicleVariant(yearId: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.vehicleVariant.create({ data: { yearId, name, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

// Warehouse Full Hierarchy
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

// Bulk Import Vehicles — batched: prefetch each level once, dedupe in memory,
// then createMany the missing rows. Was 5–10 sequential round-trips PER ROW
// (a 50-row CSV cost 250–500 queries and could hit the action timeout).
export async function bulkImportVehicles(vehicles: { brand: string, model: string, generation: string, year: number, variant: string }[]) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const factoryId = user.factoryId;
  const lower = (s: string) => (s ?? "").trim().toLowerCase();

  // Level 1: brands
  const existingBrands = await prisma.vehicleBrand.findMany({ where: { factoryId }, select: { id: true, name: true } });
  const brandByName = new Map(existingBrands.map((b) => [lower(b.name), b.id]));
  const newBrands = [...new Set(vehicles.map((v) => v.brand?.trim()).filter(Boolean))]
    .filter((name) => !brandByName.has(lower(name)));
  if (newBrands.length) {
    await prisma.vehicleBrand.createMany({ data: newBrands.map((name) => ({ name, factoryId })) });
    (await prisma.vehicleBrand.findMany({ where: { factoryId }, select: { id: true, name: true } }))
      .forEach((b) => brandByName.set(lower(b.name), b.id));
  }

  // Level 2: models (keyed by brand + model)
  const existingModels = await prisma.vehicleModel.findMany({ where: { factoryId }, select: { id: true, name: true, brandId: true } });
  const modelKey = (brandId: string, name: string) => `${brandId}::${lower(name)}`;
  const modelByKey = new Map(existingModels.map((m) => [modelKey(m.brandId, m.name), m.id]));
  const wantedModels = new Map<string, { name: string; brandId: string }>();
  for (const v of vehicles) {
    const brandId = brandByName.get(lower(v.brand));
    if (!brandId || !v.model?.trim()) continue;
    const key = modelKey(brandId, v.model);
    if (!modelByKey.has(key) && !wantedModels.has(key)) wantedModels.set(key, { name: v.model.trim(), brandId });
  }
  if (wantedModels.size) {
    await prisma.vehicleModel.createMany({ data: [...wantedModels.values()].map((m) => ({ ...m, factoryId })) });
    (await prisma.vehicleModel.findMany({ where: { factoryId }, select: { id: true, name: true, brandId: true } }))
      .forEach((m) => modelByKey.set(modelKey(m.brandId, m.name), m.id));
  }

  // Level 3: generations (keyed by model + generation)
  const existingGens = await prisma.vehicleGeneration.findMany({ where: { factoryId }, select: { id: true, name: true, modelId: true } });
  const genKey = (modelId: string, name: string) => `${modelId}::${lower(name)}`;
  const genByKey = new Map(existingGens.map((g) => [genKey(g.modelId, g.name), g.id]));
  const wantedGens = new Map<string, { name: string; modelId: string }>();
  for (const v of vehicles) {
    const brandId = brandByName.get(lower(v.brand));
    const modelId = brandId ? modelByKey.get(modelKey(brandId, v.model)) : undefined;
    if (!modelId || !v.generation?.trim()) continue;
    const key = genKey(modelId, v.generation);
    if (!genByKey.has(key) && !wantedGens.has(key)) wantedGens.set(key, { name: v.generation.trim(), modelId });
  }
  if (wantedGens.size) {
    await prisma.vehicleGeneration.createMany({ data: [...wantedGens.values()].map((g) => ({ ...g, factoryId })) });
    (await prisma.vehicleGeneration.findMany({ where: { factoryId }, select: { id: true, name: true, modelId: true } }))
      .forEach((g) => genByKey.set(genKey(g.modelId, g.name), g.id));
  }

  // Levels 4+5: years and variants
  const existingYears = await prisma.vehicleYear.findMany({ where: { factoryId }, select: { id: true, year: true, generationId: true } });
  const yearKey = (genId: string, year: number) => `${genId}::${year}`;
  const yearByKey = new Map(existingYears.map((y) => [yearKey(y.generationId, y.year), y.id]));
  const wantedYears = new Map<string, { year: number; generationId: string }>();
  for (const v of vehicles) {
    const brandId = brandByName.get(lower(v.brand));
    const modelId = brandId ? modelByKey.get(modelKey(brandId, v.model)) : undefined;
    const genId = modelId ? genByKey.get(genKey(modelId, v.generation)) : undefined;
    if (!genId || !v.year) continue;
    const key = yearKey(genId, v.year);
    if (!yearByKey.has(key) && !wantedYears.has(key)) wantedYears.set(key, { year: v.year, generationId: genId });
  }
  if (wantedYears.size) {
    await prisma.vehicleYear.createMany({ data: [...wantedYears.values()].map((y) => ({ ...y, factoryId })) });
    (await prisma.vehicleYear.findMany({ where: { factoryId }, select: { id: true, year: true, generationId: true } }))
      .forEach((y) => yearByKey.set(yearKey(y.generationId, y.year), y.id));
  }

  const existingVariants = await prisma.vehicleVariant.findMany({ where: { factoryId }, select: { name: true, yearId: true } });
  const variantKey = (yearId: string, name: string) => `${yearId}::${lower(name)}`;
  const variantSet = new Set(existingVariants.map((x) => variantKey(x.yearId, x.name)));
  const wantedVariants = new Map<string, { name: string; yearId: string }>();
  for (const v of vehicles) {
    const brandId = brandByName.get(lower(v.brand));
    const modelId = brandId ? modelByKey.get(modelKey(brandId, v.model)) : undefined;
    const genId = modelId ? genByKey.get(genKey(modelId, v.generation)) : undefined;
    const yearId = genId ? yearByKey.get(yearKey(genId, v.year)) : undefined;
    if (!yearId || !v.variant?.trim()) continue;
    const key = variantKey(yearId, v.variant);
    if (!variantSet.has(key) && !wantedVariants.has(key)) wantedVariants.set(key, { name: v.variant.trim(), yearId });
  }
  if (wantedVariants.size) {
    await prisma.vehicleVariant.createMany({ data: [...wantedVariants.values()].map((x) => ({ ...x, factoryId })) });
  }

  revalidateMasterPaths();
}

// Import the Vehicles (Variant Rules) sheet: create brand/model/generation as
// needed, then set each generation's allowed specs (bench type, headrests,
// armrest). Columns: Brand, Model, Generation, Seat Types, Headrests, Armrests.
// Blank spec cells = no restriction (every spec allowed for that generation).
export async function importVehicleRules(
  rows: Array<Record<string, string>>
) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const factoryId = user.factoryId;
  const lower = (s: string) => (s ?? "").trim().toLowerCase();
  const get = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return "";
  };
  const splitList = (s: string) => s.split(/[|,]/).map((x) => x.trim()).filter(Boolean);
  const parseSeat = (s: string): string | null => {
    const t = lower(s);
    if (["sb", "single", "single back"].includes(t)) return "Single Back";
    if (["db", "double", "double back"].includes(t)) return "Double Back";
    return null;
  };
  const parseArm = (s: string): string | null => {
    const t = lower(s);
    if (t.startsWith("no")) return "No Arm";
    if (["arm", "armrest", "yes", "y", "true"].includes(t)) return "Arm";
    return null;
  };

  const parsed = rows
    .map((r) => ({
      brand: get(r, "Brand"),
      model: get(r, "Model", "Vehicle Model"),
      generation: get(r, "Generation") || "Standard",
      seatTypes: splitList(get(r, "Seat Types", "SeatTypes", "Bench")).map(parseSeat).filter(Boolean) as string[],
      headrests: splitList(get(r, "Headrests", "Headrest", "HDR")).map((h) => parseInt(h, 10)).filter((n) => Number.isFinite(n)),
      armrests: splitList(get(r, "Armrests", "Armrest", "Arm")).map(parseArm).filter(Boolean) as string[],
    }))
    .filter((v) => v.brand && v.model);
  if (parsed.length === 0) throw new Error("No valid rows found");

  // Ensure brand/model/generation exist (mirrors bulkImportVehicles levels 1-3).
  const existingBrands = await prisma.vehicleBrand.findMany({ where: { factoryId }, select: { id: true, name: true } });
  const brandByName = new Map(existingBrands.map((b) => [lower(b.name), b.id]));
  const newBrands = [...new Set(parsed.map((v) => v.brand))].filter((n) => !brandByName.has(lower(n)));
  if (newBrands.length) {
    await prisma.vehicleBrand.createMany({ data: newBrands.map((name) => ({ name, factoryId })) });
    (await prisma.vehicleBrand.findMany({ where: { factoryId }, select: { id: true, name: true } }))
      .forEach((b) => brandByName.set(lower(b.name), b.id));
  }

  const existingModels = await prisma.vehicleModel.findMany({ where: { factoryId }, select: { id: true, name: true, brandId: true } });
  const modelKey = (brandId: string, name: string) => `${brandId}::${lower(name)}`;
  const modelByKey = new Map(existingModels.map((m) => [modelKey(m.brandId, m.name), m.id]));
  const wantedModels = new Map<string, { name: string; brandId: string }>();
  for (const v of parsed) {
    const brandId = brandByName.get(lower(v.brand));
    if (!brandId) continue;
    const key = modelKey(brandId, v.model);
    if (!modelByKey.has(key) && !wantedModels.has(key)) wantedModels.set(key, { name: v.model, brandId });
  }
  if (wantedModels.size) {
    await prisma.vehicleModel.createMany({ data: [...wantedModels.values()].map((m) => ({ ...m, factoryId })) });
    (await prisma.vehicleModel.findMany({ where: { factoryId }, select: { id: true, name: true, brandId: true } }))
      .forEach((m) => modelByKey.set(modelKey(m.brandId, m.name), m.id));
  }

  const existingGens = await prisma.vehicleGeneration.findMany({ where: { factoryId }, select: { id: true, name: true, modelId: true } });
  const genKey = (modelId: string, name: string) => `${modelId}::${lower(name)}`;
  const genByKey = new Map(existingGens.map((g) => [genKey(g.modelId, g.name), g.id]));
  const wantedGens = new Map<string, { name: string; modelId: string }>();
  for (const v of parsed) {
    const brandId = brandByName.get(lower(v.brand));
    const modelId = brandId ? modelByKey.get(modelKey(brandId, v.model)) : undefined;
    if (!modelId) continue;
    const key = genKey(modelId, v.generation);
    if (!genByKey.has(key) && !wantedGens.has(key)) wantedGens.set(key, { name: v.generation, modelId });
  }
  if (wantedGens.size) {
    await prisma.vehicleGeneration.createMany({ data: [...wantedGens.values()].map((g) => ({ ...g, factoryId })) });
    (await prisma.vehicleGeneration.findMany({ where: { factoryId }, select: { id: true, name: true, modelId: true } }))
      .forEach((g) => genByKey.set(genKey(g.modelId, g.name), g.id));
  }

  // Set the allowed specs per generation.
  let imported = 0;
  for (const v of parsed) {
    const brandId = brandByName.get(lower(v.brand));
    const modelId = brandId ? modelByKey.get(modelKey(brandId, v.model)) : undefined;
    const genId = modelId ? genByKey.get(genKey(modelId, v.generation)) : undefined;
    if (!genId) continue;
    await prisma.vehicleGeneration.update({
      where: { id: genId },
      data: {
        allowedSeatTypes: [...new Set(v.seatTypes)],
        allowedHeadrests: [...new Set(v.headrests)],
        allowedArmrests: [...new Set(v.armrests)],
      },
    });
    imported++;
  }

  revalidateMasterPaths();
  return { imported };
}

// =======================
// Designs & Colors (order studio catalog)
// =======================

// Designs are grouped by the product they belong to, chosen from the Products
// sheet. The family (ULTRA, QUILTS...) stays a separate free-text field.
export async function addDesign(productName: string, name: string, family?: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const clean = name.trim();
  if (!clean) return { error: "Enter a design name" };

  const wanted = productName.trim();
  const product = wanted
    ? await prisma.product.findFirst({
        where: { factoryId: user.factoryId, name: { equals: wanted, mode: "insensitive" } },
        select: { id: true },
      })
    : null;
  if (wanted && !product) {
    return { error: `No product called "${wanted}". Add it on the Products sheet first.` };
  }

  await prisma.design.create({
    data: { factoryId: user.factoryId, name: clean, productId: product?.id ?? null, category: family?.trim() || null },
  });
  revalidateMasterPaths();
  return { success: true };
}

// Moves a design under a different product (or unassigns it) — the sheet-level
// "assign product" control, symmetric with the spec-preset grouping.
export async function assignDesignProduct(id: string, productName: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const wanted = productName.trim();
  let productId: string | null = null;
  if (wanted) {
    const product = await prisma.product.findFirst({
      where: { factoryId: user.factoryId, name: { equals: wanted, mode: "insensitive" } },
      select: { id: true },
    });
    if (!product) return { error: `No product called "${wanted}". Add it on the Products sheet first.` };
    productId = product.id;
  }
  await prisma.design.update({ where: { id, factoryId: user.factoryId }, data: { productId } });
  revalidateMasterPaths();
  return { success: true };
}

// One-shot spec-field creation from the sheet's Add Row: resolves (or creates)
// the product type named after the product, then appends the field.
export async function addSpecField(productName: string, fieldName: string, kind: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const typeName = productName.trim();
  const field = fieldName.trim();
  if (!typeName) return { error: "Pick the product this spec field belongs to" };
  if (!field) return { error: "Enter a spec field name" };

  let ptype = await prisma.productType.findFirst({
    where: { factoryId: user.factoryId, name: { equals: typeName, mode: "insensitive" } },
    include: { fields: true },
  });
  if (!ptype) {
    ptype = await prisma.productType.create({
      data: { factoryId: user.factoryId, name: typeName },
      include: { fields: true },
    });
  }
  if (ptype.fields.some((f) => f.name.toLowerCase() === field.toLowerCase())) {
    return { error: `"${field}" already exists on ${ptype.name}` };
  }
  const cleanKind = ["TEXT", "SELECT", "NUMBER", "MEASUREMENT", "TOGGLE", "BUTTONS", "CHECKBOX"].includes(kind.toUpperCase())
    ? kind.toUpperCase() : "TEXT";
  await prisma.productField.create({
    data: {
      productTypeId: ptype.id,
      name: field,
      type: cleanKind as any,
      sortOrder: ptype.fields.length + 1,
    },
  });
  revalidateMasterPaths();
  return { success: true };
}

export async function updateDesign(
  id: string,
  data: { name?: string; category?: string; productId?: string | null; fabricConsumption?: number | null; cadFileUrl?: string | null }
) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.design.update({ where: { id, factoryId: user.factoryId }, data });
  revalidateMasterPaths();
}

export async function removeDesign(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("design", () => prisma.design.delete({ where: { id, factoryId: user.factoryId } }));
  if ("error" in result) return result;
  revalidateMasterPaths();
  return result;
}

// Reference photos attached to a design so workers/QC always see the correct
// visual while manufacturing. Stored as a URL list on the Design record.
export async function addDesignImage(id: string, url: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  if (!url?.trim()) throw new Error("No image URL");
  const design = await prisma.design.findFirst({ where: { id, factoryId: user.factoryId }, select: { imageUrls: true } });
  if (!design) throw new Error("Design not found");
  await prisma.design.update({
    where: { id },
    data: { imageUrls: Array.from(new Set([...design.imageUrls, url.trim()])) },
  });
  revalidateMasterPaths();
}

export async function removeDesignImage(id: string, url: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const design = await prisma.design.findFirst({ where: { id, factoryId: user.factoryId }, select: { imageUrls: true } });
  if (!design) throw new Error("Design not found");
  await prisma.design.update({
    where: { id },
    data: { imageUrls: design.imageUrls.filter((u) => u !== url) },
  });
  revalidateMasterPaths();
}

export async function addColor(name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.color.create({ data: { factoryId: user.factoryId, name } });
  revalidateMasterPaths();
}

export async function updateColor(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.color.update({ where: { id, factoryId: user.factoryId }, data: { name } });
  revalidateMasterPaths();
}

export async function removeColor(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const result = await guardDelete("colour", () => prisma.color.delete({ where: { id, factoryId: user.factoryId } }));
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
    sheet === "designs" ? prisma.design.findMany({ where: { factoryId }, select: { name: true } }) : Promise.resolve([]),
    sheet === "colors" ? prisma.color.findMany({ where: { factoryId }, select: { name: true } }) : Promise.resolve([]),
    sheet === "materials" ? prisma.itemMaster.findMany({ where: { factoryId }, select: { name: true, sku: true } }) : Promise.resolve([]),
    sheet === "suppliers" ? prisma.supplier.findMany({ where: { factoryId }, select: { name: true } }) : Promise.resolve([]),
    (sheet === "products" || sheet === "designs") ? prisma.product.findMany({ where: { factoryId }, select: { id: true, name: true } }) : Promise.resolve([]),
    sheet === "materials" ? prisma.materialCategory.findMany({ where: { factoryId }, select: { id: true, name: true } }) : Promise.resolve([]),
    sheet === "products" ? prisma.productCategory.findMany({ where: { factoryId }, select: { id: true, name: true } }) : Promise.resolve([]),
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
      if (sheet === "designs") {
        const name = get("Design", "Name", "design_name");
        if (!name) continue;
        const category = get("Family", "Category");
        const productName = get("Product");
        const consumption = parseFloat(get("Fabric Consumption (m/unit)", "Fabric Consumption", "fabricConsumption"));
        const cadFileUrl = get("CAD File URL", "cadFileUrl");
        if (!designSet.has(lower(name))) {
          await prisma.design.create({
            data: {
              factoryId,
              name,
              productId: productName ? productByName.get(lower(productName)) ?? null : null,
              category: category || null,
              fabricConsumption: Number.isFinite(consumption) && consumption > 0 ? consumption : null,
              cadFileUrl: cadFileUrl || null,
            },
          });
          designSet.add(lower(name));
          imported++;
        }
      } else if (sheet === "colors") {
        const name = get("Color", "Name");
        if (!name) continue;
        if (!colorSet.has(lower(name))) { await prisma.color.create({ data: { factoryId, name } }); colorSet.add(lower(name)); imported++; }
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
      } else if (sheet === "products") {
        const name = get("Product", "Name");
        if (!name) continue;
        const catName = get("Category") || "General";
        let categoryId = productCatByName.get(lower(catName));
        if (!categoryId) {
          const cat = await prisma.productCategory.create({ data: { factoryId, name: catName } });
          categoryId = cat.id;
          productCatByName.set(lower(catName), cat.id);
        }
        if (!productByName.has(lower(name))) {
          const created = await prisma.product.create({ data: { factoryId, categoryId, name, skuPrefix: get("SKU Prefix", "skuPrefix") || null } });
          productByName.set(lower(name), created.id);
          imported++;
        }
      } else if (sheet === "combinations") {
        const brand = get("Brand");
        const model = get("Model", "Vehicle Model");
        if (!brand || !model) continue;
        const generation = get("Generation") || null;
        const category = get("Category") || null;
        const product = get("Product") || null;
        const seatType = normSeat(get("Spec", "Seat Type", "SeatType", "Back"));
        const headrests = parseInt(get("Headrests", "Headrest", "HDR"), 10) || 4;
        const armrest = /^(y|yes|true|1|armrest)/i.test(get("Armrest"));
        const exists = await prisma.productCombination.findFirst({
          where: { factoryId, brand, model, generation, category, product, seatType, headrests, armrest },
        });
        if (!exists) {
          await prisma.productCombination.create({
            data: { factoryId, brand, model, generation, category, product, seatType, headrests, armrest },
          });
          imported++;
        }
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

export async function addProductType(name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.productType.create({ data: { factoryId: user.factoryId, name } });
  revalidateMasterPaths();
}

export async function updateProductType(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.productType.update({ where: { id, factoryId: user.factoryId }, data: { name } });
  revalidateMasterPaths();
}

export async function removeProductType(id: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.productType.delete({ where: { id, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

export async function addProductField(productTypeId: string, data: { name: string; type: string; options?: string[]; isRequired?: boolean }) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const type = await prisma.productType.findFirst({ where: { id: productTypeId, factoryId: user.factoryId }, include: { fields: true } });
  if (!type) throw new Error("Product type not found");
  await prisma.productField.create({
    data: {
      productTypeId,
      name: data.name,
      type: data.type as any,
      options: data.options ?? undefined,
      isRequired: data.isRequired ?? false,
      sortOrder: type.fields.length + 1,
    },
  });
  revalidateMasterPaths();
}

export async function updateProductField(id: string, data: { name?: string; type?: string; options?: string[]; isRequired?: boolean }) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const field = await prisma.productField.findFirst({ where: { id }, include: { productType: true } });
  if (!field || field.productType.factoryId !== user.factoryId) throw new Error("Unauthorized");
  await prisma.productField.update({
    where: { id },
    data: { name: data.name, type: data.type as any, options: data.options ?? undefined, isRequired: data.isRequired },
  });
  revalidateMasterPaths();
}

export async function removeProductField(id: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const field = await prisma.productField.findFirst({ where: { id }, include: { productType: true } });
  if (!field || field.productType.factoryId !== user.factoryId) throw new Error("Unauthorized");
  await prisma.productField.delete({ where: { id } });
  revalidateMasterPaths();
}

// =======================
// Product Combinations (the valid Carxen configuration catalog)
// =======================

export type CombinationInput = {
  brand: string;
  model: string;
  generation?: string;
  category?: string;
  product?: string;
  seatType?: string; // SB | DB
  headrests?: number;
  armrest?: boolean;
  active?: boolean;
};

function normSeat(v?: string) {
  const s = (v || "").toUpperCase().trim();
  if (s === "SB" || s.startsWith("SINGLE")) return "SB";
  return "DB";
}

export async function getCombinations() {
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.productCombination.findMany({
    where: { factoryId: user.factoryId },
    orderBy: [{ brand: "asc" }, { model: "asc" }, { generation: "asc" }],
  });
}

export async function addCombination(data: CombinationInput) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  const brand = data.brand?.trim();
  const model = data.model?.trim();
  if (!brand || !model) throw new Error("Brand and Model are required");
  await prisma.productCombination.create({
    data: {
      factoryId: user.factoryId,
      brand,
      model,
      generation: data.generation?.trim() || null,
      category: data.category?.trim() || null,
      product: data.product?.trim() || null,
      seatType: normSeat(data.seatType),
      headrests: Number(data.headrests) || 4,
      armrest: !!data.armrest,
      active: data.active ?? true,
    },
  });
  revalidateMasterPaths();
}

export async function updateCombination(id: string, data: Partial<CombinationInput>) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.productCombination.update({
    where: { id, factoryId: user.factoryId },
    data: {
      brand: data.brand?.trim(),
      model: data.model?.trim(),
      generation: data.generation?.trim() || null,
      category: data.category?.trim() || null,
      product: data.product?.trim() || null,
      seatType: data.seatType ? normSeat(data.seatType) : undefined,
      headrests: data.headrests != null ? Number(data.headrests) || 4 : undefined,
      armrest: data.armrest,
      active: data.active,
    },
  });
  revalidateMasterPaths();
}

export async function removeCombination(id: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.productCombination.delete({ where: { id, factoryId: user.factoryId } });
  revalidateMasterPaths();
}

// =======================
// Spec BOMs (design- and fabric-level bills of material)
// =======================

export async function saveSpecBOM(refType: "DESIGN" | "FABRIC", refId: string, items: Array<{ itemId: string; quantity: number; wastePercent: number }>) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await prisma.specBOM.upsert({
    where: { refType_refId: { refType, refId } },
    update: { items },
    create: { factoryId: user.factoryId, refType, refId, items },
  });
  revalidateMasterPaths();
}

export async function getSpecBOMs() {
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.specBOM.findMany({ where: { factoryId: user.factoryId } });
}

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
      if (sheet === "variants") {
        const productName = get(row, "Product");
        const name = get(row, "Variant", "Name");
        if (!productName || !name) continue;
        const product = await prisma.product.findFirst({ where: { factoryId, name: { equals: productName, mode: "insensitive" } } });
        if (!product) continue;
        const exists = await prisma.productVariant.findFirst({ where: { productId: product.id, name } });
        if (!exists) {
          await prisma.productVariant.create({
            data: { productId: product.id, name, sku: get(row, "SKU") || `VAR-${Date.now().toString(36).toUpperCase()}-${imported}` },
          });
          imported++;
        }
      } else if (sheet === "locations") {
        const name = get(row, "Location", "Name");
        if (!name) continue;
        const kind = get(row, "Kind").toUpperCase() === "STORE" ? "STORE" : "WAREHOUSE";
        const exists = await prisma.warehouse.findFirst({ where: { factoryId, name } });
        if (!exists) { await prisma.warehouse.create({ data: { factoryId, name, kind } }); imported++; }
      } else if (sheet === "productTypes") {
        const typeName = get(row, "Product Type", "Type");
        const fieldName = get(row, "Spec Field", "Field");
        if (!typeName) continue;
        let ptype = await prisma.productType.findFirst({ where: { factoryId, name: typeName }, include: { fields: true } });
        if (!ptype) {
          ptype = await prisma.productType.create({ data: { factoryId, name: typeName }, include: { fields: true } });
          imported++;
        }
        if (fieldName && !ptype.fields.some((f) => f.name === fieldName)) {
          const kindRaw = get(row, "Kind").toUpperCase();
          const kind = ["TEXT", "SELECT", "NUMBER", "MEASUREMENT", "TOGGLE", "BUTTONS", "CHECKBOX"].includes(kindRaw) ? kindRaw : "TEXT";
          const options = get(row, "Options").split("|").map((o) => o.trim()).filter(Boolean);
          await prisma.productField.create({
            data: {
              productTypeId: ptype.id,
              name: fieldName,
              type: kind as any,
              options: options.length ? options : undefined,
              sortOrder: ptype.fields.length + 1,
            },
          });
          imported++;
        }
      } else if (sheet === "templates") {
        const templateName = get(row, "Template");
        const sectionTitle = get(row, "Section");
        const checkpointName = get(row, "Checkpoint");
        if (!templateName) continue;
        let template = await prisma.qCTemplate.findFirst({ where: { factoryId, name: templateName }, });
        if (!template) {
          // Don't blanket-mark imported templates "latest" — only the very first
          // template a factory has should be, so QC's isLatest fallback stays
          // unambiguous.
          const anyTemplate = await prisma.qCTemplate.findFirst({ where: { factoryId }, select: { id: true } });
          template = await prisma.qCTemplate.create({
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
