"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
  X, Search, Download, Plus, Check, Loader2, Database, AlertCircle, FileSpreadsheet, Trash2,
  ChevronDown, ChevronRight, CheckSquare, Edit3
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { searchVariants, listVariantBases, countVariants, designLabel } from "@/lib/variant-descriptor";
import {
  addBrand, addColor, addMaterial, addModel, addModelWithGeneration,
  removeBrand, removeColor, removeMaterial, removeModel,
  updateBrand, updateColor, updateMaterial, updateModel,
  addVehicleGeneration,
  addDesign, updateDesign, removeDesign, assignDesignProduct, addSpecField,
  addCategory, updateCategory, removeCategory,
  addProduct, updateProduct, removeProduct,
  addVariant, updateVariant, removeVariant,
  addSupplier, updateSupplier, removeSupplier,
  addWarehouse, updateWarehouse, removeWarehouse,
  addMaterialCategory,
  addProductType, updateProductType, removeProductType,
  addProductField, updateProductField, removeProductField,
  saveSpecBOM,
  addDesignImage, removeDesignImage,
  addCatalogItem,
  addProductSimple,
  bulkImportVehicles, importMasterCsv, importMasterCsvExtra, importVehicleRules,
} from "@/server/actions/masterData";
import { uploadStorageImage } from "@/server/actions/storage";
import { createStoragePath } from "@/lib/storage/paths";
import Papa from "papaparse";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { VariantRulesTree } from "@/components/settings/VariantRulesTree";
import { ItemsTree } from "@/components/settings/ItemsTree";
import { CustomersTree } from "@/components/settings/CustomersTree";
import { updateCheckpointField, deleteCheckpointAction, addSectionAction, addCheckpointAction, deleteSectionAction, deleteQCTemplate } from "@/server/actions/qc-templates";

type MasterSheetViewProps = {
  isOpen: boolean;
  onClose: () => void;
  asPage?: boolean;
  masterData: {
    brands: any[];
    models: any[];
    materials: any[];
    colors: any[];
    templates?: any[];
    designs?: any[];
    productCategories?: any[];
    products?: any[];
    productVariants?: any[];
    suppliers?: any[];
    warehouses?: any[];
    materialCategories?: any[];
    productTypes?: any[];
    specBoms?: any[];
  };
};

type ActiveSheet = "vehicles" | "designs" | "fabrics" | "colors" | "materials" | "items" | "products" | "variants" | "productTypes" | "suppliers" | "locations" | "templates" | "variantRules" | "customers";

type SelectedCell = {
  rowIndex: number;
  colIndex: number;
};

type ColDefinition = {
  label: string;
  field: string;
  letter: string;
  type: string;
};

const SHEET_IDS: ActiveSheet[] = ["vehicles", "designs", "fabrics", "colors", "materials", "items", "products", "variants", "productTypes", "suppliers", "locations", "templates", "variantRules", "customers"];

