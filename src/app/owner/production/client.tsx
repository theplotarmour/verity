"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Box,
  ClipboardCheck,
  Printer,
  Sparkles,
  X,
  ImagePlus,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Pencil,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
import { PRODUCTION_STATUS_LABELS, type ProductionStatus } from "@/lib/production-status";
import { getStatusClasses, titleCaseStatus } from "@/lib/utils";
import { createOrder, createBatchOrders, releaseDrafts, updateOrder } from "@/server/actions/orders";
import { VariantDescInput, specKey, type VariantValue } from "@/components/factory/VariantDescInput";
import { productHasSeatSpecs, designLabel } from "@/lib/variant-descriptor";
import { uploadStorageImage } from "@/server/actions/storage";
import { createStoragePath } from "@/lib/storage/paths";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";

import { OrderTypeBadge } from "@/components/factory/OrderTypeBadge";
import { ProductionCard } from "@/components/factory/ProductionCard";
import { DesignReference } from "@/components/factory/DesignReference";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/design/Table";

type OrdersClientProps = {
  mode?: "production" | "orderTaking";
  data: any;
  factoryId: string;
  runningOrders: any[];
  inspections?: any[];
  totalCheckpoints?: number;
  userRole?: string;
};

function getColorIndicator(colorName: string) {
  const clean = colorName.toLowerCase().trim();
  if (clean.includes("black")) return "⚫";
  if (clean.includes("beige") || clean.includes("cream")) return "🟡";
  if (clean.includes("tan") || clean.includes("brown")) return "🟤";
  if (clean.includes("red") || clean.includes("cherry")) return "🔴";
  if (clean.includes("grey") || clean.includes("gray")) return "⚪";
  if (clean.includes("white")) return "⚪";
  if (clean.includes("blue")) return "🔵";
  if (clean.includes("green")) return "🟢";
  return "●";
}