export function MasterSheetView({ isOpen, onClose, masterData, asPage = false }: MasterSheetViewProps) {
  const searchParams = useSearchParams();
  const sheetParam = searchParams.get("sheet") as ActiveSheet | null;
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(
    sheetParam && SHEET_IDS.includes(sheetParam) ? sheetParam : "variantRules"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string; type: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newGenFromYear, setNewGenFromYear] = useState("");
  const [newFamilyText, setNewFamilyText] = useState("");
  const [newFieldKind, setNewFieldKind] = useState("BUTTONS");
  const [newGenToYear, setNewGenToYear] = useState("");
  const [brandInputText, setBrandInputText] = useState("");
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: string, name: string } | null>(null);

  // Outline/Hierarchy states for Templates
  const [collapsedTemplates, setCollapsedTemplates] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Active grid cell state
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  // Last saved timestamp
  const [lastSaved, setLastSaved] = useState<string>("Just now");

  const tableRef = useRef<HTMLTableElement>(null);

  const router = useRouter();
  const {
    brands = [], models = [], materials = [], colors = [], templates = [],
    designs = [], productCategories = [], products = [], productVariants = [],
    suppliers = [], warehouses = [], materialCategories = [], productTypes = [], specBoms = [],
  } = masterData;
  const specBomMap = useMemo(() => new Map(specBoms.map((b: any) => [`${b.refType}:${b.refId}`, b])), [specBoms]);
  const [bomEditor, setBomEditor] = useState<{ refType: "DESIGN" | "FABRIC"; refId: string; name: string } | null>(null);
  const [imageEditor, setImageEditor] = useState<{ id: string; name: string; images: string[] } | null>(null);
  // Optimistic cell values so edits show instantly (server refresh catches up)
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Columns per active sheet
  const columns: Record<ActiveSheet, ColDefinition[]> = useMemo(() => ({
    vehicles: [
      { label: "Brand", field: "brandName", letter: "A", type: "brand" },
      { label: "Model Variant", field: "modelName", letter: "B", type: "model" },
      { label: "Generations (year ranges)", field: "generations", letter: "C", type: "generation" }
    ],
    designs: [
      { label: "Design Name", field: "name", letter: "A", type: "design" },
      { label: "Family", field: "category", letter: "B", type: "design" },
      // CAD master data: the standard consumption drives automatic material
      // calculation, so production never types material quantities by hand.
      { label: "Fabric Consumption (m/unit)", field: "fabricConsumption", letter: "C", type: "design" },
      { label: "CAD File URL", field: "cadFileUrl", letter: "D", type: "design" }
    ],
    fabrics: [
      { label: "Fabric", field: "name", letter: "A", type: "fabricRow" },
      { label: "SKU", field: "sku", letter: "B", type: "fabricRow" },
      { label: "Unit", field: "unit", letter: "C", type: "fabricRow" }
    ],
    materials: [
      { label: "Material Name", field: "name", letter: "A", type: "material" },
      { label: "Category", field: "categoryName", letter: "B", type: "readonly" },
      { label: "SKU", field: "sku", letter: "C", type: "materialSku" },
      { label: "Unit", field: "unit", letter: "D", type: "materialUnit" }
    ],
    products: [
      { label: "Product", field: "name", letter: "A", type: "product" },
      { label: "Variants", field: "variantCount", letter: "B", type: "readonly" }
    ],
    // The variant sheet is the cartesian product of the master-data lists. Every
    // column is derived, so the whole sheet is read-only: you change what exists
    // by editing vehicles, products, fabrics and designs, not by editing rows here.
    variants: [
      { label: "Brand", field: "brand", letter: "A", type: "readonly" },
      { label: "Model", field: "model", letter: "B", type: "readonly" },
      { label: "Generation", field: "generation", letter: "C", type: "readonly" },
      { label: "Product", field: "product", letter: "D", type: "readonly" },
      { label: "Back", field: "seatTypeLabel", letter: "E", type: "readonly" },
      { label: "Headrests", field: "headrestsLabel", letter: "F", type: "readonly" },
      { label: "Armrest", field: "armrestLabel", letter: "G", type: "readonly" },
      { label: "Fabric", field: "fabric", letter: "H", type: "readonly" },
      { label: "Design", field: "design", letter: "I", type: "readonly" }
    ],
    productTypes: [
      { label: "Product Type", field: "name", letter: "A", type: "productType" },
      { label: "Spec Field", field: "fieldName", letter: "B", type: "ptypeFieldName" },
      { label: "Kind", field: "fieldType", letter: "C", type: "ptypeFieldKind" },
      { label: "Options", field: "fieldOptions", letter: "D", type: "ptypeFieldOptions" }
    ],
    suppliers: [
      { label: "Supplier", field: "name", letter: "A", type: "supplier" }
    ],
    locations: [
      { label: "Location", field: "name", letter: "A", type: "location" },
      { label: "Kind", field: "kind", letter: "B", type: "locationKind" }
    ],
    colors: [
      { label: "Color Accent", field: "name", letter: "A", type: "color" }
    ],
    templates: [
      { label: "Template Name", field: "templateName", letter: "A", type: "checkpoint" },
      { label: "Section Title", field: "sectionTitle", letter: "B", type: "checkpoint" },
      { label: "Checkpoint Name", field: "checkpointName", letter: "C", type: "checkpoint" },
      { label: "Instructions", field: "instructions", letter: "D", type: "checkpoint" },
      { label: "Req. Image", field: "requireImage", letter: "E", type: "checkpoint" },
      { label: "Req. Remarks", field: "requireRemarks", letter: "F", type: "checkpoint" }
    ],
    // Variant Rules, Items & Customers render their own tree editors, not the grid.
    variantRules: [],
    items: [],
    customers: []
  }), []);

  const activeCols = columns[activeSheet];

  // Vehicles flattened data (generations shown as year-range names)
  const vehicleRows = useMemo(() => {
    return models.map((m: any) => ({
      id: m.id,
      brandId: m.brandId,
      brandName: m.brand?.name || "Other",
      modelName: m.name,
      generations: (m.generations ?? []).map((g: any) => g.name).join(", ") || "—",
      type: "row"
    }));
  }, [models]);

  // Designs are grouped under the product they belong to, mirroring how the
  // spec-preset sheet groups its fields. Designs with no product yet fall into
  // a trailing "Unassigned" group so they stay visible and fixable.
  const designRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const matches = (d: any) =>
      !q || d.name.toLowerCase().includes(q) || (d.category ?? "").toLowerCase().includes(q);

    const byProduct = new Map<string, any[]>();
    const unassigned: any[] = [];
    for (const d of designs) {
      if (!matches(d)) continue;
      const row = {
        ...d,
        category: d.category ?? "",
        fabricConsumption: d.fabricConsumption ?? "",
        cadFileUrl: d.cadFileUrl ?? "",
        type: "row",
      };
      const productName = products.find((pr: any) => pr.id === d.productId)?.name;
      if (!productName) unassigned.push(row);
      else {
        if (!byProduct.has(productName)) byProduct.set(productName, []);
        byProduct.get(productName)!.push(row);
      }
    }

    const rows: any[] = [];
    for (const productName of [...byProduct.keys()].sort()) {
      rows.push({ id: `design-group-${productName}`, type: "ptype_header", name: productName });
      rows.push(...byProduct.get(productName)!);
    }
    if (unassigned.length > 0) {
      rows.push({ id: "design-group-unassigned", type: "ptype_header", name: "Unassigned" });
      rows.push(...unassigned);
    }
    return rows;
  }, [designs, products, searchQuery]);

  const fabricRows = useMemo(() =>
    materials
      .filter((m: any) => (m.category?.name ?? "").toLowerCase() === "fabric")
      .map((m: any) => ({ ...m, unit: m.unit ?? m.defaultUOM ?? "", type: "row" }))
      .filter((m: any) => m.name.toLowerCase().includes(searchQuery.toLowerCase())),
  [materials, searchQuery]);

  const materialRows = useMemo(() =>
    materials
      .filter((m: any) => (m.category?.name ?? "").toLowerCase() !== "fabric")
      .map((m: any) => ({ ...m, categoryName: m.category?.name ?? "—", unit: m.unit ?? m.defaultUOM ?? "", type: "row" }))
      .filter((m: any) => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.sku ?? "").toLowerCase().includes(searchQuery.toLowerCase())),
  [materials, searchQuery]);

  const productRows = useMemo(() =>
    products.map((p: any) => ({
      ...p,
      categoryName: p.category?.name ?? productCategories.find((c: any) => c.id === p.categoryId)?.name ?? "—",
      variantCount: String(productVariants.filter((v: any) => v.productId === p.id).length),
      type: "row",
    })).filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
  [products, productCategories, productVariants, searchQuery]);

  // The variant sheet is the cartesian product of the master data, generated on
  // demand. Storing it is not an option — at real catalogue size it runs to tens
  // of millions of rows — so the sheet renders a searched slice of the generated
  // set. Editing happens on the source sheets (vehicles, products, fabrics,
  // designs); every column here is derived.
  const variantSources = useMemo(() => ({
    vehicles: models.flatMap((m: any) =>
      ((m.vehicleGenerations ?? m.generations ?? []) as any[]).map((g: any) => ({
        brand: m.brand?.name ?? "",
        model: m.name,
        generation: g.name,
      }))
    ),
    products: products.map((pr: any) => ({ name: pr.name, category: pr.category?.name ?? null })),
    fabrics: materials.map((mat: any) => mat.name),
    designs: designs.map((d: any) => designLabel(d.name, d.category)),
  }), [models, products, materials, designs]);

  const variantTotal = useMemo(() => countVariants(variantSources), [variantSources]);

  const variantRows = useMemo(() =>
    // No query yet: show the vehicle anchor rows so the sheet isn't blank (this
    // is what surfaces the vehicles as variants). Typing switches to full search.
    (searchQuery.trim() ? searchVariants(variantSources, searchQuery, 300) : listVariantBases(variantSources, 300))
      .map(({ label, descriptor }) => ({
      id: label,
      type: "row",
      brand: descriptor.brand,
      model: descriptor.model,
      generation: descriptor.generation,
      product: descriptor.product,
      seatTypeLabel: descriptor.seatType ?? "—",
      headrestsLabel: descriptor.headrests ? `${descriptor.headrests}HDR` : "—",
      armrestLabel: descriptor.armrest ? "Arm" : "—",
      fabric: descriptor.fabric,
      design: descriptor.design,
      name: label,
    })),
  [variantSources, searchQuery]);

  const productTypeRows = useMemo(() => {
    const rows: any[] = [];
    for (const pt of productTypes) {
      rows.push({ id: pt.id, type: "ptype_header", name: pt.name });
      for (const f of (pt.fields ?? [])) {
        rows.push({
          id: f.id,
          type: "row",
          rowKind: "ptypeField",
          productTypeId: pt.id,
          name: "",
          fieldName: f.name,
          fieldType: f.type,
          fieldOptions: Array.isArray(f.options) ? f.options.join(" | ") : "",
        });
      }
    }
    if (searchQuery) {
      return rows.filter((r) => r.type === "ptype_header"
        ? r.name.toLowerCase().includes(searchQuery.toLowerCase())
        : (r.fieldName ?? "").toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return rows;
  }, [productTypes, searchQuery]);

  const supplierRows = useMemo(() =>
    suppliers.map((sp: any) => ({ ...sp, type: "row" }))
      .filter((sp: any) => sp.name.toLowerCase().includes(searchQuery.toLowerCase())),
  [suppliers, searchQuery]);

  const locationRows = useMemo(() =>
    warehouses.map((w: any) => ({ ...w, kind: w.kind ?? "WAREHOUSE", type: "row" }))
      .filter((w: any) => w.name.toLowerCase().includes(searchQuery.toLowerCase())),
  [warehouses, searchQuery]);

  // Collapsible hierarchical templates data builder
  const templateRows = useMemo(() => {
    const rows: any[] = [];
    for (const tpl of templates) {
      const isTplCollapsed = collapsedTemplates[tpl.id];
      rows.push({
        id: tpl.id,
        type: "template_header",
        templateName: tpl.name,
        isCollapsed: isTplCollapsed
      });

      if (isTplCollapsed) continue;

      for (const sec of tpl.sections) {
        const isSecCollapsed = collapsedSections[sec.id];
        rows.push({
          id: sec.id,
          type: "section_header",
          templateName: tpl.name,
          sectionTitle: sec.title,
          isCollapsed: isSecCollapsed
        });

        if (isSecCollapsed) continue;

        for (const cp of sec.checkpoints) {
          rows.push({
            id: cp.id,
            type: "checkpoint_row",
            templateId: tpl.id,
            templateName: tpl.name,
            sectionId: sec.id,
            sectionTitle: sec.title,
            checkpointId: cp.id,
            checkpointName: cp.name,
            instructions: cp.instructions,
            requireImage: cp.requireImage ? "Yes" : "No",
            requireRemarks: cp.requireRemarks ? "Yes" : "No"
          });
        }
      }
    }
    return rows;
  }, [templates, collapsedTemplates, collapsedSections]);

  // Row filtering by search query
  const filteredVehicles = useMemo(() => {
    return vehicleRows.filter(r =>
      r.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.generations.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vehicleRows, searchQuery]);

  const filteredMaterials = useMemo(() => {
    return materials.map(m => ({ ...m, type: "row" })).filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [materials, searchQuery]);

  const filteredColors = useMemo(() => {
    return colors.map(c => ({ ...c, type: "row" })).filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [colors, searchQuery]);

  const filteredTemplates = useMemo(() => {
    // Keep header rows if query is empty, otherwise filter by text matches
    if (!searchQuery) return templateRows;
    return templateRows.filter(r => 
      r.type !== "checkpoint_row" ||
      r.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sectionTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.checkpointName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.instructions?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templateRows, searchQuery]);

  const currentRows = useMemo(() => {
    switch (activeSheet) {
      case "vehicles": return filteredVehicles;
      case "designs": return designRows;
      case "fabrics": return fabricRows;
      case "materials": return materialRows;
      case "products": return productRows;
      case "variants": return variantRows;
      case "productTypes": return productTypeRows;
      case "suppliers": return supplierRows;
      case "locations": return locationRows;
      case "colors": return filteredColors;
      default: return filteredTemplates;
    }
  }, [activeSheet, filteredVehicles, designRows, fabricRows, materialRows, productRows, variantRows, productTypeRows, supplierRows, locationRows, filteredColors, filteredTemplates]);

  // Selected cell value for formula bar
  const formulaValue = useMemo(() => {
    if (!selectedCell) return "";
    const row = currentRows[selectedCell.rowIndex];
    const col = activeCols[selectedCell.colIndex];
    if (!row || !col) return "";
    if (row.type !== "row" && row.type !== "checkpoint_row") return "";
    return row[col.field] || "";
  }, [selectedCell, currentRows, activeCols]);

  const handleCellCommit = async (id: string, field: string, type: string, originalValue: string) => {
    if (editValue.trim() === originalValue) {
      setEditingCell(null);
      return;
    }
    
    setSyncing(true);
    try {
      if (type === "brand") {
        await updateBrand(id, editValue.trim());
      } else if (type === "model") {
        const modelObj = models.find((m: any) => m.id === id);
        await updateModel(id, editValue.trim(), modelObj?.year || "");
      } else if (type === "material") {
        await updateMaterial(id, { name: editValue.trim() });
      } else if (type === "materialSku") {
        await updateMaterial(id, { sku: editValue.trim() });
      } else if (type === "materialUnit") {
        await updateMaterial(id, { unit: editValue.trim() });
      } else if (type === "fabricRow") {
        if (field === "name") await updateMaterial(id, { name: editValue.trim() });
        else if (field === "sku") await updateMaterial(id, { sku: editValue.trim() });
        else await updateMaterial(id, { unit: editValue.trim() });
      } else if (type === "generation") {
        // Typing a year range creates that generation on the model
        await addVehicleGeneration(id, editValue.trim());
      } else if (type === "design") {
        if (field === "name") await updateDesign(id, { name: editValue.trim() });
        else if (field === "fabricConsumption") {
          const n = parseFloat(editValue.trim());
          await updateDesign(id, { fabricConsumption: Number.isFinite(n) && n > 0 ? n : null });
        } else if (field === "cadFileUrl") {
          await updateDesign(id, { cadFileUrl: editValue.trim() || null });
        } else await updateDesign(id, { category: editValue.trim() });
      } else if (type === "product") {
        const prod = products.find((x: any) => x.id === id);
        await updateProduct(id, editValue.trim(), prod?.skuPrefix ?? "SKU");
      } else if (type === "variant") {
        const v = productVariants.find((x: any) => x.id === id);
        await updateVariant(id, editValue.trim(), v?.sku ?? "VAR");
      } else if (type === "variantSku") {
        const v = productVariants.find((x: any) => x.id === id);
        await updateVariant(id, v?.name ?? "", editValue.trim());
      } else if (type === "productType") {
        await updateProductType(id, editValue.trim());
      } else if (type === "ptypeFieldName") {
        await updateProductField(id, { name: editValue.trim() });
      } else if (type === "ptypeFieldKind") {
        const kind = editValue.trim().toUpperCase();
        if (!["TEXT", "SELECT", "NUMBER", "MEASUREMENT", "TOGGLE", "BUTTONS", "CHECKBOX"].includes(kind)) throw new Error("Kind must be TEXT, SELECT, NUMBER, MEASUREMENT, TOGGLE, BUTTONS or CHECKBOX");
        await updateProductField(id, { type: kind });
      } else if (type === "ptypeFieldOptions") {
        const options = editValue.split("|").map((o) => o.trim()).filter(Boolean);
        await updateProductField(id, { options });
      } else if (type === "supplier") {
        await updateSupplier(id, editValue.trim());
      } else if (type === "location") {
        await updateWarehouse(id, { name: editValue.trim() });
      } else if (type === "locationKind") {
        await updateWarehouse(id, { kind: editValue.trim().toUpperCase() === "STORE" ? "STORE" : "WAREHOUSE" });
      } else if (type === "color") {
        await updateColor(id, editValue.trim());
      } else if (type === "checkpoint") {
        let dbField = field;
        if (field === "checkpointName") dbField = "checkpointName";
        await updateCheckpointField(id, dbField, editValue.trim());
      }
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLocalEdits((prev) => ({ ...prev, [`${id}:${field}`]: editValue.trim() }));
      toast.success("Workbook autosaved");
      router.refresh();
    } catch (err: any) {
      toast.error("Save failed: " + (err.message || "Unknown error"));
    } finally {
      setSyncing(false);
      setEditingCell(null);
    }
  };

  const startCellEditing = (rowIndex: number, colIndex: number) => {
    const row = currentRows[rowIndex];
    const col = activeCols[colIndex];
    if (!row || !col || row.type === "template_header" || row.type === "section_header" || row.type === "ptype_header") return;
    if (col.type === "readonly") return;

    let editType = col.type;
    let itemId = row.id;

    if (activeSheet === "vehicles" && col.field === "brandName") {
      editType = "brand";
      itemId = row.brandId;
    }

    setEditingCell({ id: itemId, field: col.field, type: editType });
    setEditValue(row[col.field] || "");
  };

  // Keyboard navigation controller
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    const maxRows = currentRows.length;
    const maxCols = activeCols.length;

    if (editingCell) {
      if (e.key === "Escape") {
        setEditingCell(null);
        e.preventDefault();
      }
      return;
    }

    let { rowIndex, colIndex } = selectedCell;

    switch (e.key) {
      case "ArrowUp":
        if (rowIndex > 0) rowIndex--;
        e.preventDefault();
        break;
      case "ArrowDown":
        if (rowIndex < maxRows - 1) rowIndex++;
        e.preventDefault();
        break;
      case "ArrowLeft":
        if (colIndex > 0) colIndex--;
        e.preventDefault();
        break;
      case "ArrowRight":
        if (colIndex < maxCols - 1) colIndex++;
        e.preventDefault();
        break;
      case "Tab":
        if (e.shiftKey) {
          if (colIndex > 0) colIndex--;
        } else {
          if (colIndex < maxCols - 1) colIndex++;
        }
        e.preventDefault();
        break;
      case "Enter":
        startCellEditing(rowIndex, colIndex);
        e.preventDefault();
        break;
    }

    setSelectedCell({ rowIndex, colIndex });
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    setSyncing(true);
    try {
      if (activeSheet === "vehicles") {
        if (!brandInputText.trim()) {
          toast.error("Please specify a brand");
          setSyncing(false);
          return;
        }
        const generation = newGenFromYear
          ? `${newGenFromYear}-${newGenToYear || "Present"}`
          : "";
        await addModelWithGeneration(brandInputText.trim(), newItemName.trim(), generation);
        setNewItemName("");
        setNewGenFromYear("");
        setNewGenToYear("");
        setBrandInputText("");
      } else if (activeSheet === "materials" || activeSheet === "fabrics") {
        // Fabrics and materials are separate catalogs; the action resolves (and
        // creates) the right category so a material can never land under Fabric.
        const res: any = await addCatalogItem(
          activeSheet === "fabrics" ? "FABRIC" : "MATERIAL",
          newItemName.trim(),
          "Units",
          activeSheet === "materials" ? brandInputText.trim() || undefined : undefined
        );
        if (res?.error) throw new Error(res.error);
        setNewItemName("");
        setBrandInputText("");
      } else if (activeSheet === "designs") {
        if (!brandInputText.trim()) throw new Error("Pick the product this design belongs to");
        const res: any = await addDesign(brandInputText.trim(), newItemName.trim(), newFamilyText.trim() || undefined);
        if (res?.error) throw new Error(res.error);
        setNewItemName("");
        setNewFamilyText("");
      } else if (activeSheet === "products") {
        // Products no longer carry a user-facing category; the action resolves a
        // default so the required FK is still satisfied.
        const res: any = await addProductSimple(newItemName.trim());
        if (res?.error) throw new Error(res.error);
        setNewItemName("");
      } else if (activeSheet === "variants") {
        const prod = products.find((x: any) => x.name.toLowerCase() === brandInputText.trim().toLowerCase());
        if (!prod) throw new Error("Type an existing product name in the first box");
        await addVariant(prod.id, newItemName.trim(), `VAR-${Date.now().toString(36).toUpperCase()}`);
        setNewItemName("");
      } else if (activeSheet === "productTypes") {
        // {Product} {Spec Field} {Kind} — resolves the product type by name and
        // appends the field in one action.
        if (!brandInputText.trim()) throw new Error("Pick the product this spec field belongs to");
        const res: any = await addSpecField(brandInputText.trim(), newItemName.trim(), newFieldKind);
        if (res?.error) throw new Error(res.error);
        setNewItemName("");
      } else if (activeSheet === "suppliers") {
        await addSupplier(newItemName.trim());
        setNewItemName("");
      } else if (activeSheet === "locations") {
        await addWarehouse(newItemName.trim());
        setNewItemName("");
      } else if (activeSheet === "colors") {
        await addColor(newItemName.trim());
        setNewItemName("");
      }
      toast.success("Record added");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to add record");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteItem = (id: string, type: string, name: string) => {
    setItemToDelete({ id, type, name });
  };

  const executeDeleteItem = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    setItemToDelete(null);
    setSyncing(true);
    try {
      // Deletions report *why* they failed rather than throwing: a thrown
      // server-action error loses its message in production builds.
      let outcome: any = null;
      if (type === "brand") outcome = await removeBrand(id);
      else if (type === "model") outcome = await removeModel(id);
      else if (type === "material") outcome = await removeMaterial(id);
      else if (type === "color") outcome = await removeColor(id);
      else if (type === "design") outcome = await removeDesign(id);
      else if (type === "product") outcome = await removeProduct(id);
      else if (type === "variant") outcome = await removeVariant(id);
      else if (type === "supplier") outcome = await removeSupplier(id);
      else if (type === "warehouse") outcome = await removeWarehouse(id);
      else if (type === "ptypeField") outcome = await removeProductField(id);
      else if (type === "ptypeHeader") outcome = await removeProductType(id);
      else if (type === "checkpoint") outcome = await deleteCheckpointAction(id);

      if (outcome?.error) {
        toast.error(outcome.error);
        return;
      }
      toast.success("Record deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Deletion failed");
    } finally {
      setSyncing(false);
    }
  };

  const CSV_SPECS: Partial<Record<ActiveSheet, { headers: string[]; sample: string[] }>> = {
    variantRules: { headers: ["Brand", "Model", "Generation", "Seat Types", "Headrests", "Armrests"], sample: ["Maruti", "Alto", "2012-2019", "Single Back | Double Back", "4 | 5", "Arm | No Arm"] },
    vehicles: { headers: ["Brand", "Model", "Generation", "Year", "Variant"], sample: ["Maruti", "Baleno", "2015-2018", "2016", "Zeta"] },
    designs: {
      headers: ["Product", "Design", "Family", "Fabric Consumption (m/unit)", "CAD File URL"],
      sample: ["Seat Cover", "Triple Seam", "ULTRA", "3.5", ""],
    },
    fabrics: { headers: ["Category", "Material", "SKU", "Unit"], sample: ["Fabric", "Shaka SPC", "RM-SHAKA-SPC", "sqm"] },
    materials: { headers: ["Category", "Material", "SKU", "Unit"], sample: ["Fabric", "Heavy Napa", "RM-HEAVY-NAPA", "sqm"] },
    colors: { headers: ["Color"], sample: ["Black"] },
    products: { headers: ["Category", "Product", "SKU Prefix"], sample: ["Seat Covers", "Premium Leather Seat Cover", "SC-PRM"] },
    variants: { headers: ["Product", "Variant", "SKU"], sample: ["Premium Leather Seat Cover", "Black Diamond Stitch", "SC-PRM-BLK"] },
    suppliers: { headers: ["Supplier"], sample: ["Acme Traders"] },
    locations: { headers: ["Location", "Kind"], sample: ["Main Warehouse", "WAREHOUSE"] },
    productTypes: { headers: ["Product Type", "Spec Field", "Kind", "Options"], sample: ["Seat Cover", "Seat Type", "SELECT", "Single Back | Double Back | Bucket"] },
    templates: { headers: ["Template", "Section", "Checkpoint", "Instructions", "Require Image", "Require Remarks"], sample: ["Car Seat Cover Quality Checks", "Stitching", "Stitch Alignment", "Check 4mm spacing", "Yes", "No"] },
  };

  const downloadCsvFile = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSample = () => {
    const spec = CSV_SPECS[activeSheet];
    if (!spec) return;
    downloadCsvFile(Papa.unparse([Object.fromEntries(spec.headers.map((h, i) => [h, spec.sample[i]]))]), `Verity_${activeSheet}_sample.csv`);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          if (activeSheet === "variantRules") {
            const result = await importVehicleRules(data);
            toast.success(`Imported specs for ${(result as any).imported} generations`);
          } else if (activeSheet === "vehicles") {
            const vehicles = data.map((r) => ({
              brand: r.Brand || r.brand,
              model: r.Model || r.model,
              generation: r.Generation || r.generation || "Standard",
              year: parseInt(r.Year || r.year) || new Date().getFullYear(),
              variant: r.Variant || r.variant || "Base",
            })).filter((v) => v.brand && v.model);
            if (vehicles.length === 0) throw new Error("No valid rows found");
            await bulkImportVehicles(vehicles);
            toast.success(`Imported ${vehicles.length} vehicles`);
          } else if (["variants", "locations", "productTypes", "templates"].includes(activeSheet)) {
            const result = await importMasterCsvExtra(activeSheet, data);
            toast.success(`Imported ${(result as any).imported} rows`);
          } else {
            const sheetKey = activeSheet === "fabrics" ? "materials" : activeSheet;
            const result = await importMasterCsv(sheetKey, data);
            toast.success(`Imported ${(result as any).imported} rows`);
          }
          router.refresh();
        } catch (err: any) {
          toast.error(err.message || "Import failed");
        } finally {
          setSyncing(false);
          e.target.value = "";
        }
      },
    });
  };

  // Export the active sheet using the exact same header schema its import
  // expects, so an export→edit→import round-trip works on every sheet. Papa
  // handles quoting/escaping. Records are built to match CSV_SPECS[sheet].headers.
  const handleExportCSV = () => {
    const spec = CSV_SPECS[activeSheet];
    if (!spec) { toast.error("Export not available for this sheet"); return; }
    const H = spec.headers;
    let records: Record<string, string>[] = [];

    const pipe = (arr: any[]) => (arr ?? []).join(" | ");

    switch (activeSheet) {
      case "variantRules": {
        // One row per generation; blank spec cells = no restriction.
        for (const m of models as any[]) {
          const brand = m.brand?.name ?? "";
          for (const g of m.generations ?? []) {
            records.push({
              [H[0]]: brand,
              [H[1]]: m.name,
              [H[2]]: g.name,
              [H[3]]: pipe(g.allowedSeatTypes ?? []),
              [H[4]]: pipe(g.allowedHeadrests ?? []),
              [H[5]]: pipe(g.allowedArmrests ?? []),
            });
          }
        }
        break;
      }
      case "designs":
        records = designs.map((d: any) => ({
          [H[0]]: products.find((p: any) => p.id === d.productId)?.name ?? "",
          [H[1]]: d.name,
          [H[2]]: d.category ?? "",
          [H[3]]: d.fabricConsumption != null ? String(d.fabricConsumption) : "",
          [H[4]]: d.cadFileUrl ?? "",
        }));
        break;
      case "fabrics":
        records = materials
          .filter((m: any) => (m.category?.name ?? "").toLowerCase() === "fabric")
          .map((m: any) => ({ [H[0]]: m.category?.name ?? "Fabric", [H[1]]: m.name, [H[2]]: m.sku ?? "", [H[3]]: m.unit ?? m.defaultUOM ?? "" }));
        break;
      case "materials":
        records = materials
          .filter((m: any) => (m.category?.name ?? "").toLowerCase() !== "fabric")
          .map((m: any) => ({ [H[0]]: m.category?.name ?? "", [H[1]]: m.name, [H[2]]: m.sku ?? "", [H[3]]: m.unit ?? m.defaultUOM ?? "" }));
        break;
      case "colors":
        records = colors.map((c: any) => ({ [H[0]]: c.name }));
        break;
      case "products":
        records = products.map((p: any) => ({
          [H[0]]: p.category?.name ?? productCategories.find((c: any) => c.id === p.categoryId)?.name ?? "",
          [H[1]]: p.name,
          [H[2]]: p.skuPrefix ?? "",
        }));
        break;
      case "variants":
        records = productVariants.map((v: any) => ({
          [H[0]]: products.find((p: any) => p.id === v.productId)?.name ?? "",
          [H[1]]: v.name,
          [H[2]]: v.sku ?? "",
        }));
        break;
      case "suppliers":
        records = suppliers.map((s: any) => ({ [H[0]]: s.name }));
        break;
      case "locations":
        records = warehouses.map((w: any) => ({ [H[0]]: w.name, [H[1]]: w.kind ?? "WAREHOUSE" }));
        break;
      case "productTypes":
        for (const pt of productTypes as any[]) {
          const fields = pt.fields ?? [];
          if (fields.length === 0) { records.push({ [H[0]]: pt.name, [H[1]]: "", [H[2]]: "", [H[3]]: "" }); continue; }
          for (const f of fields) {
            records.push({
              [H[0]]: pt.name,
              [H[1]]: f.name,
              [H[2]]: f.type,
              [H[3]]: Array.isArray(f.options) ? f.options.join(" | ") : "",
            });
          }
        }
        break;
      case "templates":
        // Build straight from the templates — never from templateRows, which
        // omits the checkpoints of any collapsed template/section, so a collapsed
        // view used to export only part of the catalogue.
        records = (templates as any[]).flatMap((tpl: any) =>
          (tpl.sections ?? []).flatMap((sec: any) =>
            (sec.checkpoints ?? []).map((cp: any) => ({
              [H[0]]: tpl.name, [H[1]]: sec.title, [H[2]]: cp.name,
              [H[3]]: cp.instructions ?? "", [H[4]]: cp.requireImage ? "Yes" : "No", [H[5]]: cp.requireRemarks ? "Yes" : "No",
            }))
          )
        );
        break;
    }

    const csv = Papa.unparse({ fields: H, data: records.map((rec) => H.map((h) => rec[h] ?? "")) });
    downloadCsvFile(csv, `Verity_${activeSheet}_catalog.csv`);
  };

  const toggleTemplateCollapse = (tplId: string) => {
    setCollapsedTemplates(prev => ({ ...prev, [tplId]: !prev[tplId] }));
  };

  const handleAddSectionToTemplate = async (templateId: string) => {
    const title = window.prompt("Enter new Section Title:");
    if (!title?.trim()) return;
    setSyncing(true);
    try {
      const res = await addSectionAction(templateId, title.trim());
      if (res.error) throw new Error(res.error);
      toast.success("Section added to template outline");
    } catch (err: any) {
      toast.error(err.message || "Failed to add section");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddCheckpointToSection = async (sectionId: string) => {
    const name = window.prompt("Enter new Checkpoint Name:");
    if (!name?.trim()) return;
    setSyncing(true);
    try {
      const res = await addCheckpointAction(sectionId, name.trim());
      if (res.error) throw new Error(res.error);
      toast.success("Step added to section outline");
    } catch (err: any) {
      toast.error(err.message || "Failed to add checkpoint");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;
    setSyncing(true);
    try {
      const res = await deleteQCTemplate(templateId);
      if (res.error) throw new Error(res.error);
      toast.success("Template deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete template");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSection = async (sectionId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete section "${title}"?`)) return;
    setSyncing(true);
    try {
      const res = await deleteSectionAction(sectionId);
      if (res.error) throw new Error(res.error);
      toast.success("Section deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete section");
    } finally {
      setSyncing(false);
    }
  };

  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  if (!isOpen) return null;

  return (
    <div className={asPage
      ? "relative w-full h-[calc(100vh-96px)] min-h-[560px]"
      : "fixed inset-0 z-[99999] flex items-center justify-center p-0"}>
      {/* Backdrop */}
      {!asPage && <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />}

      {/* Shell */}
      <div className={asPage
        ? "relative w-full h-full bg-white dark:bg-neutral-900 flex flex-col rounded-2xl border border-border overflow-hidden"
        : "relative w-screen h-screen bg-white dark:bg-neutral-900 flex flex-col z-10 animate-in fade-in duration-200"}>
        
        {/* Top Header Bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0 bg-surface-secondary/40 dark:bg-neutral-800/20">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Master Data Studio</h3>
              <p className="text-[10px] text-text-secondary">Spreadsheet-style catalog workbook</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-[10px] font-bold text-text-tertiary">
              {syncing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--brand)]" />
                  Saving...
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5 text-success" />
                  Autosaved
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Formula Bar & Search */}
        <div className="flex flex-col border-b border-border shrink-0">
          {/* Action Toolbar */}
          <div className="flex justify-between items-center px-6 py-2 bg-surface-secondary/10 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-text-tertiary uppercase">Formula Bar</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder={activeSheet === "variants" ? "Search variants — any order, e.g. \"archer honda db\"" : activeSheet === "variantRules" ? "Search brand or model…" : activeSheet === "items" ? "Search items — name, code, brand, keyword…" : activeSheet === "customers" ? "Search customers — name, company, phone, code…" : "Search catalog..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`h-8 pl-9 pr-4 rounded-lg border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand)] ${activeSheet === "variants" ? "w-80" : "w-full"}`}
                />
              </div>
              {/* The sheet renders a slice of a generated set, so say so rather
                  than letting the row count read as the whole catalogue. */}
              {activeSheet === "variants" && (
                <span className="text-[11px] text-text-tertiary whitespace-nowrap">
                  {variantRows.length.toLocaleString()} shown of {variantTotal.toLocaleString()} combinations
                </span>
              )}
              <button
                onClick={handleExportCSV}
                className="h-8 px-3 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              {CSV_SPECS[activeSheet] && (
                <>
                  <input type="file" id="sheetCsvUpload" accept=".csv" className="hidden" disabled={syncing} onChange={handleCSVImport} />
                  <label htmlFor="sheetCsvUpload" className="h-8 px-3 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Import
                  </label>
                  <button
                    onClick={handleDownloadSample}
                    className="h-8 px-3 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" /> Sample
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Actual Excel fx input — hidden for the tree editors (no cells). */}
          {activeSheet !== "variantRules" && activeSheet !== "items" && (
          <div className="flex items-center bg-surface px-6 py-2 gap-2 text-xs">
            <div className="flex items-center justify-center font-bold px-2 py-1 bg-surface-secondary/50 rounded text-text-tertiary border border-border/50 select-none">
              {selectedCell 
                ? `${activeCols[selectedCell.colIndex]?.letter}${selectedCell.rowIndex + 1}` 
                : "A1"}
            </div>
            <div className="font-bold text-text-tertiary italic select-none">fx</div>
            <div className="h-4 w-px bg-border/80" />
            <input 
              type="text"
              readOnly={!selectedCell || currentRows[selectedCell.rowIndex]?.type === "template_header" || currentRows[selectedCell.rowIndex]?.type === "section_header"}
              value={editingCell ? editValue : formulaValue}
              onChange={(e) => {
                if (selectedCell) {
                  const row = currentRows[selectedCell.rowIndex];
                  const col = activeCols[selectedCell.colIndex];
                  if (row && col) {
                    let editType = col.type;
                    let itemId = row.id;
                    if (activeSheet === "vehicles" && col.field === "brandName") {
                      editType = "brand";
                      itemId = row.brandId;
                    }
                    setEditingCell({ id: itemId, field: col.field, type: editType });
                    setEditValue(e.target.value);
                  }
                }
              }}
              onBlur={() => {
                if (selectedCell && editingCell) {
                  const row = currentRows[selectedCell.rowIndex];
                  const col = activeCols[selectedCell.colIndex];
                  if (row && col) {
                    void handleCellCommit(editingCell.id, editingCell.field, editingCell.type, row[col.field] || "");
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedCell && editingCell) {
                  const row = currentRows[selectedCell.rowIndex];
                  const col = activeCols[selectedCell.colIndex];
                  if (row && col) {
                    void handleCellCommit(editingCell.id, editingCell.field, editingCell.type, row[col.field] || "");
                  }
                }
              }}
              placeholder={selectedCell ? "Formula bar value" : "Select a cell to view/edit"}
              className="flex-1 bg-transparent py-1 px-2 focus:outline-none text-text-primary font-medium"
            />
          </div>
          )}
        </div>

        {/* Vehicles & Items are tree editors, not grids. */}
        {activeSheet === "variantRules" ? (
          <div className="flex-1 overflow-hidden bg-surface-secondary/20 min-h-0">
            <VariantRulesTree models={masterData.models} brands={masterData.brands} query={searchQuery} />
          </div>
        ) : activeSheet === "items" ? (
          <div className="flex-1 overflow-hidden bg-surface-secondary/20 min-h-0">
            <ItemsTree query={searchQuery} />
          </div>
        ) : activeSheet === "customers" ? (
          <div className="flex-1 overflow-hidden bg-surface-secondary/20 min-h-0">
            <CustomersTree query={searchQuery} />
          </div>
        ) : (
        /* Spreadsheet Data Grid Viewport */
        <div
          className="flex-1 overflow-auto bg-surface-secondary/20 relative outline-none min-h-0 select-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <table ref={tableRef} className="w-full text-left text-xs border-collapse border-spacing-0">
            {/* Headers row */}
            <thead className="sticky top-0 bg-surface-2 border-b border-border z-20 select-none">
              {/* Excel letters header */}
              <tr className="bg-surface-secondary/30 text-text-tertiary/70 text-[9px] font-bold border-b border-border/40 select-none">
                <th className="px-2 py-0.5 text-center border-r border-border/40 w-10 shrink-0 font-mono"></th>
                {activeCols.map((col, idx) => (
                  <th key={idx} className="px-6 py-0.5 text-center border-r border-border/40 font-mono">
                    {col.letter}
                  </th>
                ))}
                <th className="px-6 py-0.5 text-center w-20"></th>
              </tr>
              {/* Header titles */}
              <tr className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary border-b border-border select-none">
                <th className="px-2 py-2.5 text-center border-r border-border w-10 shrink-0 font-mono bg-surface-secondary/30"></th>
                {activeCols.map((col, idx) => (
                  <th key={idx} className={cn(
                    "px-6 py-2.5 border-r border-border bg-surface-2",
                    idx === 0 && "sticky left-0 z-35 bg-surface-2"
                  )}>
                    {col.label}
                  </th>
                ))}
                {/* Designs/fabrics carry extra row actions (BOM, Images, Assign)
                    on top of Delete, so the column needs room for all of them. */}
                <th className={cn(
                  "px-4 py-2.5 text-center bg-surface-2 whitespace-nowrap",
                  activeSheet === "designs" ? "w-56" : activeSheet === "fabrics" ? "w-36" : "w-20"
                )}>Action</th>
              </tr>
            </thead>

            {/* Grid Body */}
            <tbody className="divide-y divide-border bg-background select-none">
              {currentRows.map((row, rowIndex) => {
                // Determine template nesting styles
                const isTplHeader = row.type === "template_header";
                const isSecHeader = row.type === "section_header";
                const isPtypeHeader = row.type === "ptype_header";

                return (
                  <tr 
                    key={row.id + "_" + rowIndex} 
                    className={cn(
                      "hover:bg-surface-secondary/25 transition select-none group",
                      isTplHeader && "bg-surface-2/70 dark:bg-neutral-850/40 font-bold",
                      isSecHeader && "bg-surface-2/30 dark:bg-neutral-850/20 font-semibold"
                    )}
                  >
                    {/* Row Index Indicator */}
                    <td className="px-2 py-2 text-center border-r border-border/50 w-10 font-mono text-[9px] text-text-tertiary bg-surface-secondary/20 select-none">
                      {rowIndex + 1}
                    </td>

                    {isPtypeHeader ? (
                      <td colSpan={activeCols.length + 1} className="px-6 py-3 font-semibold text-text-primary text-sm bg-surface-secondary/40 dark:bg-neutral-800/40 border-b border-border select-none">
                        <div className="flex items-center justify-between w-full">
                          <span>{activeSheet === "designs" ? "Product" : "Product Type"}: {row.name}</span>
                          <div className="flex items-center gap-3">
                            {activeSheet === "productTypes" && <>
                            <button
                              onClick={async () => {
                                const name = window.prompt("Spec field name (e.g. Seat Type):");
                                if (!name?.trim()) return;
                                const kind = (window.prompt("Field kind - TOGGLE, BUTTONS, CHECKBOX, SELECT, TEXT, NUMBER or MEASUREMENT:", "BUTTONS") || "TEXT").toUpperCase();
                                let options: string[] | undefined;
                                if (["SELECT", "TOGGLE", "BUTTONS", "CHECKBOX"].includes(kind)) {
                                  const raw = window.prompt("Options (comma separated):", kind === "CHECKBOX" ? "Yes, No" : "Option A, Option B");
                                  options = (raw || "").split(",").map((o) => o.trim()).filter(Boolean);
                                }
                                setSyncing(true);
                                try {
                                  await addProductField(row.id, { name: name.trim(), type: ["TEXT","SELECT","NUMBER","MEASUREMENT","TOGGLE","BUTTONS","CHECKBOX"].includes(kind) ? kind : "TEXT", options });
                                  toast.success("Spec field added");
                                  router.refresh();
                                } catch (err: any) { toast.error(err.message || "Failed"); }
                                finally { setSyncing(false); }
                              }}
                              className="h-7 px-2.5 rounded-lg border border-border bg-surface text-text-primary text-[10px] font-bold hover:bg-surface-secondary transition cursor-pointer"
                            >
                              Add Spec Field
                            </button>
                            <button
                              onClick={() => handleDeleteItem(row.id, "ptypeHeader", row.name)}
                              className="h-7 px-2.5 rounded-lg border border-danger/35 bg-danger-soft/5 text-danger text-[10px] font-bold hover:bg-danger-soft/25 transition cursor-pointer"
                            >
                              Delete
                            </button>
                            </>}
                          </div>
                        </div>
                      </td>
                    ) : isTplHeader ? (
                      /* Outline grouped Template Title */
                      <td colSpan={activeCols.length + 1} className="px-6 py-3 font-semibold text-text-primary text-sm bg-surface-secondary/40 dark:bg-neutral-800/40 border-b border-border select-none">
                        <div className="flex items-center justify-between w-full">
                          <button 
                            onClick={() => toggleTemplateCollapse(row.id)}
                            className="flex items-center gap-2 outline-none"
                          >
                            {row.isCollapsed ? <ChevronRight className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-[var(--brand)]" />}
                            <span>Template: {row.templateName}</span>
                          </button>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleAddSectionToTemplate(row.id)}
                              className="h-7 px-2.5 rounded-lg border border-border bg-surface text-text-primary text-[10px] font-bold hover:bg-surface-secondary transition cursor-pointer"
                            >
                              Add Section
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(row.id, row.templateName)}
                              className="h-7 px-2.5 rounded-lg border border-danger/35 bg-danger-soft/5 text-danger text-[10px] font-bold hover:bg-danger-soft/25 transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    ) : isSecHeader ? (
                      /* Outline grouped Section Title */
                      <td colSpan={activeCols.length + 1} className="px-10 py-2.5 font-medium text-text-secondary text-xs bg-surface-secondary/20 dark:bg-neutral-800/20 border-b border-border/80 select-none">
                        <div className="flex items-center justify-between w-full">
                          <button 
                            onClick={() => toggleSectionCollapse(row.id)}
                            className="flex items-center gap-2 outline-none"
                          >
                            {row.isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--brand)]" />}
                            <span>Section: {row.sectionTitle}</span>
                          </button>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleAddCheckpointToSection(row.id)}
                              className="h-6 px-2.5 rounded-lg border border-border bg-surface text-text-primary text-[10px] font-bold hover:bg-surface-secondary transition cursor-pointer"
                            >
                              Add Step
                            </button>
                            <button
                              onClick={() => handleDeleteSection(row.id, row.sectionTitle)}
                              className="h-6 px-2.5 rounded-lg border border-danger/35 bg-danger-soft/5 text-danger text-[10px] font-bold hover:bg-danger-soft/25 transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        {/* Spreadsheet cell fields */}
                        {activeCols.map((col, colIndex) => {
                          const active = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
                          let cellValue = localEdits[`${row.id}:${col.field}`] ?? (row[col.field] || "");
                          
                          // Group view: Clear out duplicate template name and section name from rows to make grouping stand out
                          if (activeSheet === "templates" && (col.field === "templateName" || col.field === "sectionTitle")) {
                            cellValue = "";
                          }

                          // Inline logic to fetch edit details
                          let cellEditType = col.type;
                          let cellItemId = row.id;

                          if (activeSheet === "vehicles" && col.field === "brandName") {
                            cellEditType = "brand";
                            cellItemId = row.brandId;
                          }

                          const editing = editingCell?.id === cellItemId && editingCell?.field === col.field;

                          return (
                            <td 
                              key={colIndex} 
                              className={cn(
                                "px-6 py-2 border-r border-border relative select-none",
                                colIndex === 0 && "sticky left-0 z-10 bg-background group-hover:bg-surface-secondary/25",
                                active && "ring-1 ring-[var(--brand)] ring-inset z-10"
                              )}
                              onClick={() => setSelectedCell({ rowIndex, colIndex })}
                              onDoubleClick={() => startCellEditing(rowIndex, colIndex)}
                            >
                              {editing ? (
                                col.field === "fieldType" ? (
                                  <select
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleCellCommit(cellItemId, col.field, cellEditType, cellValue)}
                                    autoFocus
                                    className="bg-surface border border-[var(--brand)] rounded px-1.5 py-0.5 text-xs focus:outline-none outline-none cursor-pointer w-full"
                                  >
                                    <option value="TOGGLE">TOGGLE (two-option switch)</option>
                                    <option value="BUTTONS">BUTTONS (tap options)</option>
                                    <option value="CHECKBOX">CHECKBOX (yes/no tick)</option>
                                    <option value="SELECT">SELECT (dropdown)</option>
                                    <option value="TEXT">TEXT</option>
                                    <option value="NUMBER">NUMBER</option>
                                    <option value="MEASUREMENT">MEASUREMENT</option>
                                  </select>
                                ) : col.field === "requireImage" || col.field === "requireRemarks" ? (
                                  <select
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleCellCommit(cellItemId, col.field, cellEditType, cellValue)}
                                    autoFocus
                                    className="bg-surface border border-[var(--brand)] rounded px-1.5 py-0.5 text-xs focus:outline-none outline-none cursor-pointer w-full"
                                  >
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleCellCommit(cellItemId, col.field, cellEditType, cellValue)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCellCommit(cellItemId, col.field, cellEditType, cellValue)}
                                    autoFocus
                                    className="w-full bg-surface border border-[var(--brand)] rounded px-2 py-1 text-xs focus:outline-none font-medium"
                                  />
                                )
                              ) : (
                                <div className="min-h-[24px] flex items-center select-none w-full">
                                  {col.field === "requireImage" || col.field === "requireRemarks" ? (
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-bold",
                                      cellValue === "Yes" 
                                        ? "bg-brand-soft text-[var(--brand)]" 
                                        : "bg-surface-secondary text-text-tertiary"
                                    )}>
                                      {col.field === "requireImage" 
                                        ? (cellValue === "Yes" ? "Required" : "Optional")
                                        : (cellValue === "Yes" ? "Mandatory" : "Optional")}
                                    </span>
                                  ) : (
                                    cellValue
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Row Action Trigger */}
                        <td className="px-4 py-2 text-center select-none">
                          <div className="flex flex-nowrap items-center justify-center gap-1.5">
                            {(activeSheet === "designs" || activeSheet === "fabrics") && (
                              <button
                                onClick={() => setBomEditor({
                                  refType: activeSheet === "designs" ? "DESIGN" : "FABRIC",
                                  refId: row.id,
                                  name: row.name,
                                })}
                                className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded border border-border text-[9px] font-bold text-text-secondary hover:text-[var(--brand)] hover:border-[var(--brand)]/50 transition cursor-pointer"
                                title="Bill of materials for this spec"
                              >
                                BOM{specBomMap.has(`${activeSheet === "designs" ? "DESIGN" : "FABRIC"}:${row.id}`) ? " ✓" : ""}
                              </button>
                            )}
                            {activeSheet === "designs" && (
                              <button
                                onClick={() => setImageEditor({ id: row.id, name: row.name, images: (row.imageUrls ?? []) as string[] })}
                                className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded border border-border text-[9px] font-bold text-text-secondary hover:text-[var(--brand)] hover:border-[var(--brand)]/50 transition cursor-pointer"
                                title="Reference photos for this design"
                              >
                                Images{(row.imageUrls?.length ?? 0) > 0 ? ` ${row.imageUrls.length}` : ""}
                              </button>
                            )}
                            {activeSheet === "designs" && (
                              <button
                                onClick={async () => {
                                  const current = products.find((pr: any) => pr.id === row.productId)?.name ?? "";
                                  const next = window.prompt(
                                    `Assign "${row.name}" to which product? (exact name from Products sheet; leave empty to unassign)`,
                                    current
                                  );
                                  if (next === null || next.trim() === current) return;
                                  setSyncing(true);
                                  try {
                                    const res: any = await assignDesignProduct(row.id, next);
                                    if (res?.error) throw new Error(res.error);
                                    toast.success(next.trim() ? `Moved to ${next.trim()}` : "Design unassigned");
                                    router.refresh();
                                  } catch (err: any) { toast.error(err.message || "Failed"); }
                                  finally { setSyncing(false); }
                                }}
                                className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded border border-border text-[9px] font-bold text-text-secondary hover:text-[var(--brand)] hover:border-[var(--brand)]/50 transition cursor-pointer"
                                title="Move this design under a different product"
                              >
                                Assign
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const deleteMap: Record<string, string> = {
                                  vehicles: "model", designs: "design", fabrics: "material", materials: "material",
                                  products: "product", variants: "variant", suppliers: "supplier", locations: "warehouse",
                                  colors: "color", productTypes: "ptypeField", templates: "checkpoint",
                                };
                                const deleteType = deleteMap[activeSheet] ?? "checkpoint";
                                const deleteName = activeSheet === "vehicles" ? row.modelName : activeSheet === "productTypes" ? row.fieldName : activeSheet === "templates" ? row.checkpointName : row.name;
                                handleDeleteItem(row.id, deleteType as any, deleteName);
                              }}
                              className="shrink-0 p-1 rounded hover:bg-danger-soft text-text-tertiary hover:text-danger transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}

              {currentRows.length === 0 && (
                <tr>
                  <td colSpan={activeCols.length + 2} className="px-6 py-10 text-center text-text-tertiary select-none">
                    No matching workbook entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Workbook Sheets Selector (Bottom tabs look-alike) */}
        <div className="px-6 py-2 border-t border-b border-border bg-surface-secondary/40 dark:bg-neutral-800/20 shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {([
            { id: "variantRules", label: "Vehicles" },
            { id: "designs", label: "Designs" },
            { id: "fabrics", label: "Fabrics" },
            { id: "colors", label: "Colors" },
            { id: "items", label: "Items" },
            { id: "products", label: "Products" },
            { id: "variants", label: "Variants" },
            { id: "productTypes", label: "Spec Presets" },
            { id: "suppliers", label: "Suppliers" },
            { id: "customers", label: "Customers" },
            { id: "locations", label: "Locations" },
            { id: "templates", label: "Templates" }
          ] as const).map((sheet) => {
            const active = activeSheet === sheet.id;
            return (
              <button
                key={sheet.id}
                onClick={() => {
                  setActiveSheet(sheet.id);
                  setSearchQuery("");
                  setNewItemName("");
                  setBrandInputText("");
                  setSelectedCell(null);
                  setEditingCell(null);
                  // Keep the sheet in the URL so a reload/deep-link lands on the
                  // same sheet instead of resetting to Vehicles.
                  if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.set("sheet", sheet.id);
                    window.history.replaceState(window.history.state, "", url.toString());
                  }
                }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-t-xl transition cursor-pointer border border-border border-b-transparent -mb-[9px] relative z-10",
                  active
                    ? "bg-background text-text-primary border-t-[var(--brand)] border-t-2"
                    : "bg-surface text-text-secondary hover:text-text-primary"
                )}
              >
                {sheet.label}
              </button>
            );
          })}
        </div>

        {/* Add Record Bottom Panel */}
        {activeSheet === "variantRules" || activeSheet === "items" || activeSheet === "customers" ? null : activeSheet === "templates" ? (
          <div className="p-4 bg-surface shrink-0 flex items-center justify-between gap-4 border-t border-border">
            <span className="text-xs text-text-tertiary font-medium">
              💡 Tip: To configure or restructure templates, use the Templates page.
            </span>
          </div>
        ) : (
          <div className="p-4 bg-surface shrink-0 flex flex-wrap items-center gap-4 border-t border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1">
              <Plus className="h-4 w-4 text-[var(--brand)]" /> Add Row:
            </span>

            {activeSheet === "vehicles" ? (
              <>
                <input
                  list="brands-datalist"
                  value={brandInputText}
                  onChange={(e) => setBrandInputText(e.target.value)}
                  placeholder="Brand (e.g. Honda)"
                  className="h-9 w-44 border border-border rounded-xl px-3 text-xs bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--brand)] font-semibold"
                />
                <datalist id="brands-datalist">
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>

                <input
                  type="text"
                  placeholder="Model variant (e.g. Civic)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 min-w-[150px] h-9 px-3.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                />

                <select
                  value={newGenFromYear}
                  onChange={(e) => setNewGenFromYear(e.target.value)}
                  className="w-28 h-9 px-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand)] cursor-pointer"
                >
                  <option value="">From year</option>
                  {Array.from({ length: new Date().getFullYear() + 2 - 1990 }, (_, i) => String(new Date().getFullYear() + 1 - i)).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="text-xs font-bold text-text-tertiary">→</span>
                <select
                  value={newGenToYear}
                  onChange={(e) => setNewGenToYear(e.target.value)}
                  className="w-28 h-9 px-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand)] cursor-pointer"
                >
                  <option value="">To year</option>
                  <option value="Present">Present</option>
                  {Array.from({ length: new Date().getFullYear() + 2 - 1990 }, (_, i) => String(new Date().getFullYear() + 1 - i)).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                {(activeSheet === "designs" || activeSheet === "productTypes") && (
                  <>
                    <input
                      list="parent-datalist"
                      value={brandInputText}
                      onChange={(e) => setBrandInputText(e.target.value)}
                      placeholder={activeSheet === "designs" ? "Product (from Products sheet)" : "Product (from Products sheet)"}
                      className="h-9 w-52 border border-border rounded-xl px-3 text-xs bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--brand)] font-semibold"
                    />
                    <datalist id="parent-datalist">
                      {(activeSheet === "designs" || activeSheet === "productTypes") && products.map((pr: any) => <option key={pr.id} value={pr.name} />)}
                    </datalist>
                  </>
                )}
                <input
                  type="text"
                  placeholder={
                    activeSheet === "designs" ? "Design name (e.g. Triple Seam)"
                    : activeSheet === "fabrics" ? "Fabric name (e.g. Shaka SPC)"
                    : activeSheet === "materials" ? "Material Name (e.g. Leather)"
                    : activeSheet === "products" ? "Product name"
                    : activeSheet === "variants" ? "Variant name"
                    : activeSheet === "productTypes" ? "Spec field name (e.g. Headrests)"
                    : activeSheet === "suppliers" ? "Supplier name"
                    : activeSheet === "locations" ? "Location name"
                    : "Color Name (e.g. Scarlet)"}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 h-9 px-3.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                />
                {activeSheet === "designs" && (
                  <input
                    type="text"
                    list="family-datalist"
                    placeholder="Family (e.g. ERGO FIT)"
                    value={newFamilyText}
                    onChange={(e) => setNewFamilyText(e.target.value)}
                    className="h-9 w-44 px-3.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  />
                )}
                {activeSheet === "designs" && (
                  <datalist id="family-datalist">
                    {[...new Set(designs.map((d: any) => d.category).filter(Boolean))].map((f: any) => <option key={f} value={f} />)}
                  </datalist>
                )}
                {activeSheet === "productTypes" && (
                  <select
                    value={newFieldKind}
                    onChange={(e) => setNewFieldKind(e.target.value)}
                    className="h-9 w-36 px-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand)] cursor-pointer"
                  >
                    {["BUTTONS", "TOGGLE", "CHECKBOX", "SELECT", "TEXT", "NUMBER", "MEASUREMENT"].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                )}
              </>
            )}

            <button
              onClick={handleAddItem}
              disabled={syncing || !newItemName.trim()}
              className="h-9 px-4 rounded-xl bg-text-primary text-background hover:opacity-90 transition text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              Add Record
            </button>
          </div>
        )}

        {/* Workbook Status Bar */}
        <div className="bg-surface-secondary/60 dark:bg-neutral-800/10 px-6 py-2 border-t border-border flex items-center justify-between text-[10px] font-bold text-text-tertiary tracking-wide shrink-0">
          <div className="flex items-center gap-4">
            <span>{currentRows.length} Row{currentRows.length === 1 ? "" : "s"}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-border" />
            {activeSheet === "templates" ? (
              <>
                <span>{templates.length} Templates</span>
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                <span>{templates.reduce((acc, t) => acc + t.sections.length, 0)} Sections</span>
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                <span>{templateRows.filter(r => r.type === "checkpoint_row").length} Checkpoints</span>
              </>
            ) : (
              <span>Catalog Sheet</span>
            )}
          </div>
          <div>
            <span>Autosaved at {lastSaved}</span>
          </div>
        </div>

      </div>

      {bomEditor && (
        <SpecBomModal
          refType={bomEditor.refType}
          refId={bomEditor.refId}
          name={bomEditor.name}
          materials={materials}
          existing={specBomMap.get(`${bomEditor.refType}:${bomEditor.refId}`)}
          onClose={() => setBomEditor(null)}
          onSaved={() => { setBomEditor(null); router.refresh(); }}
        />
      )}

      {imageEditor && (
        <DesignImageModal
          design={imageEditor}
          factoryId={(brands[0] || designs[0] || models[0])?.factoryId || "factory"}
          onClose={() => setImageEditor(null)}
          onChanged={() => router.refresh()}
        />
      )}

      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Delete record?"
        description={`Are you sure you want to delete "${itemToDelete?.name || ""}" permanently? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={executeDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}


function SpecBomModal({ refType, refId, name, materials, existing, onClose, onSaved }: {
  refType: "DESIGN" | "FABRIC";
  refId: string;
  name: string;
  materials: any[];
  existing?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Array<{ itemId: string; quantity: number; wastePercent: number }>>(
    ((existing?.items as any[]) ?? []).map((i: any) => ({ itemId: i.itemId, quantity: Number(i.quantity) || 1, wastePercent: Number(i.wastePercent) || 0 }))
  );
  const [saving, setSaving] = useState(false);

  // BOM lines consume Materials-sheet items only — fabric records live on the
  // Fabrics sheet and are the thing this BOM belongs to, not a consumable.
  const bomMaterials = materials.filter((m: any) => (m.category?.name ?? "").toLowerCase() !== "fabric");

  const save = async () => {
    setSaving(true);
    try {
      await saveSpecBOM(refType, refId, rows.filter((r) => r.itemId && r.quantity > 0));
      toast.success("Spec BOM saved");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">{refType === "DESIGN" ? "Design" : "Fabric"} BOM</p>
            <h3 className="text-sm font-bold text-text-primary">{name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-[11px] text-text-secondary">Materials consumed per unit when this {refType === "DESIGN" ? "design" : "fabric"} is selected. Merged with the product BOM at production start.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                className="bg-surface-secondary border border-border text-xs p-1.5 rounded flex-1 text-text-primary"
                value={row.itemId}
                onChange={(e) => setRows(rows.map((r, idx) => idx === i ? { ...r, itemId: e.target.value } : r))}
              >
                <option value="">Select material...</option>
                {bomMaterials.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.unit ?? m.defaultUOM ?? ""})</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Qty" className="w-20 bg-surface-secondary border border-border text-xs p-1.5 rounded text-text-primary"
                value={row.quantity} onChange={(e) => setRows(rows.map((r, idx) => idx === i ? { ...r, quantity: parseFloat(e.target.value) || 0 } : r))} />
              <input type="number" step="0.1" placeholder="Waste %" className="w-20 bg-surface-secondary border border-border text-xs p-1.5 rounded text-text-primary"
                value={row.wastePercent} onChange={(e) => setRows(rows.map((r, idx) => idx === i ? { ...r, wastePercent: parseFloat(e.target.value) || 0 } : r))} />
              <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-danger p-1 hover:bg-danger/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-xs text-text-tertiary italic py-2">No materials yet.</p>}
        </div>
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => setRows([...rows, { itemId: "", quantity: 1, wastePercent: 0 }])} className="text-xs flex items-center gap-1 px-2 py-1 border border-border rounded hover:border-[var(--brand)]/50 text-text-secondary hover:text-[var(--brand)] transition">
            <Plus className="h-3 w-3" /> Add material
          </button>
          <button onClick={save} disabled={saving} className="text-xs flex items-center gap-1.5 px-4 py-1.5 bg-[var(--brand)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition font-bold">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save BOM
          </button>
        </div>
      </div>
    </div>
  );
}

function DesignImageModal({ design, factoryId, onClose, onChanged }: {
  design: { id: string; name: string; images: string[] };
  factoryId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [images, setImages] = useState<string[]>(design.images ?? []);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("Unable to read file"));
        r.readAsDataURL(file);
      });
      const path = createStoragePath({ factoryId, scope: "catalogue", id: design.id, fileName: file.name });
      const res = await uploadStorageImage({ path, dataUrl, fileName: file.name, mimeType: file.type || "image/jpeg", size: file.size });
      await addDesignImage(design.id, res.publicUrl);
      setImages((prev) => [...prev, res.publicUrl]);
      toast.success("Reference image added");
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const remove = async (url: string) => {
    setBusy(true);
    try {
      await removeDesignImage(design.id, url);
      setImages((prev) => prev.filter((u) => u !== url));
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Design reference photos</p>
            <h3 className="text-sm font-bold text-text-primary">{design.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-secondary text-text-secondary"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-[11px] text-text-secondary">Shown automatically to workers, QC, and on the passport wherever this design is produced — no manual searching.</p>
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          {images.map((url) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-surface-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="reference" className="h-full w-full object-cover" />
              <button onClick={() => remove(url)} disabled={busy}
                className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {images.length === 0 && <p className="col-span-3 text-xs text-text-tertiary italic py-4 text-center">No reference photos yet.</p>}
        </div>
        <label className={cn("flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-text-secondary cursor-pointer hover:border-[var(--brand)]/50 hover:text-[var(--brand)] transition", busy && "opacity-50 pointer-events-none")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Upload reference photo
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
      </div>
    </div>
  );
}