export function OrdersClient({ data, factoryId, runningOrders, inspections = [], totalCheckpoints = 1, mode = "production", userRole }: OrdersClientProps) {
  const isOrderTaking = mode === "orderTaking";
  // Store managers can only book customer (on-ordered) productions — no stock
  // production, and the mode toggle is hidden and locked to On Ordered.
  const onlyOnOrdered = isOrderTaking || userRole === "STORE_MANAGER";
  // Only owner/manager staffing a production assign per-department workers. Store
  // managers (and the order-taking surface) never do — the order lands unstaffed
  // in the owner's Pending queue for the owner to assign before release.
  const canAssignWorkers = !isOrderTaking && userRole !== "STORE_MANAGER";
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { brands, models, materials, designs, colors, workers, inspectors, customers = [], departments = [] } = data;

  // Per-department assignment: which worker does each stage — QC included. The
  // department's supervisor approves the stage (for QC, the inspection review);
  // supervisors are never picked here as the doer. Seeded to each department's
  // first worker.
  const deptWorkers = (d: any) => (d.members ?? []).filter((m: any) => m.role === "WORKER");
  const [deptAssignments, setDeptAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (departments as any[]).map((d) => [d.id, deptWorkers(d)[0]?.id ?? ""])
    )
  );
  const setDeptAssignment = (deptId: string, userId: string) =>
    setDeptAssignments((prev) => ({ ...prev, [deptId]: userId }));

  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<"orders" | "drafts" | "batches">("orders");
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [releasing, setReleasing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [partialStock, setPartialStock] = useState<{ availableQty: number; requestedQty: number; payload: any } | null>(null);
  const [isOnOrdered, setIsOnOrdered] = useState(mode === "orderTaking" || userRole === "STORE_MANAGER");
  // Retail / Dealer / OEM / Internal. A dealer order is just orderType=DEALER —
  // no separate dealer entity. Only meaningful for on-ordered (customer) work.
  const [orderType, setOrderType] = useState<"RETAIL" | "DEALER" | "OEM" | "INTERNAL">("RETAIL");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");
  // Set while editing a pending production in the studio; submit then updates
  // that order instead of creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  // V2 product states
  const productTypes = data.productTypes || [];
  const combinations = data.combinations || [];
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>(productTypes[0]?.id || "");

  // Progressive product-combination selection (Brand → Model → Generation →
  // Category → Product). Narrowing this drives auto-population of the vehicle +
  // spec fields below, so a valid Carxen configuration never has to be
  // hand-configured. Applies identically in single and batch mode.
  const [combo, setCombo] = useState<{ brand: string; model: string; generation: string; category: string; product: string }>(
    { brand: "", model: "", generation: "", category: "", product: "" }
  );
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

  const [draft, setDraft] = useState(() => ({
    customerName: "",
    customerPhone: "",
    // No vehicle is pre-selected: the studio is search-driven now, and defaulting
    // to the first brand/model made the variant box read as a vehicle the user
    // never chose. Submit already requires a vehicle, so empty is safe.
    vehicleBrandId: "",
    vehicleModelId: "",
    vehicleYear: "",
    materialId: materials[0]?.id ?? "",
    designId: designs[0]?.id ?? "",
    colorId: colors[0]?.id ?? "",
    quantity: 1,
    assignedWorkerId: workers[0]?.id ?? "",
    inspectorId: inspectors[0]?.id ?? "",
    seatType: "Double Back",
    hasArmrest: false,
    headrestCount: 4,
    remarks: "",
    photoReference: "",
  }));
  const [batchLines, setBatchLines] = useState<Array<{
    id: string;
    quantity: number;
    productionType: "STOCK" | "ORDER";
    customerName: string;
    customerPhone: string;
    vehicleBrandId: string;
    vehicleModelId: string;
    vehicleYear: string;
    materialId: string;
    designId: string;
    colorId: string;
    seatType: string;
    hasArmrest: boolean;
    headrestCount: number;
    notes: string;
    product?: string;
  }>>([]);

  const [carSearchQuery, setCarSearchQuery] = useState("");
  const [showCarSuggestions, setShowCarSuggestions] = useState(false);

  const currentVehicleDisplay = useMemo(() => {
    const brandObj = brands.find((b: any) => b.id === draft.vehicleBrandId);
    const modelObj = models.find((m: any) => m.id === draft.vehicleModelId);
    const bName = brandObj?.name || draft.vehicleBrandId || "";
    const mName = modelObj?.name || draft.vehicleModelId || "";
    if (!bName && !mName) return "";
    return `${bName} ${mName}`.trim();
  }, [brands, models, draft.vehicleBrandId, draft.vehicleModelId]);

  useEffect(() => {
    if (isStudioOpen && currentVehicleDisplay) {
      setCarSearchQuery(currentVehicleDisplay);
    }
  }, [isStudioOpen, currentVehicleDisplay]);

  useEffect(() => {
    if (!isBatchMode) return;
    if (batchLines.length > 0) return;
    setBatchLines([
      {
        id: crypto.randomUUID(),
        quantity: Number(draft.quantity) || 1,
        productionType: isOnOrdered ? "ORDER" : "STOCK",
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        vehicleBrandId: draft.vehicleBrandId,
        vehicleModelId: draft.vehicleModelId,
        vehicleYear: draft.vehicleYear,
        materialId: draft.materialId,
        designId: draft.designId,
        colorId: draft.colorId,
        seatType: draft.seatType,
        hasArmrest: draft.hasArmrest,
        headrestCount: Number(draft.headrestCount) || 0,
        notes: "",
      },
    ]);
  }, [isBatchMode, batchLines.length, draft.vehicleBrandId, draft.vehicleModelId, draft.vehicleYear, draft.materialId, draft.designId, draft.colorId, draft.seatType, draft.hasArmrest, draft.headrestCount, draft.quantity]);

  const vehicleSuggestions = useMemo(() => {
    if (!carSearchQuery.trim()) return [];
    const query = carSearchQuery.toLowerCase();
    const matches: Array<{ brand: string; model: string; dbBrandId: string; dbModelId: string; year: string }> = [];

    // Match strictly existing database brands and models (Catalogue & Master Sheet only)
    models.forEach((m: any) => {
      const bName = m.brand?.name || "";
      const mName = m.name || "";
      const year = m.year || "";
      const full = `${bName} ${mName} ${year}`.toLowerCase();
      if (full.includes(query) || bName.toLowerCase().includes(query) || mName.toLowerCase().includes(query) || year.toLowerCase().includes(query)) {
        matches.push({
          brand: bName,
          model: mName,
          dbBrandId: m.brandId,
          dbModelId: m.id,
          year: year
        });
      }
    });

    return matches.slice(0, 15);
  }, [models, carSearchQuery]);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [workerFilter, setWorkerFilter] = useState<string>("ALL");

  const searchParams = useSearchParams();
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const isNewParam = searchParams.get("new") === "true";

  useEffect(() => {
    if (isNewParam) setIsStudioOpen(true);
  }, [isNewParam]);

  useEffect(() => {
    if (!isBatchMode || batchLines.length > 0) return;
    setBatchLines([
      {
        id: crypto.randomUUID(),
        quantity: 1,
        productionType: isOnOrdered ? "ORDER" : "STOCK",
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        vehicleBrandId: draft.vehicleBrandId,
        vehicleModelId: draft.vehicleModelId,
        vehicleYear: draft.vehicleYear,
        materialId: draft.materialId,
        designId: draft.designId,
        colorId: draft.colorId,
        seatType: draft.seatType,
        hasArmrest: draft.hasArmrest,
        headrestCount: draft.headrestCount,
        notes: "",
      },
    ]);
  }, [isBatchMode, batchLines.length, draft.vehicleBrandId, draft.vehicleModelId, draft.vehicleYear, draft.materialId, draft.designId, draft.colorId, draft.seatType, draft.hasArmrest, draft.headrestCount]);

  const draftOrders = useMemo(
    () => runningOrders.filter((item: any) => item.status === "DRAFT" && (
      !search ||
      item.orderNumber?.toLowerCase().includes(search) ||
      item.customer?.name?.toLowerCase().includes(search) ||
      item.vehicleBrand?.name?.toLowerCase().includes(search) ||
      item.vehicleModel?.name?.toLowerCase().includes(search)
    )),
    [runningOrders, search]
  );

  const matchesStatusFilter = (item: any) => {
    if (statusFilter === "ALL") return true;
    const ps: string = item.productionStatus ?? "";
    const hasRework = (item.batches ?? []).some((b: any) => b.status === "REWORK_REQUIRED");
    switch (statusFilter) {
      case "READY":
        return item.status === "READY" || ps === "READY_FOR_DISPATCH";
      case "IN_PRODUCTION":
        return item.status === "IN_PRODUCTION";
      case "IN_PROGRESS":
        return ps.endsWith("_IN_PROGRESS") || ps.startsWith("READY_FOR_") ? ps !== "READY_FOR_DISPATCH" && ps !== "READY_FOR_QC" : false;
      case "WAITING_QC":
        return ps === "READY_FOR_QC" || ps === "QC_IN_PROGRESS";
      case "REJECTED":
        return hasRework;
      default:
        return item.status === statusFilter;
    }
  };

  const openOrders = useMemo(
    () => runningOrders.filter((item: any) => {
      if (item.status === "APPROVED") return false;
      if (item.status === "DRAFT") return false;
      // item.status is the SalesOrder status (DRAFT/APPROVED/IN_PRODUCTION/
      // READY/DISPATCHED). The floor-facing filters describe where the job
      // physically is, which lives on the derived pipeline status — comparing
      // them against item.status matched nothing and blanked the list.
      if (!matchesStatusFilter(item)) return false;
      if (workerFilter !== "ALL" && item.worker?.id !== workerFilter) return false;
      if (!search) return true;
      return (
        item.orderNumber?.toLowerCase().includes(search) ||
        item.customer?.name?.toLowerCase().includes(search) ||
        item.vehicleBrand?.name?.toLowerCase().includes(search) ||
        item.vehicleModel?.name?.toLowerCase().includes(search) ||
        item.batches?.[0]?.batchNumber?.toLowerCase().includes(search)
      );
    }),
    [runningOrders, search, statusFilter, workerFilter]
  );

  const filteredModels = useMemo(
    () => models.filter((model: any) => model.brandId === draft.vehicleBrandId),
    [draft.vehicleBrandId, models],
  );

  const filteredInspections = useMemo(
    () =>
      inspections.filter((ins) => {
        const orderNumber = ins.batch?.order?.orderNumber?.toLowerCase() || "";
        const batchNumber = ins.batch?.batchNumber?.toLowerCase() || "";
        const q = search.toLowerCase();
        return orderNumber.includes(q) || batchNumber.includes(q);
      }),
    [inspections, search]
  );

  useEffect(() => {
    if (!isBatchMode) return;
    setBatchLines((prev) => prev.map((line) => ({
      ...line,
      vehicleBrandId: draft.vehicleBrandId,
      vehicleModelId: draft.vehicleModelId,
      vehicleYear: draft.vehicleYear,
    })));
  }, [isBatchMode, draft.vehicleBrandId, draft.vehicleModelId, draft.vehicleYear]);

  const batchQuantityTotal = useMemo(
    () => batchLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
    [batchLines]
  );

  function updateDraft(patch: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  // Options at each tier are filtered by the tiers already chosen, so invalid
  // combinations can't be assembled and each dropdown only offers what leads to
  // a real configuration.
  const comboOptions = useMemo(() => {
    const uniq = (arr: any[]) => [...new Set(arr.map((v) => (v ?? "").toString()).filter(Boolean))].sort();
    const match = (c: any, upto: number) =>
      (upto < 1 || !combo.brand || c.brand === combo.brand) &&
      (upto < 2 || !combo.model || c.model === combo.model) &&
      (upto < 3 || !combo.generation || (c.generation || "") === combo.generation) &&
      (upto < 4 || !combo.category || (c.category || "") === combo.category) &&
      (upto < 5 || !combo.product || (c.product || "") === combo.product);
    const matched = combinations.filter((c: any) => match(c, 5));
    return {
      brands: uniq(combinations.map((c: any) => c.brand)),
      models: uniq(combinations.filter((c: any) => match(c, 1)).map((c: any) => c.model)),
      generations: uniq(combinations.filter((c: any) => match(c, 2)).map((c: any) => c.generation)),
      categories: uniq(combinations.filter((c: any) => match(c, 3)).map((c: any) => c.category)),
      products: uniq(combinations.filter((c: any) => match(c, 4)).map((c: any) => c.product)),
      matched,
    };
  }, [combinations, combo]);

  // Resolve a combination's brand/model names to existing catalog ids where
  // possible (createOrder also accepts raw names, so unmatched names still work).
  function resolveVehicleIds(brandName: string, modelName: string) {
    const b = brands.find((x: any) => x.name?.toLowerCase() === brandName?.toLowerCase());
    const brandId = b?.id ?? brandName ?? "";
    const m = models.find(
      (x: any) => x.name?.toLowerCase() === modelName?.toLowerCase() && (!b || x.brandId === b.id)
    );
    const modelId = m?.id ?? modelName ?? "";
    return { brandId, modelId };
  }

  // Push a resolved combination row into the draft (and, in batch mode, every
  // existing line + future seeds): vehicle + all spec attributes auto-fill;
  // only Fabric / Design / Colour stay for manual choice.
  function applyCombinationRow(row: any) {
    const { brandId, modelId } = resolveVehicleIds(row.brand, row.model);
    const seat = row.seatType === "SB" ? "Single Back" : "Double Back";
    updateDraft({
      vehicleBrandId: brandId,
      vehicleModelId: modelId,
      vehicleYear: row.generation || draft.vehicleYear,
      seatType: seat,
      hasArmrest: !!row.armrest,
      headrestCount: Number(row.headrests) || 4,
    });
    setCarSearchQuery(`${row.brand} ${row.model}${row.generation ? " " + row.generation : ""}`.trim());
    if (isBatchMode) {
      setBatchLines((prev) =>
        prev.map((line) => ({
          ...line,
          vehicleBrandId: brandId,
          vehicleModelId: modelId,
          vehicleYear: row.generation || line.vehicleYear,
          seatType: seat,
          hasArmrest: !!row.armrest,
          headrestCount: Number(row.headrests) || 4,
        }))
      );
    }
  }

  // Whenever the combination selection narrows to exactly one valid row, apply
  // it automatically — the "auto-select dependent specifications" behaviour.
  useEffect(() => {
    if (!isStudioOpen) return;
    if (!combo.brand) return;
    if (comboOptions.matched.length === 1) {
      applyCombinationRow(comboOptions.matched[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo, isStudioOpen]);

  function patchCombo(patch: Partial<typeof combo>) {
    // Selecting an upper tier resets the tiers below it so the filter stays valid.
    setCombo((cur) => {
      const next = { ...cur, ...patch };
      if ("brand" in patch) { next.model = ""; next.generation = ""; next.category = ""; next.product = ""; }
      else if ("model" in patch) { next.generation = ""; next.category = ""; next.product = ""; }
      else if ("generation" in patch) { next.category = ""; next.product = ""; }
      else if ("category" in patch) { next.product = ""; }
      return next;
    });
  }

  // ---- Variant Description (structured combobox) <-> field sync ----
  const fabricNames = useMemo(() => materials.map((m: any) => m.name).filter(Boolean), [materials]);
  const designNames = useMemo(() => designs.map((d: any) => designLabel(d.name, d.category)).filter(Boolean), [designs]);
  // Designs carry their family so the variant search can ask for the family
  // first (ULTRA, PRO SERIES...) and then the designs inside it.
  const designOptions = useMemo(() => designs.map((d: any) => ({ name: d.name, family: (d.category ?? "").trim(), label: designLabel(d.name, d.category) })).filter((d: any) => d.name), [designs]);

  // Master-data fallback catalog so the variant search works even with zero
  // ProductCombination rows: vehicle tables + product types drive suggestions.
  const variantCatalog = useMemo(() => ({
    brands: brands.map((b: any) => b.name).filter(Boolean),
    models: models.map((m: any) => ({
      brand: m.brand?.name ?? brands.find((b: any) => b.id === m.brandId)?.name ?? "",
      name: m.name,
      generations: [
        ...((m.generations ?? []).map((g: any) => g.name)),
        ...(m.year ? [m.year] : []),
      ].filter(Boolean),
    })),
    products: [
      ...productTypes.map((pt: any) => pt.name),
      ...(data.products ?? []).map((p: any) => p.name),
    ].filter(Boolean),
  }), [brands, models, productTypes, data.products]);

  // Per Model+Generation spec constraints, so the variant search never offers
  // impossible specs (e.g. "Alto 7HDR"). Empty allowances = everything allowed,
  // so the search keeps working unchanged until the owner curates a generation.
  const specConstraints = useMemo(() => {
    const map: Record<string, { seatTypes: ("SB" | "DB")[]; headrests: number[]; armrests: ("Arm" | "No Arm")[] }> = {};
    for (const m of models as any[]) {
      const brandName = m.brand?.name ?? brands.find((b: any) => b.id === m.brandId)?.name ?? "";
      for (const g of m.generations ?? []) {
        const seatTypes = (g.allowedSeatTypes ?? [])
          .map((s: string) => (s === "Single Back" ? "SB" : s === "Double Back" ? "DB" : s))
          .filter((s: string): s is "SB" | "DB" => s === "SB" || s === "DB");
        map[specKey(brandName, m.name, g.name)] = {
          seatTypes,
          headrests: (g.allowedHeadrests ?? []) as number[],
          armrests: (g.allowedArmrests ?? []).filter((a: string): a is "Arm" | "No Arm" => a === "Arm" || a === "No Arm"),
        };
      }
    }
    return map;
  }, [models, brands]);

  // Current selection expressed as a VariantValue (drives the input's text).
  const selectedBrandName = brands.find((b: any) => b.id === draft.vehicleBrandId)?.name ?? "";
  const selectedModelName = models.find((m: any) => m.id === draft.vehicleModelId)?.name ?? "";
  const variantValue: VariantValue = useMemo(() => ({
    brand: combo.brand || selectedBrandName,
    model: combo.model || selectedModelName,
    generation: combo.generation || draft.vehicleYear || "",
    product: combo.product || productTypes.find((pt: any) => pt.id === selectedProductTypeId)?.name || "",
    seatType: draft.seatType === "Single Back" ? "SB" : "DB",
    headrests: Number(draft.headrestCount) || null,
    armrest: !!draft.hasArmrest,
    fabricName: materials.find((m: any) => m.id === draft.materialId)?.name ?? "",
    designName: (() => { const d = designs.find((x: any) => x.id === draft.designId); return d ? designLabel(d.name, d.category) : ""; })(),
    colorName: colors.find((c: any) => c.id === draft.colorId)?.name ?? "",
  }), [combo, selectedBrandName, selectedModelName, draft.vehicleYear, selectedProductTypeId, productTypes, draft.seatType, draft.headrestCount, draft.hasArmrest, draft.materialId, draft.designId, draft.colorId, materials, designs, colors]);

  // Section 3 renders whatever spec fields the product type defines, and those
  // wrote only to dynamicFields. The variant line is built from draft.seatType /
  // headrestCount / hasArmrest, so editing a spec never moved the line in single
  // mode. Map the recognisable spec fields onto the draft so both directions
  // agree, in whichever shape section 3 happens to be rendering.
  function syncDraftFromSpecField(fieldName: string, value: string) {
    const n = (fieldName || "").toLowerCase();
    if (/headrest|hdr/.test(n)) {
      const num = parseInt(String(value), 10);
      if (Number.isFinite(num)) updateDraft({ headrestCount: num });
    } else if (/arm/.test(n)) {
      updateDraft({ hasArmrest: /^(yes|true|with|arm)/i.test(String(value)) });
    } else if (/seat\s*type|back|bench/.test(n)) {
      if (/single|\bsb\b/i.test(String(value))) updateDraft({ seatType: "Single Back" });
      else if (/double|\bdb\b/i.test(String(value))) updateDraft({ seatType: "Double Back" });
    }
  }

  // The reverse: a variant chosen from the search line fills the spec fields so
  // section 3 visibly reflects it.
  function syncSpecFieldsFromDraft(seatType: string, headrests: number | null, armrest: boolean) {
    const fields = productTypes.find((pt: any) => pt.id === selectedProductTypeId)?.fields ?? [];
    if (fields.length === 0) return;

    // The field's button highlights when its value exactly equals one of its
    // option strings. Those options are author-defined ("Single Back"/"Double
    // Back", or "SB"/"DB", or "Single"/"Double"), so writing a fixed abbreviation
    // like "DB" left a "Single Back"/"Double Back" toggle unselected — the draft
    // updated but the button never lit up. Resolve the value against the field's
    // real options instead.
    const optionsOf = (f: any): string[] => {
      try {
        return typeof f.options === "string" ? JSON.parse(f.options) : (f.options ?? []);
      } catch {
        return [];
      }
    };
    const pickSeatOption = (opts: string[]): string => {
      const abbr = seatType === "Single Back" ? "sb" : "db";
      const first = seatType.split(" ")[0].toLowerCase(); // "single" | "double"
      return (
        opts.find((o) => o.toLowerCase() === seatType.toLowerCase()) ??
        opts.find((o) => o.toLowerCase() === abbr) ??
        opts.find((o) => o.toLowerCase().includes(first)) ??
        seatType
      );
    };
    const pickFromOptions = (opts: string[], wanted: string): string =>
      opts.find((o) => o.toLowerCase() === wanted.toLowerCase()) ?? wanted;

    setDynamicFields((prev: any) => {
      const next = { ...prev };
      for (const f of fields) {
        const n = (f.name || "").toLowerCase();
        const opts = optionsOf(f);
        if (/headrest|hdr/.test(n) && headrests) next[f.id] = pickFromOptions(opts, String(headrests));
        else if (/arm/.test(n)) next[f.id] = pickFromOptions(opts, armrest ? "Yes" : "No");
        else if (/seat\s*type|back|bench/.test(n) && seatType) next[f.id] = pickSeatOption(opts);
      }
      return next;
    });
  }

  // Parse result from the variant-desc input → combination + spec + fabric/design fields.
  function applyVariantValue(v: VariantValue) {
    // Category is implied by the narrowed combination row (the desc skips it).
    const row = combinations.find((c: any) =>
      (!v.brand || c.brand === v.brand) && (!v.model || c.model === v.model) &&
      (!v.generation || (c.generation || "") === v.generation) && (!v.product || (c.product || "") === v.product));
    setCombo({ brand: v.brand, model: v.model, generation: v.generation, category: row?.category ?? "", product: v.product });

    const { brandId, modelId } = resolveVehicleIds(v.brand, v.model);
    const fabric = materials.find((m: any) => m.name.toLowerCase() === v.fabricName.toLowerCase());
    const design = designs.find((d: any) => designLabel(d.name, d.category).toLowerCase() === v.designName.toLowerCase() || d.name.toLowerCase() === v.designName.toLowerCase());
    const color = v.colorName ? colors.find((c: any) => c.name.toLowerCase() === v.colorName.toLowerCase()) : null;

    // A plain vehicle search collapses the spec permutations, so the picked
    // variant usually carries no SB/DB or headrest count. Leaving them unset made
    // Section 3 render with nothing selected — the "autoselect leaves out SB/DB"
    // report. For a seat cover we therefore resolve a concrete spec: the one on
    // the variant if present, otherwise the draft's current value (which has a
    // sensible default), so the field is always populated.
    const seatSpecs = productHasSeatSpecs(v.product);
    const resolvedSeat = !seatSpecs
      ? ""
      : v.seatType
        ? (v.seatType === "SB" ? "Single Back" : "Double Back")
        : (draft.seatType || "Double Back");
    const resolvedHeadrests = !seatSpecs ? null : (v.headrests ?? (Number(draft.headrestCount) || 4));

    updateDraft({
      ...(v.brand ? { vehicleBrandId: brandId } : {}),
      ...(v.model ? { vehicleModelId: modelId } : {}),
      ...(v.generation ? { vehicleYear: v.generation } : {}),
      ...(resolvedSeat ? { seatType: resolvedSeat } : {}),
      ...(resolvedHeadrests ? { headrestCount: resolvedHeadrests } : {}),
      hasArmrest: v.armrest,
      ...(fabric ? { materialId: fabric.id } : {}),
      ...(design ? { designId: design.id } : {}),
      ...(color ? { colorId: color.id } : {}),
    });
    // Product segment drives Section 3's product-type selector too.
    if (v.product) {
      const pt = productTypes.find((p: any) => p.name.toLowerCase() === v.product.toLowerCase());
      if (pt && pt.id !== selectedProductTypeId) setSelectedProductTypeId(pt.id);
    }
    if (v.brand && v.model) {
      setCarSearchQuery(`${v.brand} ${v.model}${v.generation ? " " + v.generation : ""}`.trim());
    }
    // Mirror the resolved specs into Section 3's fields so the SB/DB and headrest
    // selection is actually visible there, not just held in the draft behind it.
    syncSpecFieldsFromDraft(resolvedSeat, resolvedHeadrests, v.armrest);
  }

  // Per-batch-line variant value (each block owns an editable description).
  function lineVariantValue(line: (typeof batchLines)[number]): VariantValue {
    const brandObj = brands.find((b: any) => b.id === line.vehicleBrandId);
    const modelObj = models.find((m: any) => m.id === line.vehicleModelId);
    return {
      brand: brandObj?.name ?? (line.vehicleBrandId?.startsWith("c") ? "" : line.vehicleBrandId) ?? "",
      model: modelObj?.name ?? (line.vehicleModelId?.startsWith("c") ? "" : line.vehicleModelId) ?? "",
      generation: line.vehicleYear || "",
      product: (line as any).product || combo.product,
      seatType: line.seatType === "Single Back" ? "SB" : "DB",
      headrests: Number(line.headrestCount) || null,
      armrest: !!line.hasArmrest,
      fabricName: materials.find((m: any) => m.id === line.materialId)?.name ?? "",
      designName: (() => { const d = designs.find((x: any) => x.id === line.designId); return d ? designLabel(d.name, d.category) : ""; })(),
      colorName: colors.find((c: any) => c.id === line.colorId)?.name ?? "",
    };
  }

  function applyLineVariantValue(lineId: string, v: VariantValue) {
    const { brandId, modelId } = resolveVehicleIds(v.brand, v.model);
    const fabric = materials.find((m: any) => m.name.toLowerCase() === v.fabricName.toLowerCase());
    const design = designs.find((d: any) => designLabel(d.name, d.category).toLowerCase() === v.designName.toLowerCase() || d.name.toLowerCase() === v.designName.toLowerCase());
    const color = v.colorName ? colors.find((c: any) => c.name.toLowerCase() === v.colorName.toLowerCase()) : null;
    updateBatchLine(lineId, {
      ...(v.brand ? { vehicleBrandId: brandId } : {}),
      ...(v.model ? { vehicleModelId: modelId } : {}),
      ...(v.generation ? { vehicleYear: v.generation } : {}),
      ...(v.seatType ? { seatType: v.seatType === "SB" ? "Single Back" : "Double Back" } : {}),
      ...(v.headrests ? { headrestCount: v.headrests } : {}),
      hasArmrest: v.armrest,
      ...(fabric ? { materialId: fabric.id } : {}),
      ...(design ? { designId: design.id } : {}),
      ...(color ? { colorId: color.id } : {}),
      ...(v.product ? ({ product: v.product } as any) : {}),
    } as any);
  }

  function createBatchLine(seed?: Partial<(typeof batchLines)[number]>) {
    return {
      id: crypto.randomUUID(),
      quantity: Number(seed?.quantity) || 1,
      productionType: seed?.productionType ?? (isOnOrdered ? "ORDER" : "STOCK"),
      customerName: seed?.customerName ?? draft.customerName,
      customerPhone: seed?.customerPhone ?? draft.customerPhone,
      vehicleBrandId: seed?.vehicleBrandId ?? draft.vehicleBrandId,
      vehicleModelId: seed?.vehicleModelId ?? draft.vehicleModelId,
      vehicleYear: seed?.vehicleYear ?? draft.vehicleYear,
      materialId: seed?.materialId ?? draft.materialId,
      designId: seed?.designId ?? draft.designId,
      colorId: seed?.colorId ?? draft.colorId,
      seatType: seed?.seatType ?? draft.seatType,
      hasArmrest: seed?.hasArmrest ?? draft.hasArmrest,
      headrestCount: Number(seed?.headrestCount ?? draft.headrestCount) || 4,
      notes: seed?.notes ?? "",
    };
  }

  function updateBatchLine(lineId: string, patch: Partial<(typeof batchLines)[number]>) {
    setBatchLines((prev) => prev.map((item) => (item.id === lineId ? { ...item, ...patch } : item)));
  }

  function handleBrandChange(brandId: string) {
    const nextModels = models.filter((model: any) => model.brandId === brandId);
    setDraft((current) => ({
      ...current,
      vehicleBrandId: brandId,
      vehicleModelId: nextModels[0]?.id ?? "",
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Unable to read image file."));
        reader.readAsDataURL(file);
      });

      const path = createStoragePath({
        factoryId,
        scope: "orders",
        id: draft.vehicleBrandId || "general",
        fileName: file.name,
      });
      const result = await uploadStorageImage({
        path,
        dataUrl,
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        size: file.size,
      });

      updateDraft({ photoReference: result.publicUrl });
      toast.success("Image stored in Supabase.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload image.";
      console.error("Order image upload failed:", err);
      toast.error(message);
    } finally {
      e.target.value = "";
      setUploadingImage(false);
    }
  }

  function openImagePicker() {
    const input = fileInputRef.current;
    if (!input) return;

    const picker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
    if (typeof picker === "function") {
      picker.call(input);
      return;
    }

    input.click();
  }

  // Resolve a flagged partial-stock order: SPLIT uses stock + produces the
  // shortfall (one order id, batchable); PRODUCE_ALL ignores stock.
  async function resolvePartial(decision: "SPLIT" | "PRODUCE_ALL") {
    if (!partialStock) return;
    setLoading(true);
    try {
      const res: any = await createOrder({ ...partialStock.payload, stockDecision: decision } as any);
      if (res?.error) { toast.error(res.error); return; }
      toast.success(decision === "SPLIT"
        ? `${partialStock.availableQty} from stock, ${partialStock.requestedQty - partialStock.availableQty} sent to Pending.`
        : `Producing all ${partialStock.requestedQty} — saved to Pending.`);
      setPartialStock(null);
      setDraft((c) => ({ ...c, customerName: "", customerPhone: "", quantity: 1 }));
      setIsStudioOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  // Open the studio pre-filled with a pending production for editing.
  function openEditDraft(order: any) {
    const cust = order.customer?.name && order.customer.name.toLowerCase() !== "stock production";
    setEditingId(order.id);
    setIsOnOrdered(onlyOnOrdered ? true : !!cust);
    setOrderType((order.orderType as any) ?? "RETAIL");
    setIsBatchMode(false);
    if (order.productTypeId) setSelectedProductTypeId(order.productTypeId);
    setDraft((cur) => ({
      ...cur,
      customerName: cust ? order.customer.name : "",
      customerPhone: order.customer?.phone ?? "",
      vehicleBrandId: order.vehicleBrand?.id ?? order.vehicleBrandId ?? "",
      vehicleModelId: order.vehicleModel?.id ?? order.vehicleModelId ?? "",
      vehicleYear: order.vehicleYear ?? "",
      materialId: order.materialId ?? cur.materialId,
      designId: order.designId ?? cur.designId,
      colorId: order.colorId ?? cur.colorId,
      seatType: order.seatType ?? "Double Back",
      hasArmrest: !!order.hasArmrest,
      headrestCount: Number(order.headrestCount) || 4,
      quantity: Number(order.quantity) || 1,
      remarks: order.remarks ?? "",
    }));
    // Load the order's current per-department worker assignments so the owner
    // sees who (if anyone) is staffed and can fill the gaps.
    const current: Record<string, string> = {};
    for (const b of (order.batches ?? [])) {
      const deptId = b.departmentId ?? b.department?.id;
      const userId = b.assignedToId ?? b.assignedTo?.id ?? b.worker?.id;
      if (deptId && userId) current[deptId] = userId;
    }
    setDeptAssignments((prev) => ({ ...prev, ...current }));
    setIsStudioOpen(true);
  }

  async function submitOrder() {
    setErrors({});
    let newErrors: Record<string, boolean> = {};

    if (isOnOrdered && !draft.customerName.trim()) {
      newErrors.customerName = true;
      toast.error("Customer name is required.");
    }
    
    if (isOnOrdered && !draft.customerPhone.trim()) {
      newErrors.customerPhone = true;
    }
    
    if (!isBatchMode && productTypes.length === 0) {
      if (!draft.vehicleBrandId || !draft.vehicleModelId) {
        newErrors.vehicleSearch = true;
        toast.error("Vehicle model is required.");
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShowConfirm(false);
      return;
    }

    // Editing an existing pending production: update in place, don't create.
    if (editingId) {
      setShowConfirm(false);
      const res: any = await updateOrder(editingId, {
        customerName: isOnOrdered ? draft.customerName.trim() : "Stock Production",
        customerPhone: isOnOrdered ? draft.customerPhone.trim() : "",
        vehicleBrandId: draft.vehicleBrandId,
        vehicleModelId: draft.vehicleModelId,
        vehicleYear: draft.vehicleYear,
        materialId: draft.materialId,
        designId: draft.designId,
        colorId: draft.colorId,
        productTypeId: selectedProductTypeId || undefined,
        seatType: draft.seatType,
        hasArmrest: draft.hasArmrest,
        headrestCount: Number(draft.headrestCount) || 0,
        quantity: Number(draft.quantity) || 1,
        remarks: draft.remarks,
        orderType: isOnOrdered ? orderType : "RETAIL",
        // Owner/manager staffing the pending order before release. Store managers
        // and order-taking never assign.
        assignments: canAssignWorkers ? Object.entries(deptAssignments)
          .filter(([, userId]) => userId)
          .map(([departmentId, userId]) => ({ departmentId, userId })) : undefined,
      });
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Changes saved");
      setEditingId(null);
      setIsStudioOpen(false);
      router.refresh();
      return;
    }

    if (isBatchMode) {
      // Each block carries its own quantity — the batch total is simply their sum.
      const lineTotal = batchLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
      if (batchLines.length === 0 || lineTotal <= 0) {
        toast.error("Add at least one block with a quantity.");
        return;
      }
      if (!draft.vehicleBrandId || !draft.vehicleModelId) {
        newErrors.vehicleSearch = true;
        toast.error("Vehicle model is required for batch mode.");
        setErrors(newErrors);
        setShowConfirm(false);
        return;
      }
    }

    // Specs (SB/DB, headrests, armrest) are stored on the order itself, not
    // baked into the model name — so the model is used as-is and never spawns a
    // duplicate "Baleno (SB 4HDR)" entry in master data.
    const resolvedModelId = draft.vehicleModelId;

    const finalDraft = {
      ...draft,
      customerName: isOnOrdered ? draft.customerName.trim() : "Stock Production",
      customerPhone: isOnOrdered ? draft.customerPhone.trim() : "",
      vehicleModelId: resolvedModelId,
      quantity: Number(draft.quantity) || 1,
      headrestCount: Number(draft.headrestCount) || 0,
      productTypeId: selectedProductTypeId || undefined,
      orderType: isOnOrdered ? orderType : "RETAIL",
      dynamicFields,
      batchLines: isBatchMode
        ? (batchLines.length > 0 ? batchLines : [{
            quantity: Number(draft.quantity) || 1,
            customerName: draft.customerName,
            customerPhone: draft.customerPhone,
            vehicleBrandId: draft.vehicleBrandId,
            vehicleModelId: resolvedModelId,
            vehicleYear: draft.vehicleYear,
            materialId: draft.materialId,
            designId: draft.designId,
            colorId: draft.colorId,
            seatType: draft.seatType,
            hasArmrest: draft.hasArmrest,
            headrestCount: Number(draft.headrestCount) || 0,
            notes: draft.remarks,
          }])
        : undefined,
    };

    setLoading(true);
    setShowConfirm(false);

    try {
      // Batch: each line is its own independent production (own passport,
      // workflow, inventory, customer). Lines may mix Stock & Customer-Order.
      if (isBatchMode) {
        const lines = (finalDraft.batchLines || []).map((line: any) => {
          const isOrder = line.productionType === "ORDER";
          return {
            ...finalDraft,
            batchLines: undefined,
            onOrdered: isOrder,
            customerName: isOrder ? (line.customerName?.trim() || draft.customerName.trim()) : "Stock Production",
            customerPhone: isOrder ? (line.customerPhone?.trim() || "") : "",
            vehicleBrandId: line.vehicleBrandId,
            vehicleModelId: line.vehicleModelId,
            vehicleYear: line.vehicleYear,
            materialId: line.materialId,
            designId: line.designId,
            colorId: line.colorId,
            seatType: line.seatType,
            hasArmrest: line.hasArmrest,
            headrestCount: Number(line.headrestCount) || 0,
            quantity: Number(line.quantity) || 1,
            remarks: line.notes || draft.remarks,
            orderType: isOrder ? orderType : "RETAIL",
            productVariantId: (finalDraft as any).productVariantId || "",
          };
        });
        const res: any = await createBatchOrders(lines as any);
        if (res?.error) { toast.error(res.error); return; }
        if (res?.failed > 0) toast.error(`${res.failed} of ${lines.length} lines failed. ${res.created} created.`);
        else toast.success(`Batch saved — ${res.created} productions in Pending. Release them from the Pending tab.`);
        setDraft((current) => ({ ...current, customerName: "", customerPhone: "", quantity: 1 }));
        setBatchLines([]);
        setIsStudioOpen(false);
        router.refresh();
        return;
      }

      // Per-department worker assignments. The QC department's supervisor is the
      // order's inspector (derived from the roster, not picked as a doer).
      // Store managers and the order-taking surface never assign workers — the
      // order lands in the owner's Pending tab for the owner to staff before
      // release.
      const assignments = canAssignWorkers
        ? Object.entries(deptAssignments)
            .filter(([, userId]) => userId)
            .map(([departmentId, userId]) => ({ departmentId, userId }))
        : [];
      const qcDept = (departments as any[]).find((d) => d.isQcStage);
      const qcInspectorId = (qcDept?.members ?? []).find((m: any) => m.role === "SUPERVISOR")?.id ?? "";
      const firstAssigned = assignments[0]?.userId ?? (finalDraft as any).assignedWorkerId ?? "";
      const payload = {
        ...finalDraft,
        assignments,
        assignedWorkerId: firstAssigned,
        inspectorId: qcInspectorId || (finalDraft as any).inspectorId || "",
        onOrdered: isOnOrdered,
        orderType: isOnOrdered ? orderType : "RETAIL",
        expectedDeliveryDate: isOnOrdered && expectedDeliveryDate ? expectedDeliveryDate : undefined,
        productVariantId: (finalDraft as any).productVariantId || "",
      };
      const result = await createOrder(payload as any);
      // Partial stock: not enough to fulfil the whole order. Ask the owner rather
      // than guessing — split (use stock + produce the rest) or produce all.
      if ((result as any)?.partialStock) {
        setPartialStock({ availableQty: (result as any).availableQty, requestedQty: (result as any).requestedQty, payload });
        setLoading(false);
        return;
      }
      if ((result as any)?.fulfilledFromStock) {
        toast.success(`In stock! Assigned from production ${(result as any).sourceOrderNumber} — waiting for dispatch.`);
      }
      const resultError = (result as any)?.error;
      if (resultError) {
        toast.error(`Failed to create order: ${resultError}`);
        return;
      }

      if (!(result as any)?.fulfilledFromStock) {
        toast.success("Saved to Pending — release it to the floor from the Pending tab.");
      }
      setDraft((current) => ({
        ...current,
        customerName: "",
        customerPhone: "",
        quantity: 1,
      }));
      setBatchLines([]);
      setIsStudioOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to create order: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-112px)] overflow-hidden space-y-4">
        <PageHeader
          eyebrow={isOrderTaking ? "Orders" : "Production"}
          title={isOrderTaking ? "Order Taking" : "Productions"}
          description={isOrderTaking
            ? "Take customer orders. In-stock items ship straight from inventory; the rest go to production."
            : "Track active work on the floor. Open the creation studio only when you need a new production."}
          actions={
            <>
              <Button onClick={() => { setEditingId(null); setIsStudioOpen(true); }} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {isOrderTaking ? "New Order" : "New Production"}
              </Button>
            </>
          }
        />

        {/* Tab strip — order takers only see the orders they've taken; no
            Pending/production-management view. */}
        <div className="flex items-center gap-6 border-b border-border px-2 shrink-0">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "orders" ? "border-b-2 border-brand text-brand" : "text-text-secondary hover:text-text-primary"}`}
          >
            {isOrderTaking ? "Orders" : "Production"}
          </button>
          {!isOrderTaking && (
          <button
            onClick={() => setActiveTab("drafts")}
            className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === "drafts" ? "border-b-2 border-brand text-brand" : "text-text-secondary hover:text-text-primary"}`}
          >
            Pending
            {draftOrders.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === "drafts" ? "bg-brand-soft text-brand" : "bg-surface-2 text-text-tertiary"}`}>
                {draftOrders.length}
              </span>
            )}
          </button>
          )}
        </div>

        {/* Stat cards */}
        {activeTab === "orders" && (
          <div className="grid gap-4 md:grid-cols-4 shrink-0">
            <StatCard label="Open orders" value={openOrders.length.toString()} hint="On the floor" />
            <StatCard label="Active workers" value={workers.length.toString()} hint="Assigned people" />
            <StatCard label="Inspectors" value={inspectors.length.toString()} hint="Quality team" />
            <StatCard label="Templates" value={designs.length.toString()} hint="Ready to use" />
          </div>
        )}

        <Surface className="flex flex-col min-h-0 flex-1 overflow-hidden" allowFullscreen={true}>
          {activeTab === "orders" ? (
            <>
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-surface-2/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Status:</span>
                {((isOrderTaking ? ["ALL", "READY", "IN_PRODUCTION", "IN_PROGRESS", "WAITING_QC", "REJECTED"] : ["ALL", "IN_PROGRESS", "WAITING_QC", "REJECTED"]) as readonly string[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      statusFilter === s
                        ? "bg-[var(--brand)] text-white border-transparent"
                        : "bg-transparent text-text-secondary border-border hover:bg-surface-2"
                    }`}
                  >
                    {s === "ALL" ? "All" : s === "READY" ? "Ready (Stock)" : s === "IN_PRODUCTION" ? "In Production" : s === "IN_PROGRESS" ? "Production" : s === "WAITING_QC" ? "Quality Check" : "Rework"}
                  </button>
                ))}
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Worker:</span>
                <select
                  value={workerFilter}
                  onChange={(e) => setWorkerFilter(e.target.value)}
                  className="h-7 rounded-xl border border-border bg-surface text-xs text-text-primary px-2 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                >
                  <option value="ALL">All Workers</option>
                  {workers.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {openOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
                  <Box className="mb-3 h-12 w-12 text-text-tertiary" />
                  <p className="text-base font-semibold tracking-[-0.03em] text-text-primary">No active production in the pipeline.</p>
                  <p className="mt-2 max-w-md text-sm text-text-secondary">Start a new production from the creation studio to push work onto the floor.</p>
                  <Button variant="secondary" className="mt-5" onClick={() => { setEditingId(null); setIsStudioOpen(true); }}>Open creation studio</Button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto overflow-x-auto">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Setup</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openOrders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-sm font-semibold text-brand-strong">{order.quantity}</div>
                                <div>
                                  <p className="font-semibold tracking-[-0.02em] text-text-primary">{order.orderNumber}</p>
                                  <p className="text-xs text-text-tertiary">Batch {order.batches?.[0]?.batchNumber ?? "Pending"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-text-primary">{order.customer?.name}</span>
                                <OrderTypeBadge orderType={order.orderType} />
                              </div>
                              <div className="mt-1 text-xs text-text-tertiary">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-text-primary">{order.vehicleBrand?.name} {order.vehicleModel?.name}</div>
                              <div className="mt-1 text-xs text-text-tertiary">{order.vehicleYear}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-text-secondary">
                                <div>{order.design?.name}</div>
                                <div className="mt-1">{order.material?.name} • {order.color?.name}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <PipelineBadge order={order} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                href={`/owner/production/label/${order.id}`}
                                title="Production label"
                                className="inline-flex items-center gap-2 rounded-[12px] border border-border bg-background px-3 py-2 mr-2 text-sm font-semibold text-text-primary transition hover:bg-surface-2"
                              >
                                <Printer className="h-4 w-4" />
                              </Link>
                              {(() => {
                                // The inspection lives on the QC-stage card, not necessarily the first one.
                                const inspection = order.batches?.find((b: any) => b.inspection)?.inspection;
                                return inspection ? (
                                  <Link href={`/owner/review/${inspection.id}`} className="inline-flex items-center gap-2 rounded-[12px] border border-border bg-background px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-surface-2">
                                    <ClipboardCheck className="h-4 w-4" /> Track
                                  </Link>
                                ) : null;
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden space-y-4 p-4">
                    {openOrders.map((order: any) => (
                      <div key={order.id} className="rounded-[18px] border border-border bg-background p-4 space-y-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-sm font-semibold text-brand-strong shrink-0">{order.quantity}</div>
                            <div>
                              <p className="font-semibold text-text-primary">{order.orderNumber}</p>
                              <p className="text-xs text-text-tertiary">Batch {order.batches?.[0]?.batchNumber ?? "Pending"}</p>
                            </div>
                          </div>
                          <PipelineBadge order={order} />
                        </div>
                        <div className="border-t border-border/60" />
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-text-tertiary uppercase font-bold tracking-wider text-[9px]">Customer</p>
                            <p className="font-medium text-text-primary mt-0.5 truncate flex items-center gap-1.5">{order.customer?.name} <OrderTypeBadge orderType={order.orderType} /></p>
                          </div>
                          <div>
                            <p className="text-text-tertiary uppercase font-bold tracking-wider text-[9px]">Vehicle</p>
                            <p className="font-medium text-text-primary mt-0.5 truncate">{order.vehicleBrand?.name} {order.vehicleModel?.name} {order.vehicleYear ? `(${order.vehicleYear})` : ""}</p>
                          </div>
                          <div className="col-span-2 mt-1">
                            <p className="text-text-tertiary uppercase font-bold tracking-wider text-[9px]">Setup</p>
                            <p className="text-text-secondary mt-0.5 truncate">{order.design?.name} • {order.material?.name} • {order.color?.name}</p>
                          </div>
                        </div>
                        <div className="pt-2">
                          {(() => {
                            const inspection = order.batches?.find((b: any) => b.inspection)?.inspection;
                            return inspection ? (
                              <Link href={`/owner/review/${inspection.id}`} className="flex h-[40px] items-center justify-center gap-2 rounded-[12px] border border-border bg-background text-sm font-semibold text-text-primary">
                                <ClipboardCheck className="h-4 w-4" /> Track
                              </Link>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : activeTab === "drafts" ? (
            <>
              {/* Drafts queue: accumulate identical orders, then club + release */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0 bg-surface-2/40">
                <p className="text-xs text-text-secondary font-medium">
                  New productions wait here. Select pending productions and release them together — they share one batch number on the floor.
                </p>
                <div className="flex items-center gap-2">
                  {/* Optional schedule: leave blank to send now, or pick a day —
                      workers only see the job when that day arrives. */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Schedule</label>
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="h-9 rounded-xl border border-border bg-surface px-2 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                    />
                    {scheduleDate && (
                      <button onClick={() => setScheduleDate("")} className="text-text-tertiary hover:text-text-primary text-xs" title="Clear — send now">×</button>
                    )}
                  </div>
                  <Button
                    disabled={selectedDrafts.size === 0 || releasing}
                    onClick={async () => {
                      setReleasing(true);
                      try {
                        const res: any = await releaseDrafts([...selectedDrafts], scheduleDate || null);
                        if (res?.error) { toast.error(res.error); return; }
                        toast.success(
                          scheduleDate
                            ? `${res.released} scheduled for ${new Date(scheduleDate).toLocaleDateString()} (${res.batchNumber})`
                            : `${res.released} production${res.released === 1 ? "" : "s"} released as ${res.batchNumber}`
                        );
                        setSelectedDrafts(new Set());
                        setScheduleDate("");
                        router.refresh();
                      } catch (e: any) {
                        toast.error(e.message || "Release failed");
                      } finally {
                        setReleasing(false);
                      }
                    }}
                    className="gap-2"
                  >
                    {releasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {scheduleDate ? "Schedule" : "Send"} {selectedDrafts.size > 0 ? selectedDrafts.size : ""} to Production
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {draftOrders.length === 0 ? (
                  <div className="m-6 rounded-[18px] border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-text-secondary">
                    Nothing pending. New productions land here before going to the floor.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-surface">
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedDrafts.size === draftOrders.length && draftOrders.length > 0}
                            onChange={(e) => setSelectedDrafts(e.target.checked ? new Set(draftOrders.map((o: any) => o.id)) : new Set())}
                            className="h-4 w-4 rounded border-border accent-[var(--brand)] cursor-pointer"
                          />
                        </th>
                        {["Order", "Vehicle", "Customer", "Qty", "Specs", "Created", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {draftOrders.map((order: any) => {
                        const checked = selectedDrafts.has(order.id);
                        // A pending order still needs staffing if any of its
                        // (non-QC) job cards has no assigned worker — the case
                        // when a store manager takes the order.
                        const needsStaffing = (order.batches ?? []).some((b: any) =>
                          !(b.stage?.isQcStage || b.department?.isQcStage) && !(b.assignedToId || b.assignedTo?.id || b.worker?.id)
                        );
                        return (
                          <tr
                            key={order.id}
                            onClick={() => setSelectedDrafts((prev) => {
                              const next = new Set(prev);
                              if (next.has(order.id)) next.delete(order.id); else next.add(order.id);
                              return next;
                            })}
                            className={`cursor-pointer transition-colors ${checked ? "bg-[var(--brand)]/5" : "hover:bg-surface-2/60"}`}
                          >
                            <td className="px-4 py-3.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                className="h-4 w-4 rounded border-border accent-[var(--brand)] cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs font-semibold text-text-secondary">
                              <div className="flex items-center gap-1.5">
                                {order.orderNumber}
                                {needsStaffing && (
                                  <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warning" title="Assign department workers before releasing">Needs workers</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-text-primary">
                              {order.vehicleBrand?.name} {order.vehicleModel?.name}{order.vehicleYear ? ` · ${order.vehicleYear}` : ""}
                            </td>
                            <td className="px-4 py-3.5 text-text-secondary">{order.customer?.name ?? "Stock"}</td>
                            <td className="px-4 py-3.5 font-semibold text-text-primary">{order.quantity}</td>
                            <td className="px-4 py-3.5 text-xs text-text-secondary">
                              {order.seatType === "Single Back" ? "SB" : "DB"}
                              {order.headrestCount ? `;${order.headrestCount}HDR` : ""}
                              {order.hasArmrest ? ";Arm" : ""}
                              {order.material?.name ? ` · ${order.material.name}` : ""}
                              {order.design?.name ? ` · ${order.design.name}` : ""}
                            </td>
                            <td className="px-4 py-3.5 text-text-tertiary text-xs">{new Date(order.createdAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openEditDraft(order)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                              >
                                <Pencil className="h-3.5 w-3.5" /> {needsStaffing ? "Assign workers" : "Edit"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 bg-surface-2/40 dark:bg-transparent">
              {filteredInspections.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-text-secondary">
                  No active batches match your search.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredInspections.map((inspection) => (
                    <ProductionCard
                      key={inspection.id}
                      id={inspection.id}
                      orderId={inspection.batch?.order?.id}
                      batchNumber={inspection.batch?.batchNumber || "N/A"}
                      orderNumber={inspection.batch?.order?.orderNumber || "N/A"}
                      vehicleName={`${inspection.batch?.order?.vehicleBrand?.name || ""} ${inspection.batch?.order?.vehicleModel?.name || ""} ${inspection.batch?.order?.vehicleYear || ""}`}
                      quantity={inspection.batch?.quantity || 1}
                      workerName={inspection.batch?.order?.worker?.name}
                      workerAvatar={null}
                      workerId={inspection.batch?.order?.workerId}
                      inspectorName={inspection.batch?.order?.inspector?.name}
                      inspectorAvatar={null}
                      inspectorId={inspection.batch?.order?.inspectorId}
                      workers={workers}
                      inspectors={inspectors}
                      status={inspection.status}
                      submissions={inspection.submissions || []}
                      totalCheckpoints={totalCheckpoints}
                      hasReport={!!inspection.report}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </Surface>
      </div>

      <AnimatePresence>
        {isStudioOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/35 backdrop-blur-md"
              onClick={() => { setEditingId(null); setIsStudioOpen(false); }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              className="relative flex max-h-[90vh] w-[min(96vw,96rem)] flex-col overflow-hidden rounded-[30px] border border-border bg-surface shadow-[0_30px_100px_rgba(15,23,42,0.22)]"
            >
              <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Setup Assistant</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                    {editingId ? "Edit production" : "Create production"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setIsStudioOpen(false); }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary transition hover:bg-surface"
                  aria-label="Close creation studio"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid flex-1 min-h-0 gap-0 overflow-y-auto lg:overflow-hidden bg-[radial-gradient(circle_at_top,var(--brand-soft),transparent_40%)] lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
                <div className="space-y-6 p-6 lg:overflow-y-auto">
                   <SectionBlock number="1" title="Customer" description="Enter customer name and contact details." />
                  {!onlyOnOrdered && (
                  <div className="flex items-center gap-3 p-3 bg-surface-secondary/40 dark:bg-surface-secondary/10 border border-border/80 rounded-2xl mb-4">
                    <span className="text-xs font-semibold text-text-primary">Production Mode:</span>
                    <div className="flex rounded-xl bg-surface-secondary p-1 border border-border/60">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOnOrdered(false);
                          updateDraft({ customerName: "", customerPhone: "" });
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                          !isOnOrdered 
                            ? "bg-[var(--brand)] text-white shadow-sm" 
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        Stock Production
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsOnOrdered(true)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                          isOnOrdered 
                            ? "bg-[var(--brand)] text-white shadow-sm" 
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        On Ordered
                      </button>
                    </div>
                  </div>
                  )}

                  {combinations.length > 0 && (
                    <div className="rounded-[24px] border border-[var(--brand)]/25 bg-[var(--brand)]/[0.04] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                          <p className="text-xs font-bold text-text-primary">Product Combination</p>
                        </div>
                        {combo.brand && (
                          <button type="button" onClick={() => setCombo({ brand: "", model: "", generation: "", category: "", product: "" })}
                            className="text-[11px] font-semibold text-text-tertiary hover:text-text-primary">Reset</button>
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary -mt-1">Pick a valid Carxen configuration — vehicle & specifications auto-fill. Only Fabric, Design & Colour stay manual.</p>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {([
                          ["Brand", "brand", comboOptions.brands],
                          ["Model", "model", comboOptions.models],
                          ["Generation", "generation", comboOptions.generations],
                          ["Category", "category", comboOptions.categories],
                          ["Product", "product", comboOptions.products],
                        ] as const).map(([label, key, opts]) => (
                          <div key={key} className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{label}</label>
                            <Select
                              value={(combo as any)[key]}
                              disabled={key !== "brand" && !combo.brand}
                              onChange={(e) => patchCombo({ [key]: e.target.value } as any)}
                            >
                              <option value="">{key === "brand" ? "Select brand" : (opts.length ? `Any ${label.toLowerCase()}` : "—")}</option>
                              {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                            </Select>
                          </div>
                        ))}
                      </div>
                      {combo.brand && (
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          {comboOptions.matched.length === 1 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Auto-filled: {comboOptions.matched[0].seatType} · {comboOptions.matched[0].headrests} HDR{comboOptions.matched[0].armrest ? " · Armrest" : ""}
                            </span>
                          ) : (
                            <span className="rounded-full bg-surface-2 text-text-secondary px-2.5 py-1 font-semibold">{comboOptions.matched.length} matching configurations — narrow down to auto-fill specs</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {isOnOrdered && !isBatchMode && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Customer Name</label>
                        <Input
                          error={!!errors.customerName}
                          placeholder="Customer name"
                          value={draft.customerName}
                          onChange={(event) => updateDraft({ customerName: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Customer Phone</label>
                        <Input
                          error={!!errors.customerPhone}
                          type="tel"
                          placeholder="Customer phone"
                          value={draft.customerPhone}
                          onChange={(event) => updateDraft({ customerPhone: event.target.value.replace(/\D/g, "").slice(0, 10) })}
                        />
                      </div>
                    </div>
                  )}

                  {isOnOrdered && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Order Type</label>
                      <div className="flex flex-wrap gap-2">
                        {(["RETAIL", "DEALER", "OEM", "INTERNAL"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setOrderType(t)}
                            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                              orderType === t
                                ? "bg-[var(--brand)] text-white border-transparent"
                                : "bg-transparent text-text-secondary border-border hover:bg-surface-2"
                            }`}
                          >
                            {t === "RETAIL" ? "Retail" : t === "DEALER" ? "Dealer" : t === "OEM" ? "OEM" : "Internal"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isOnOrdered && !isBatchMode && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1 sm:col-span-3">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Expected Delivery Date</label>
                        <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 p-3 bg-surface-secondary/25 border border-border/70 rounded-2xl">
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Batch mode</p>
                      <p className="text-[11px] text-text-secondary">Use one variant search with multiple spec splits.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBatchMode((value) => !value)}
                      className={`relative h-8 w-14 rounded-full border transition-all ${isBatchMode ? "bg-[var(--brand)]/15 border-[var(--brand)]/30" : "bg-surface-2 border-border"}`}
                    >
                      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${isBatchMode ? "left-7" : "left-1"}`} />
                    </button>
                  </div>

                  {isBatchMode && (
                    <div className="space-y-6">
                      <div className="rounded-[24px] border border-border bg-surface-2/30 p-4">
                        {/* Blocks carry their own quantities — no separate total field. */}
                        <VariantDescInput
                          combinations={combinations}
                          catalog={variantCatalog}
                          fabricNames={fabricNames}
                          designNames={designNames}
                          designOptions={designOptions}
                          specConstraints={specConstraints}
                          colorNames={colors.map((c: any) => c.name)}
                          value={variantValue}
                          onApply={applyVariantValue}
                        />
                      </div>

                      <div className="rounded-[24px] border border-border bg-surface-2/30 p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-text-primary">Batch specs</p>
                            <p className="text-[11px] text-text-secondary">Each block is its own production with its own quantity and variant.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-text-secondary">
                              {batchQuantityTotal} pcs
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 text-xs"
                              onClick={() => setBatchLines((prev) => [...prev, createBatchLine({ quantity: 1 })])}
                            >
                              Add block
                            </Button>
                          </div>
                        </div>

                        {batchLines.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-border bg-surface p-6 text-sm text-text-secondary">
                            Add one or more blocks. Each block should describe a spec split for the same model and year.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {batchLines.map((line, index) => (
                              <div key={line.id} className="rounded-[22px] border border-border bg-surface p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                  {/* Variant is shown by the block's own search line below — no duplicate title */}
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">Block {index + 1}</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex rounded-xl bg-surface-secondary p-1 border border-border/60">
                                      {(["STOCK", "ORDER"] as const).map((t) => (
                                        <button
                                          key={t}
                                          type="button"
                                          onClick={() => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, productionType: t } : item))}
                                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                            line.productionType === t ? "bg-[var(--brand)] text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
                                          }`}
                                        >
                                          {t === "STOCK" ? "Stock" : "Customer"}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      className="text-xs font-semibold text-danger"
                                      onClick={() => setBatchLines((prev) => prev.filter((item) => item.id !== line.id))}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                {/* Per-block editable variant description (seeds from the main
                                    selection; edits stay local to this block). */}
                                <div className="mt-4">
                                  <VariantDescInput
                                    combinations={combinations}
                                    catalog={variantCatalog}
                                    fabricNames={fabricNames}
                                    designNames={designNames}
                                    designOptions={designOptions}
                                    specConstraints={specConstraints}
                                    colorNames={colors.map((c: any) => c.name)}
                                    value={lineVariantValue(line)}
                                    onApply={(v) => applyLineVariantValue(line.id, v)}
                                    compact
                                  />
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Block Quantity</label>
                                    <Input
                                      type="number"
                                      inputMode="numeric"
                                      min={0}
                                      step={1}
                                      placeholder="Qty"
                                      value={String(line.quantity)}
                                      onChange={(e) => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, quantity: Number(e.target.value) || 0 } : item))}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Notes</label>
                                    <Input
                                      placeholder="Special instructions or remarks..."
                                      value={line.notes}
                                      onChange={(e) => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, notes: e.target.value } : item))}
                                    />
                                  </div>
                                </div>

                                {line.productionType === "ORDER" && (
                                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1 relative">
                                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Customer Name</label>
                                      <Input
                                        error={!!errors.customerName}
                                        placeholder="Customer name"
                                        value={line.customerName}
                                        onChange={(event) => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, customerName: event.target.value } : item))}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Customer Phone</label>
                                      <Input
                                        error={!!errors.customerPhone}
                                        type="tel"
                                        placeholder="Customer phone"
                                        value={line.customerPhone}
                                        onChange={(event) => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, customerPhone: event.target.value.replace(/\D/g, "").slice(0, 10) } : item))}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Seat Type</label>
                                    <div className="flex rounded-xl bg-surface-secondary p-1 border border-border/60 w-fit">
                                      {["Single Back", "Double Back"].map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, seatType: opt } : item))}
                                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                            line.seatType === opt
                                              ? "bg-[var(--brand)] text-white shadow-sm"
                                              : "text-text-secondary hover:text-text-primary"
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Headrest Count</label>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {[2, 4, 5, 6, 7, 8].map((count) => {
                                        const active = line.headrestCount === count;
                                        return (
                                          <button
                                            key={count}
                                            type="button"
                                            onClick={() => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, headrestCount: count } : item))}
                                            className={`h-9 w-9 text-xs font-bold rounded-xl border transition cursor-pointer ${
                                              active
                                                ? "border-brand bg-brand-soft text-brand shadow-sm"
                                                : "border-border bg-surface-2 hover:bg-surface text-text-primary"
                                            }`}
                                          >
                                            {count}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={line.hasArmrest}
                                    onChange={(e) => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, hasArmrest: e.target.checked } : item))}
                                    className="h-4 w-4 rounded border-border accent-[var(--brand)]"
                                  />
                                  <span className="text-sm text-text-primary">Includes Armrest covers (ARM)</span>
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Fabric</label>
                                    <Select value={line.materialId} onChange={(e) => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, materialId: e.target.value } : item))}>
                                      {materials.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Design Finish</label>
                                    <Select value={line.designId} onChange={(e) => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, designId: e.target.value } : item))}>
                                      {Array.from(new Set(designs.map((d: any) => d.category || "Other"))).map((cat: any) => (
                                        <optgroup key={cat} label={cat}>
                                          {designs
                                            .filter((d: any) => (d.category || "Other") === cat)
                                            .map((item: any) => (
                                              <option key={item.id} value={item.id}>{item.name}</option>
                                            ))}
                                        </optgroup>
                                      ))}
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Color Accent</label>
                                    <Select value={line.colorId} onChange={(e) => setBatchLines((prev) => prev.map((item) => item.id === line.id ? { ...item, colorId: e.target.value } : item))}>
                                      {colors.map((item: any) => <option key={item.id} value={item.id}>{getColorIndicator(item.name)} {item.name}</option>)}
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isOnOrdered ? (
                    <div className="p-4 rounded-2xl border border-border bg-surface-secondary/20 dark:bg-surface-secondary/5 text-xs text-text-secondary font-medium">
                      ? Production will be started as standard <strong>Stock Production</strong>. No customer registration required.
                    </div>
                  ) : null}

                  {!isBatchMode && (
                    <>
                      <SectionBlock number="2" title="Variant Search" description="Search or select the brand, model, generation, product, specs, fabrics, design." />
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px] items-start">
                        <VariantDescInput
                          combinations={combinations}
                          catalog={variantCatalog}
                          fabricNames={fabricNames}
                          designNames={designNames}
                          designOptions={designOptions}
                          specConstraints={specConstraints}
                          colorNames={colors.map((c: any) => c.name)}
                          value={variantValue}
                          onApply={applyVariantValue}
                        />

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Quantity</label>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Qty"
                            value={String(draft.quantity)}
                            onChange={(event) => updateDraft({ quantity: Number(event.target.value.replace(/\D/g, "").slice(0, 3)) || 0 })}
                          />
                        </div>
                      </div>
 
                    {productTypes.length > 0 ? (
                    <div className="space-y-4">
                      <SectionBlock number="3" title="Product Specification" description="Choose product type and enter specifications." />
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Select Product Category</label>
                        <Select 
                          className="bg-background"
                          value={selectedProductTypeId} 
                          onChange={(e) => {
                            setSelectedProductTypeId(e.target.value);
                            setDynamicFields({});
                          }}
                        >
                          {productTypes.map((pt: any) => (
                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                          ))}
                        </Select>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {productTypes.find((pt: any) => pt.id === selectedProductTypeId)?.fields.map((field: any) => (
                          <div key={field.id} className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                              {field.name} {field.isRequired && <span className="text-danger">*</span>}
                            </label>
                            
                            {(() => {
                              let opts: string[] = [];
                              try {
                                opts = typeof field.options === "string" ? JSON.parse(field.options) : (field.options || []);
                              } catch { opts = []; }
                              const isNumericChoices = opts.length > 0 && opts.every((o: string) => /^\d+$/.test(String(o).trim()));
                              const isHeadrest = /headrest|hdr/i.test(field.name);
                              const setVal = (v: string) => {
                                setDynamicFields(prev => ({ ...prev, [field.id]: v }));
                                syncDraftFromSpecField(field.name, v);
                              };
                              const current = dynamicFields[field.id] || "";

                              const buttonGroup = (choices: string[], square = false) => (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {choices.map((opt: string) => {
                                    const active = current === String(opt);
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setVal(String(opt))}
                                        className={`${square ? "h-9 w-9" : "h-9 px-3"} text-xs font-bold rounded-xl border transition cursor-pointer ${
                                          active
                                            ? "border-brand bg-brand-soft text-brand shadow-sm"
                                            : "border-border bg-surface-2 hover:bg-surface text-text-primary"
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              );

                              // TOGGLE: two-option segmented switch
                              if (field.type === "TOGGLE") {
                                const choices = opts.length >= 2 ? opts.slice(0, 2) : ["Yes", "No"];
                                return (
                                  <div className="flex rounded-xl bg-surface-secondary p-1 border border-border/60 w-fit">
                                    {choices.map((opt: string) => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setVal(opt)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                          current === opt
                                            ? "bg-[var(--brand)] text-white shadow-sm"
                                            : "text-text-secondary hover:text-text-primary"
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                );
                              }

                              // BUTTONS: tap-to-pick option chips
                              if (field.type === "BUTTONS" || (field.type === "SELECT" && (isNumericChoices || isHeadrest)) || (field.type === "NUMBER" && isHeadrest)) {
                                const choices = opts.length > 0 ? opts : ["2", "4", "5", "6", "7", "8"];
                                return buttonGroup(choices, isNumericChoices || isHeadrest);
                              }

                              // CHECKBOX: yes/no tick
                              if (field.type === "CHECKBOX") {
                                const checked = current === "Yes";
                                return (
                                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => setVal(e.target.checked ? "Yes" : "No")}
                                      className="h-4 w-4 rounded border-border accent-[var(--brand)] cursor-pointer"
                                    />
                                    <span className="text-sm text-text-primary">{checked ? "Yes" : "No"}</span>
                                  </label>
                                );
                              }

                              if (field.type === "SELECT") {
                                return (
                                  <Select
                                    className="bg-background text-xs font-semibold"
                                    value={current}
                                    onChange={(e) => setVal(e.target.value)}
                                  >
                                    <option value="">Choose option...</option>
                                    {opts.map((opt: string) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </Select>
                                );
                              }

                              return (
                                <Input
                                  type={field.type === "NUMBER" ? "number" : "text"}
                                  placeholder={`Enter ${field.name.toLowerCase()}...`}
                                  value={current}
                                  onChange={(e) => setVal(e.target.value)}
                                />
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                    ) : (
                      <>
                      <SectionBlock number="3" title="Manufacturing Specs" description="Configure the seat covers based on the Excel requirements." />
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Seat Type</label>
                          <div className="flex rounded-xl bg-surface-secondary p-1 border border-border/60 w-fit">
                            {["Single Back", "Double Back"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateDraft({ seatType: opt })}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                  draft.seatType === opt
                                    ? "bg-[var(--brand)] text-white shadow-sm"
                                    : "text-text-secondary hover:text-text-primary"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Headrest Count</label>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[2, 4, 5, 6, 7, 8].map((count) => {
                              const active = draft.headrestCount === count;
                              return (
                                <button
                                  key={count}
                                  type="button"
                                  onClick={() => updateDraft({ headrestCount: count })}
                                  className={`h-9 w-9 text-xs font-bold rounded-xl border transition cursor-pointer ${
                                    active
                                      ? "border-brand bg-brand-soft text-brand shadow-sm"
                                      : "border-border bg-surface hover:bg-surface-2 text-text-primary"
                                  }`}
                                >
                                  {count}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id="hasArmrest"
                          checked={draft.hasArmrest}
                          onChange={(e) => updateDraft({ hasArmrest: e.target.checked })}
                          className="h-4 w-4 rounded border-border accent-[var(--brand)] cursor-pointer"
                        />
                        <label htmlFor="hasArmrest" className="text-sm font-medium text-text-primary">
                          Includes Armrest covers (ARM)
                        </label>
                      </div>
                      </>
                    )}
                    </>
                  )}

                  {!isBatchMode && (
                    <>
                  <div className="space-y-1 mt-4">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Remarks</label>
                    <Input
                      placeholder="Special instructions or remarks..."
                      value={draft.remarks}
                      onChange={(event) => updateDraft({ remarks: event.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-1 mt-4">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Photo Reference</label>
                    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        variant="secondary"
                        onClick={openImagePicker}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                        {uploadingImage ? "Uploading..." : "Upload Image"}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      <div className="text-sm text-text-secondary">
                        {imageFileName ? (
                          <span className="font-medium text-text-primary">{imageFileName}</span>
                        ) : (
                          <span>No image selected yet.</span>
                        )}
                        {draft.photoReference ? <span className="ml-2 font-medium text-success">Image attached</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="my-6 border-b border-border"></div>

                  <SectionBlock number="4" title="Fabric & Finish" description="Choose the fabric, design, and color for production." />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Fabric</label>
                      <Select className="bg-background w-full" value={draft.materialId} onChange={(event) => updateDraft({ materialId: event.target.value })}>
                        {materials.map((item: any) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Design Finish</label>
                      <Select className="bg-background w-full" value={draft.designId} onChange={(event) => updateDraft({ designId: event.target.value })}>
                        {Array.from(new Set(designs.map((d: any) => d.category || "Other"))).map((cat: any) => (
                          <optgroup key={cat} label={cat}>
                            {designs
                              .filter((d: any) => (d.category || "Other") === cat)
                              .map((item: any) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Color Accent</label>
                      <Select className="bg-background w-full" value={draft.colorId} onChange={(event) => updateDraft({ colorId: event.target.value })}>
                        {colors.map((item: any) => (
                          <option key={item.id} value={item.id}>
                            {getColorIndicator(item.name)} {item.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                  </div>
                    </>
                  )}
                </div>

                <div className="border-t border-border bg-surface-2/60 dark:bg-surface/30 p-6 lg:border-l lg:border-t-0 lg:overflow-y-auto">
                  <div className="rounded-[24px] border border-border bg-surface p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                    {canAssignWorkers && (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">Assignment</p>
                        <p className="mt-1 text-[11px] text-text-tertiary">One worker per department. Each department&apos;s supervisor approves the stage (for QC, the inspection review).</p>
                      </>
                    )}
                    {!canAssignWorkers && (
                      <div className="rounded-[18px] border border-warning/25 bg-warning-soft/30 p-4">
                        <p className="text-xs font-semibold text-text-primary">Order-taking only</p>
                        <p className="mt-1 text-[11px] text-text-secondary">This order goes to the owner&apos;s Pending queue. The owner assigns department workers before it moves into production.</p>
                      </div>
                    )}
                    <div className="mt-4 space-y-4">
                      {canAssignWorkers && ((departments as any[]).length === 0 ? (
                        <p className="text-xs text-text-tertiary">No departments yet — add them in Departments to assign per stage.</p>
                      ) : (
                        (departments as any[]).map((dept) => {
                          const stageWorkers = deptWorkers(dept);
                          return (
                            <div key={dept.id} className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                                {dept.name}
                              </label>
                              <Select
                                className="bg-background"
                                value={deptAssignments[dept.id] ?? ""}
                                onChange={(event) => setDeptAssignment(dept.id, event.target.value)}
                              >
                                <option value="">Unassigned</option>
                                {stageWorkers.map((m: any) => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </Select>
                              {stageWorkers.length === 0 && (
                                <p className="text-[10px] text-warning">No workers staffed in {dept.name} yet.</p>
                              )}
                            </div>
                          );
                        })
                      ))}

                      <div className="rounded-[18px] border border-border bg-[var(--brand)]/5 dark:bg-surface/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">Preview</p>
                        <div className="mt-3 space-y-2 text-sm">
                          <PreviewRow label="Customer" value={draft.customerName || "Not set"} />
                          {isOnOrdered && <PreviewRow label="Order type" value={orderType === "RETAIL" ? "Retail" : orderType === "DEALER" ? "Dealer" : orderType === "OEM" ? "OEM" : "Internal"} />}
                          <PreviewRow label="Brand" value={brands.find((brand: any) => brand.id === draft.vehicleBrandId)?.name ?? "Not set"} />
                          <PreviewRow label="Model" value={models.find((model: any) => model.id === draft.vehicleModelId)?.name ?? "Not set"} />
                          <PreviewRow label="Quantity" value={String(draft.quantity)} />
                          <PreviewRow label="Specs" value={`${draft.seatType}, ${draft.headrestCount} HDR${draft.hasArmrest ? ', Armrest' : ''}`} />
                          <PreviewRow label="Design" value={designs.find((d: any) => d.id === draft.designId)?.name ?? "Not set"} />
                          {(() => {
                            const d = designs.find((x: any) => x.id === draft.designId);
                            return d?.imageUrls?.length ? (
                              <div className="mt-3">
                                <DesignReference images={d.imageUrls} designName={d.name} compact />
                              </div>
                            ) : null;
                          })()}
                          {draft.photoReference && (
                            <div className="mt-3 overflow-hidden rounded-[14px] border border-border">
                              <img src={draft.photoReference} alt="Reference" className="h-40 w-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border bg-surface px-6 py-5">
                <p className="hidden sm:block text-sm text-text-secondary">
                  A production-style setup assistant for starting work in one pass.
                </p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => { setEditingId(null); setIsStudioOpen(false); }}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowConfirm(true)}>Review & start</Button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/35 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-sm rounded-[24px] border border-border bg-surface p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-text-primary">Start production?</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Review the setup one last time before starting production.
              </p>
              <div className="mt-5 flex gap-3">
                <Button variant="secondary" className="w-full" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
                <Button className="w-full" onClick={submitOrder} disabled={loading}>
                  {loading ? "Starting..." : "Confirm"}
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* Partial stock flag */}
      <AnimatePresence>
        {partialStock && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPartialStock(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative w-full max-w-md rounded-[24px] border border-border bg-surface p-6 shadow-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Partial stock</p>
              <h3 className="mt-1 text-lg font-bold text-text-primary">
                {partialStock.availableQty} of {partialStock.requestedQty} in stock
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                Only {partialStock.availableQty} finished units match this spec. Allocate those from stock and produce
                the remaining {partialStock.requestedQty - partialStock.availableQty}, or produce the full quantity.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={() => resolvePartial("SPLIT")} disabled={loading} className="w-full justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Allocate {partialStock.availableQty} · produce {partialStock.requestedQty - partialStock.availableQty}
                </Button>
                <Button variant="secondary" onClick={() => resolvePartial("PRODUCE_ALL")} disabled={loading} className="w-full justify-center">
                  Produce all {partialStock.requestedQty}
                </Button>
                <button onClick={() => setPartialStock(null)} disabled={loading} className="mt-1 text-xs font-semibold text-text-tertiary hover:text-text-primary">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}

function SectionBlock({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
        {number}. {title}
      </p>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}
function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Surface className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-[-0.06em] text-text-primary">{value}</p>
        <p className="pb-1 text-sm text-text-secondary">{hint}</p>
      </div>
    </Surface>
  );
}

// Shows where the production physically is on the factory's own ladder
// (Ready for Stitching, QC In Progress, Ready for Dispatch...) rather than the
// coarse order status, because that's the language the floor already uses.
function PipelineBadge({ order }: { order: any }) {
  const status: string = order.productionStatus ?? order.status;
  const label = PRODUCTION_STATUS_LABELS[status as ProductionStatus] ?? titleCaseStatus(status);

  const tone =
    status === "DISPATCHED" || status === "READY_FOR_DISPATCH" || status === "QC_APPROVED"
      ? "bg-success-soft text-success"
      : status === "DRAFT" || status === "PLANNED"
      ? "bg-surface-2 text-text-secondary"
      : status.endsWith("_IN_PROGRESS")
      ? "bg-brand-soft text-brand"
      : "bg-warning-soft text-warning";

  return <Badge variant="neutral" className={tone}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "IN_PROGRESS") {
    return (
      <Badge className="bg-brand-soft text-brand">
        <Play className="mr-1 h-3 w-3" /> Active
      </Badge>
    );
  }
  if (status === "WAITING_QC") {
    return (
      <Badge className="bg-warning-soft text-warning">
        <Clock className="mr-1 h-3 w-3" /> Waiting QC
      </Badge>
    );
  }
  if (status === "REWORK_REQUIRED") {
    return (
      <Badge className="bg-danger-soft text-danger">
        <AlertTriangle className="mr-1 h-3 w-3" /> Rework
      </Badge>
    );
  }
  if (status === "APPROVED") {
    return (
      <Badge className="bg-success-soft text-success">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
      </Badge>
    );
  }

  return <Badge className="bg-surface-2 text-text-secondary">{titleCaseStatus(status)}</Badge>;
}
