"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, QrCode, Search, Loader2, X, ArrowUpRight, ArrowDownRight, ArrowLeftRight, SlidersHorizontal, Truck, Warehouse as WarehouseIcon, Store } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createStockEntry, adjustStock } from "@/server/actions/inventory";
import { createLocation } from "@/server/actions/locations";
import { ADJUSTMENT_TYPES } from "@/lib/inventory-constants";
import { createDispatch } from "@/server/actions/dispatch";
import { confirmPurchaseDelivery } from "@/server/actions/purchase";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Badge, Button, Input, Select, EmptyState } from "@/components/ui/primitives";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ItemCombobox } from "@/components/catalog/ItemCombobox";
import { ITEM_TYPE_LABELS } from "@/lib/item-constants";
type Tab = "overview" | "raw" | "production" | "dispatch" | "warehouses" | "stores";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "raw", label: "Stock" },
  { id: "production", label: "Production" },
  { id: "dispatch", label: "Dispatch" },
  { id: "warehouses", label: "Warehouses" },
  { id: "stores", label: "Stores" },
];

type StockModalType = "RECEIPT" | "ISSUE" | "TRANSFER" | null;

const STOCK_MODAL_COPY: Record<Exclude<StockModalType, null>, { title: string; pastTense: string; icon: typeof Plus }> = {
  RECEIPT: { title: "Receive stock", pastTense: "Stock received", icon: Plus },
  ISSUE: { title: "Issue stock", pastTense: "Stock issued", icon: ArrowDownRight },
  TRANSFER: { title: "Transfer stock", pastTense: "Stock transferred", icon: ArrowLeftRight },
};

export default function InventoryClient({ overview, ledger, warehouses, materials, variants, stockableItems = [], dispatches, dispatchableOrders, pendingDeliveries = [], variance = [], batches = [], itemFormData = { items: [], categories: [] }, userRole }: any) {
  const router = useRouter();
  // Store managers only see store (finished-goods) inventory — no raw material,
  // production, dispatch or warehouse operations.
  const storeOnly = userRole === "STORE_MANAGER";
  const visibleTabs = storeOnly ? TABS.filter((t) => t.id === "stores") : TABS;
  const [activeTab, setActiveTab] = useState<Tab>(storeOnly ? "stores" : "overview");
  const [search, setSearch] = useState("");
  const [stockModalType, setStockModalType] = useState<StockModalType>(null);
  const [syncing, setSyncing] = useState(false);
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);

  // Dispatch modal state
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    destinationType: "WAREHOUSE",
    destinationWarehouseId: "",
    customerName: "",
    customerPhone: "",
    address: "",
    transporter: "",
    vehicleNo: "",
    trackingId: "",
    notes: "",
  });

  // Raw materials live in the fixed "Factory" location — the first non-store
  // warehouse backs it in the ledger.
  const factoryWarehouseId = warehouses.find((w: any) => w.kind !== "STORE")?.id || warehouses[0]?.id || "";

  const [formData, setFormData] = useState({
    warehouseId: factoryWarehouseId,
    itemType: "MATERIAL",
    itemId: materials[0]?.id || "",
    quantityChange: 1,
    batchNumber: "",
  });

  // Stock is recorded against an Product row whatever its type; the old
  // MATERIAL / PRODUCT toggle existed only because finished goods used to live
  // in a different table.
  const itemOptions = useMemo(
    () =>
      (stockableItems as any[]).map((i) => ({
        id: i.id,
        label: i.name,
        sublabel: [i.itemCode, i.groupName].filter(Boolean).join(" · ") || null,
        searchText: i.searchText as string,
      })),
    [stockableItems]
  );
  const selectedStockItem = useMemo(
    () => (stockableItems as any[]).find((i) => i.id === formData.itemId) ?? null,
    [stockableItems, formData.itemId]
  );
  const isRawSelected = selectedStockItem
    ? ["RAW_MATERIAL", "CONSUMABLE", "PACKAGING"].includes(selectedStockItem.itemType)
    : formData.itemType === "MATERIAL";


  // Manual stock adjustment modal
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    materialId: materials[0]?.id || "",
    warehouseId: factoryWarehouseId,
    direction: "REMOVE" as "ADD" | "REMOVE",
    quantity: 1,
    adjustmentType: ADJUSTMENT_TYPES[0].value as string,
    remark: "",
  });

  const handleAdjustSubmit = async (e: any) => {
    e.preventDefault();
    if (!adjustForm.remark.trim()) { toast.error("A remark is required."); return; }
    setSyncing(true);
    try {
      const signed = adjustForm.direction === "REMOVE" ? -Math.abs(Number(adjustForm.quantity)) : Math.abs(Number(adjustForm.quantity));
      const res: any = await adjustStock({
        materialId: adjustForm.materialId,
        warehouseId: adjustForm.warehouseId,
        quantityChange: signed,
        adjustmentType: adjustForm.adjustmentType,
        remark: adjustForm.remark,
      });
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Stock adjusted");
      setIsAdjustOpen(false);
      setAdjustForm((f) => ({ ...f, quantity: 1, remark: "" }));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleStockSubmit = async (e: any) => {
    e.preventDefault();
    if (!stockModalType) return;
    setSyncing(true);
    try {
      await createStockEntry({
        transactionType: stockModalType,
        warehouseId: isRawSelected ? factoryWarehouseId : formData.warehouseId,
        // Always an Product id now — createStockEntry resolves it directly.
        materialId: formData.itemId,
        batchNumber: formData.batchNumber || undefined,
        quantityChange: stockModalType === "ISSUE" ? -Math.abs(formData.quantityChange) : Math.abs(formData.quantityChange)
      });
      toast.success(STOCK_MODAL_COPY[stockModalType].pastTense);
      setStockModalType(null);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDispatchSubmit = async (e: any) => {
    e.preventDefault();
    if (!dispatchOrderId) return;
    setSyncing(true);
    try {
      const result = await createDispatch({
        salesOrderId: dispatchOrderId,
        destinationType: dispatchForm.destinationType as any,
        destinationWarehouseId: dispatchForm.destinationWarehouseId || undefined,
        customerName: dispatchForm.customerName || undefined,
        customerPhone: dispatchForm.customerPhone || undefined,
        address: dispatchForm.address || undefined,
        transporter: dispatchForm.transporter || undefined,
        vehicleNo: dispatchForm.vehicleNo || undefined,
        trackingId: dispatchForm.trackingId || undefined,
        notes: dispatchForm.notes || undefined,
      });
      if ((result as any)?.error) {
        toast.error((result as any).error);
      } else {
        toast.success("Dispatch created");
        setDispatchOrderId(null);
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  // Scan-to-find: shelf-label QRs encode the item SKU, so an exact SKU match
  // selects the material directly. Barcode scanners type the value then Enter,
  // which lands here as a normal change event.
  const [skuScan, setSkuScan] = useState("");
  const handleSkuScan = (value: string) => {
    setSkuScan(value);
    const needle = value.trim().toLowerCase();
    if (!needle) return;
    const match =
      materials.find((m: any) => m.sku?.toLowerCase() === needle) ??
      materials.find((m: any) => m.sku?.toLowerCase().includes(needle));
    if (match) setFormData((prev: any) => ({ ...prev, itemType: "MATERIAL", itemId: match.id }));
  };

  const q = search.toLowerCase();
  // Only batches of the selected material that still have stock and are not
  // quarantined can be issued. Already FIFO-ordered by getItemBatches.
  const issuableBatches = (batches ?? []).filter(
    (b: any) => b.itemId === formData.itemId && b.remaining > 0 && b.stockStatus === "AVAILABLE"
  );
  const rawRows = (overview?.rawMaterials ?? []).filter((m: any) =>
    [m.name, m.sku, m.itemCode, m.groupName, m.spec]
      .filter(Boolean)
      .some((v: string) => v.toLowerCase().includes(q))
  );
  const reservationRows = (overview?.reservations ?? []).filter((r: any) => r.item?.name.toLowerCase().includes(q));
  const productionRows = (overview?.ongoingProductions ?? []).filter((p: any) =>
    p.woNumber.toLowerCase().includes(q) ||
    p.productName.toLowerCase().includes(q) ||
    p.customerName.toLowerCase().includes(q)
  );
  const dispatchRows = (dispatches ?? []).filter((d: any) =>
    d.salesOrder?.soNumber.toLowerCase().includes(q) ||
    (d.destinationWarehouse?.name ?? d.customerName ?? "").toLowerCase().includes(q)
  );
  const filteredLedger = (ledger ?? []).filter((l: any) =>
    l.transactionType.toLowerCase().includes(q) ||
    l.material?.name.toLowerCase().includes(q)
  );

  const stats = useMemo(() => ({
    rawItems: overview?.rawMaterials?.length ?? 0,
    inProduction: overview?.ongoingProductions?.length ?? 0,
    stocked: overview?.locationBalances?.length ?? 0,
    inTransit: (dispatches ?? []).filter((d: any) => d.status === "IN_TRANSIT").length,
  }), [overview, dispatches]);

  const th = "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary";
  const td = "px-5 py-3.5";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title={storeOnly ? "Store Inventory" : "Inventory Control"}
        description={storeOnly
          ? "Finished goods held in your stores."
          : "Track goods and materials across raw stock, production, warehouses, stores, and dispatch."}
        actions={storeOnly ? undefined : (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setStockModalType("RECEIPT")} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Receive
            </Button>
            <Button variant="secondary" onClick={() => setStockModalType("ISSUE")} className="gap-1.5">
              <ArrowDownRight className="h-4 w-4" />
              Issue
            </Button>
            <Button variant="secondary" onClick={() => setStockModalType("TRANSFER")} className="gap-1.5">
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>
            <Button onClick={() => setIsAdjustOpen(true)} className="gap-1.5">
              <SlidersHorizontal className="h-4 w-4" />
              Adjust
            </Button>
          </div>
        )}
      />

      {!storeOnly && (
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Stock items" value={String(stats.rawItems)} hint="Across all bought types" />
        <StatCard label="In production" value={String(stats.inProduction)} hint="Active issuances" />
        <StatCard label="Stocked lots" value={String(stats.stocked)} hint="Across locations" />
        <StatCard label="In transit" value={String(stats.inTransit)} hint="Being dispatched" />
      </div>
      )}

      <div className="flex items-center gap-6 border-b border-border px-2 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.id ? "border-b-2 border-brand text-brand" : "text-text-secondary hover:text-text-primary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-text-primary">
            {TABS.find((t) => t.id === activeTab)?.label}
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <Input className="w-64 pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {activeTab === "raw" && (
              <Link
                href={`/owner/inventory/labels${rawRows.length && rawRows.length !== (overview?.rawMaterials?.length ?? 0) ? `?ids=${rawRows.map((m: any) => m.id).join(",")}` : ""}`}
                title="Print shelf labels"
                className="ml-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface-2 transition"
              >
                <QrCode className="h-4 w-4" /> Labels
              </Link>
            )}
          </div>
        </div>

        <div className={activeTab === "overview" ? "" : "max-h-[440px] overflow-y-auto"}>
          {activeTab === "overview" && (() => {
            const s = overview?.summary ?? {};
            const val = overview?.valuation ?? [];
            const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
            return (
              <div className="space-y-5 p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MiniStat label="Raw stock value" value={fmt(s.rawValue)} hint="At latest cost" />
                  <MiniStat label="Finished goods" value={fmt(s.fgValue)} hint="At latest cost" />
                  <MiniStat label="Reserved (WIP)" value={String(Math.round(s.reservedQty ?? 0))} hint="On the floor" />
                  <MiniStat label="Low-stock items" value={String(s.lowStockCount ?? 0)} hint="At/under minimum" danger={(s.lowStockCount ?? 0) > 0} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-border bg-surface-2/40 px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Today inward</p>
                    <p className="mt-2 text-2xl font-semibold text-success">+{Math.round(s.todayInward ?? 0)}</p>
                  </div>
                  <div className="rounded-[16px] border border-border bg-surface-2/40 px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Today outward</p>
                    <p className="mt-2 text-2xl font-semibold text-danger">−{Math.round(s.todayOutward ?? 0)}</p>
                  </div>
                </div>

                {(s.lowStock ?? []).length > 0 && (
                  <div className="rounded-[16px] border border-warning/25 bg-warning-soft/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning">Low-stock alerts</p>
                    <div className="mt-2 space-y-1.5">
                      {s.lowStock.map((l: any) => (
                        <div key={l.id} className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-text-primary">{l.name}</span>
                          <span className="text-text-secondary">
                            {l.netStock} / min {l.minStockLevel} {l.uom}
                            {typeof l.secondaryQty === "number" && (
                              <span className="ml-1 text-[11px] text-text-tertiary">
                                ({Number(l.secondaryQty.toFixed(2))} {l.secondaryUOM})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-semibold text-text-primary">Stock valuation</p>
                  {val.length === 0 ? (
                    <p className="text-sm text-text-tertiary">No valued stock yet. Receive purchase orders with a rate to build valuation.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-[16px] border border-border">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-surface-2"><tr className="border-b border-border">
                          <th className={th}>Item</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Rate</th><th className={`${th} text-right`}>Value</th>
                        </tr></thead>
                        <tbody className="divide-y divide-border/70">
                          {val.map((v: any) => (
                            <tr key={v.id}>
                              <td className={`${td} font-semibold text-text-primary`}>{v.name}</td>
                              <td className={`${td} text-right text-text-secondary`}>
                                {v.netStock} {v.uom}
                                {typeof v.secondaryQty === "number" && (
                                  <span className="block text-[10px] text-text-tertiary">
                                    ({Number(v.secondaryQty.toFixed(2))} {v.secondaryUOM})
                                  </span>
                                )}
                              </td>
                              <td className={`${td} text-right text-text-secondary`}>₹{v.rate.toFixed(2)}</td>
                              <td className={`${td} text-right font-semibold text-text-primary`}>{fmt(v.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-text-primary">Material variance <span className="text-xs font-normal text-text-tertiary">(BOM expected vs issued)</span></p>
                  {variance.length === 0 ? (
                    <p className="text-sm text-text-tertiary">No production with issued materials yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {variance.filter((w: any) => w.lines.length > 0).map((w: any) => (
                        <div key={w.workOrderId} className="overflow-x-auto rounded-[16px] border border-border">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2/60 px-4 py-2.5">
                            <p className="text-xs font-semibold text-text-primary">{w.woNumber} · {w.productName} <span className="text-text-tertiary">× {w.targetQty}</span></p>
                            <span className={`text-xs font-semibold ${Math.abs(w.totalVariance) < 0.01 ? "text-text-tertiary" : w.totalVariance > 0 ? "text-danger" : "text-success"}`}>
                              net {w.totalVariance > 0 ? "+" : ""}{w.totalVariance.toFixed(1)}
                            </span>
                          </div>
                          <table className="w-full border-collapse text-left text-sm">
                            <thead><tr className="border-b border-border">
                              <th className={th}>Material</th><th className={`${th} text-right`}>Expected</th><th className={`${th} text-right`}>Issued</th><th className={`${th} text-right`}>Variance</th>
                            </tr></thead>
                            <tbody className="divide-y divide-border/70">
                              {w.lines.map((l: any) => (
                                <tr key={l.itemId}>
                                  <td className={`${td} text-text-primary`}>{l.name}</td>
                                  <td className={`${td} text-right text-text-secondary`}>{l.expected.toFixed(1)}</td>
                                  <td className={`${td} text-right text-text-secondary`}>{l.issued.toFixed(1)}</td>
                                  <td className={`${td} text-right font-semibold ${Math.abs(l.variance) < 0.01 ? "text-text-tertiary" : l.variance > 0 ? "text-danger" : "text-success"}`}>{l.variance > 0 ? "+" : ""}{l.variance.toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {activeTab === "raw" && pendingDeliveries.length > 0 && (
            <div className="border-b border-border bg-surface-2/40 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Purchase orders awaiting delivery</p>
              <div className="mt-3 space-y-2">
                {pendingDeliveries.map((po: any) => (
                  <div key={po.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-surface px-4 py-3">
                    <div className="text-xs">
                      <p className="font-semibold text-text-primary">{po.poNumber} · {po.supplier?.name}</p>
                      <p className="mt-0.5 text-text-secondary">
                        {po.items.map((i: any) => `${i.material?.name} × ${i.quantity}`).join(", ")}
                      </p>
                    </div>
                    <Button
                      className="h-9 text-xs gap-1.5"
                      disabled={syncing}
                      onClick={async () => {
                        setSyncing(true);
                        try {
                          const result = await confirmPurchaseDelivery(po.id);
                          if ((result as any)?.error) toast.error((result as any).error);
                          else { toast.success("Delivery received into raw materials"); router.refresh(); }
                        } finally { setSyncing(false); }
                      }}
                    >
                      Confirm Delivery
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "raw" && (
            rawRows.length === 0 ? <div className="p-10"><EmptyState title="No stock items" description="Add items in Master Data, then record receipts here." /></div> : (
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface"><tr className="border-b border-border">
                  <th className={th}>Item</th><th className={th}>Code</th><th className={th}>Group</th><th className={th}>Specification</th><th className={th}>UOM</th><th className={`${th} text-right`}>Available</th><th className={th}>Status</th>
                </tr></thead>
                <tbody className="divide-y divide-border/70">
                  {rawRows.map((m: any) => (
                    <tr key={m.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className={`${td} font-semibold text-text-primary`}>{m.name}</td>
                      <td className={`${td} font-mono text-xs text-text-secondary`}>{m.itemCode || m.sku}</td>
                      <td className={`${td} text-xs text-text-secondary`}>{m.groupName ?? "—"}</td>
                      <td className={`${td} max-w-[22rem] truncate text-xs text-text-tertiary`} title={m.spec || undefined}>{m.spec || "—"}</td>
                      <td className={`${td} text-text-secondary`}>{m.defaultUOM}</td>
                      <td className={`${td} text-right font-semibold ${m.netStock < 0 ? "text-danger" : "text-text-primary"}`}>
                        {m.netStock}
                        {/* Stock is held in the item's own unit; the second is
                            how the floor counts it — 150 m is 3 rolls. */}
                        {typeof m.secondaryQty === "number" && (
                          <span className="ml-1 text-[11px] font-normal text-text-tertiary">
                            ({Number(m.secondaryQty.toFixed(2))} {m.secondaryUOM})
                          </span>
                        )}
                      </td>
                      <td className={td}>
                        {m.netStock <= m.minStockLevel
                          ? <Badge className="bg-danger-soft text-danger">Low stock</Badge>
                          : <Badge className="bg-success-soft text-success">OK</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === "production" && (
            <div>
              {productionRows.length === 0 ? (
                <div className="p-10"><EmptyState title="Nothing on the floor" description="Ongoing productions appear here automatically when a work order starts." /></div>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-surface"><tr className="border-b border-border">
                    <th className={th}>Work Order</th><th className={th}>Product</th><th className={th}>Customer</th><th className={`${th} text-right`}>Qty</th><th className={th}>Status</th><th className={`${th} text-right`}>Materials Issued</th><th className={th}>Started</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border/70">
                    {productionRows.map((p: any) => (
                      <tr key={p.id} className="hover:bg-surface-2/60 transition-colors">
                        <td className={`${td} font-mono text-xs font-semibold text-text-secondary`}>{p.woNumber}</td>
                        <td className={`${td} font-semibold text-text-primary`}>{p.productName}{p.variantName && p.variantName !== "Standard" ? ` · ${p.variantName}` : ""}</td>
                        <td className={`${td} text-text-secondary`}>{p.customerName}</td>
                        <td className={`${td} text-right font-semibold text-text-primary`}>{p.targetQty}</td>
                        <td className={td}>
                          <Badge className={p.status === "IN_PROGRESS" ? "bg-brand-soft text-brand" : "bg-warning-soft text-warning"}>{p.status.replace("_", " ")}</Badge>
                        </td>
                        <td className={`${td} text-right text-text-secondary`}>{p.materialsIssued}</td>
                        <td className={`${td} text-text-secondary`}>{p.startDate ? dayjs(p.startDate).format("MMM D, HH:mm") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reservationRows.length > 0 && (
                <>
                  <div className="border-t border-border bg-surface-2/40 px-5 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Materials issued to the floor</p>
                  </div>
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-surface"><tr className="border-b border-border">
                      <th className={th}>Material</th><th className={`${th} text-right`}>Qty Issued</th><th className={th}>Work Order</th><th className={th}>Product</th><th className={th}>Since</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border/70">
                      {reservationRows.map((r: any) => (
                        <tr key={r.id} className="hover:bg-surface-2/60 transition-colors">
                          <td className={`${td} font-semibold text-text-primary`}>{r.item?.name}</td>
                          <td className={`${td} text-right font-semibold text-text-primary`}>{r.quantity}</td>
                          <td className={`${td} font-mono text-xs text-text-secondary`}>{r.workOrder?.woNumber ?? "—"}</td>
                          <td className={`${td} text-text-secondary`}>{r.workOrder?.productionPlan?.blueprintVersion?.blueprint?.item?.name ?? "—"}</td>
                          <td className={`${td} text-text-secondary`}>{dayjs(r.createdAt).format("MMM D, HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {activeTab === "dispatch" && (
            <div>
              {(dispatchableOrders ?? []).length > 0 && (
                <div className="border-b border-border bg-surface-2/40 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Ready to dispatch (verified passport)</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dispatchableOrders.map((o: any) => (
                      <button
                        key={o.id}
                        onClick={() => setDispatchOrderId(o.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary transition hover:border-brand hover:text-brand"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {o.soNumber} · {o.customer?.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {dispatchRows.length === 0 ? <div className="p-10"><EmptyState title="No dispatches yet" description="Dispatch becomes available once an order has a verified passport." /></div> : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-surface"><tr className="border-b border-border">
                    <th className={th}>Order</th><th className={th}>Destination</th><th className={th}>Transporter</th><th className={th}>Status</th><th className={th}>Dispatched</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border/70">
                    {dispatchRows.map((d: any) => (
                      <tr key={d.id} className="hover:bg-surface-2/60 transition-colors">
                        <td className={`${td} font-semibold text-text-primary`}>{d.salesOrder?.soNumber}</td>
                        <td className={`${td} text-text-secondary`}>
                          {d.destinationType === "CUSTOMER" ? `Customer · ${d.customerName ?? d.salesOrder?.customer?.name ?? ""}` : `${d.destinationType === "STORE" ? "Store" : "Warehouse"} · ${d.destinationWarehouse?.name ?? ""}`}
                        </td>
                        <td className={`${td} text-text-secondary`}>{d.transporter ?? "—"}</td>
                        <td className={td}>
                          <Badge className={d.status === "DELIVERED" ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}>{d.status.replace("_", " ")}</Badge>
                        </td>
                        <td className={`${td} text-text-secondary`}>{dayjs(d.dispatchedAt).format("MMM D, HH:mm")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {(activeTab === "warehouses" || activeTab === "stores") && (
            <LocationCardGrid
              kind={activeTab === "warehouses" ? "WAREHOUSE" : "STORE"}
              warehouses={warehouses}
              locationBalances={overview?.locationBalances ?? []}
              search={search}
              onOpen={setOpenLocationId}
            />
          )}

        </div>
      </Surface>

      {activeTab === "overview" && (
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold text-text-primary">Movement history</p>
          </div>
          {filteredLedger.length === 0 ? <div className="p-8"><EmptyState title="No ledger entries" description="Record a stock entry to start tracking movement." /></div> : (
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surface"><tr className="border-b border-border">
                  <th className={th}>Date</th><th className={th}>Type</th><th className={th}>Item</th><th className={th}>Warehouse</th><th className={`${th} text-right`}>Qty</th>
                </tr></thead>
                <tbody className="divide-y divide-border/70">
                  {filteredLedger.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className={`${td} text-text-secondary`}>{dayjs(entry.createdAt).format("MMM D, HH:mm")}</td>
                      <td className={td}>
                        <Badge className={entry.transactionType === "RECEIPT" ? "bg-success-soft text-success" : entry.transactionType === "ISSUE" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"}>{entry.transactionType}</Badge>
                      </td>
                      <td className={`${td} font-semibold text-text-primary`}>{entry.material?.name || "Unknown"}</td>
                      <td className={`${td} text-text-secondary`}>{entry.warehouse?.name}</td>
                      <td className={`${td} text-right`}>
                        <span className={`inline-flex items-center gap-1 font-semibold ${entry.quantityChange > 0 ? "text-success" : "text-danger"}`}>
                          {entry.quantityChange > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {entry.quantityChange > 0 ? "+" : ""}{entry.quantityChange}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      )}

      <AnimatePresence>
        {stockModalType && (
          <Modal title={STOCK_MODAL_COPY[stockModalType].title} eyebrow="Inventory" onClose={() => setStockModalType(null)}>
            <form onSubmit={handleStockSubmit} className="space-y-4 p-6">
              {isRawSelected ? (
                // Raw materials always live in the fixed "Factory" location.
                <Field label="Location">
                  <div className="flex h-10 items-center rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-text-secondary">
                    Factory
                  </div>
                </Field>
              ) : (
                <Field label="Warehouse">
                  <Select value={formData.warehouseId} onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })} required>
                    {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}{w.kind === "STORE" ? " (Store)" : ""}</option>)}
                  </Select>
                </Field>
              )}
              {/* One list across every item type. The chosen item's own type
                  decides how it is handled, so there is nothing to declare up
                  front. */}
              <Field label="Item">
                <ItemCombobox
                  options={itemOptions}
                  value={formData.itemId || null}
                  onChange={(id) => setFormData({ ...formData, itemId: id ?? "" })}
                  placeholder="Search by name, code or group…"
                  autoFocus
                />
                {selectedStockItem && (
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    {ITEM_TYPE_LABELS[selectedStockItem.itemType as keyof typeof ITEM_TYPE_LABELS] ?? selectedStockItem.itemType}
                    {selectedStockItem.groupName ? ` · ${selectedStockItem.groupName}` : ""} · {selectedStockItem.uom}
                  </p>
                )}
              </Field>
              {stockModalType === "ISSUE" && issuableBatches.length > 0 && (
                <Field label="Batch (oldest first)">
                  <Select value={formData.batchNumber ?? ""} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}>
                    <option value="">No specific batch</option>
                    {issuableBatches.map((b: any) => (
                      <option key={b.key} value={b.batchNumber}>
                        {b.batchNumber} — {Math.round(b.remaining * 100) / 100} {b.uom} left
                        {b.supplierName ? ` · ${b.supplierName}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Quantity">
                <Input type="number" required min="0.01" step="0.01" value={String(formData.quantityChange)} onChange={(e) => setFormData({ ...formData, quantityChange: parseFloat(e.target.value) })} />
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setStockModalType(null)}>Cancel</Button>
                <Button type="submit" disabled={syncing} className="gap-2">
                  {syncing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {STOCK_MODAL_COPY[stockModalType].title}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {dispatchOrderId && (
          <Modal title="Dispatch order" eyebrow="Logistics" onClose={() => setDispatchOrderId(null)}>
            <form onSubmit={handleDispatchSubmit} className="space-y-4 p-6">
              <Field label="Destination Type">
                <Select value={dispatchForm.destinationType} onChange={(e) => setDispatchForm({ ...dispatchForm, destinationType: e.target.value })}>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="STORE">Store</option>
                  <option value="CUSTOMER">Customer</option>
                </Select>
              </Field>
              {dispatchForm.destinationType !== "CUSTOMER" ? (
                <Field label="Destination Location">
                  <Select value={dispatchForm.destinationWarehouseId} onChange={(e) => setDispatchForm({ ...dispatchForm, destinationWarehouseId: e.target.value })} required>
                    <option value="">Choose location...</option>
                    {warehouses
                      .filter((w: any) => (dispatchForm.destinationType === "STORE" ? w.kind === "STORE" : w.kind !== "STORE"))
                      .map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </Select>
                </Field>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Customer Name"><Input value={dispatchForm.customerName} onChange={(e) => setDispatchForm({ ...dispatchForm, customerName: e.target.value })} /></Field>
                    <Field label="Customer Phone"><Input type="tel" value={dispatchForm.customerPhone} onChange={(e) => setDispatchForm({ ...dispatchForm, customerPhone: e.target.value })} /></Field>
                  </div>
                  <Field label="Delivery Address"><Input value={dispatchForm.address} onChange={(e) => setDispatchForm({ ...dispatchForm, address: e.target.value })} /></Field>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Transporter"><Input placeholder="Transport company" value={dispatchForm.transporter} onChange={(e) => setDispatchForm({ ...dispatchForm, transporter: e.target.value })} /></Field>
                <Field label="Vehicle No."><Input placeholder="e.g. DL-01-AB-1234" value={dispatchForm.vehicleNo} onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNo: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tracking ID"><Input value={dispatchForm.trackingId} onChange={(e) => setDispatchForm({ ...dispatchForm, trackingId: e.target.value })} /></Field>
                <Field label="Notes"><Input value={dispatchForm.notes} onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })} /></Field>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setDispatchOrderId(null)}>Cancel</Button>
                <Button type="submit" disabled={syncing} className="gap-2">
                  {syncing && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Truck className="h-4 w-4" />
                  Dispatch
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {isAdjustOpen && (
          <Modal title="Adjust stock" eyebrow="Inventory" onClose={() => setIsAdjustOpen(false)}>
            <form onSubmit={handleAdjustSubmit} className="space-y-4 p-6">
              <p className="text-xs text-text-secondary -mt-1">Correct stock when actual consumption differs from expected — wastage, damage, loss, or a physical count.</p>
              <Field label="Material">
                <Select value={adjustForm.materialId} onChange={(e) => setAdjustForm({ ...adjustForm, materialId: e.target.value })} required>
                  {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
              {/* Raw materials always live in the fixed "Factory" location. */}
              <Field label="Location">
                <div className="flex h-10 items-center rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-text-secondary">
                  Factory
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Direction">
                  <Select value={adjustForm.direction} onChange={(e) => setAdjustForm({ ...adjustForm, direction: e.target.value as any })}>
                    <option value="REMOVE">Remove (−)</option>
                    <option value="ADD">Add (+)</option>
                  </Select>
                </Field>
                <Field label="Quantity">
                  <Input type="number" required min="0.01" step="0.01" value={String(adjustForm.quantity)} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseFloat(e.target.value) })} />
                </Field>
              </div>
              <Field label="Adjustment Type">
                <Select value={adjustForm.adjustmentType} onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })} required>
                  {ADJUSTMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Remark (required)">
                <Input placeholder="Why is this adjustment being made?" value={adjustForm.remark} onChange={(e) => setAdjustForm({ ...adjustForm, remark: e.target.value })} required />
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={syncing} className="gap-2">
                  {syncing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Adjustment
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {openLocationId && (
          <LocationDetailModal
            locationId={openLocationId}
            warehouses={warehouses}
            locationBalances={overview?.locationBalances ?? []}
            ledger={ledger ?? []}
            onClose={() => setOpenLocationId(null)}
          />
        )}

      </AnimatePresence>
    </div>
  );
}

// Warehouses/Stores tab: a grid of location cards (one per warehouse row of the
// matching kind) rather than a flat item table — each card opens to the full
// contents and recent movement history for that specific location.
function LocationCardGrid({ kind, warehouses, locationBalances, search, onOpen }: {
  kind: "WAREHOUSE" | "STORE";
  warehouses: any[];
  locationBalances: any[];
  search: string;
  onOpen: (id: string) => void;
}) {
  const q = search.toLowerCase();
  const Icon = kind === "STORE" ? Store : WarehouseIcon;

  const cards = useMemo(() => {
    return warehouses
      .filter((w: any) => (kind === "STORE" ? w.kind === "STORE" : w.kind !== "STORE"))
      .map((w: any) => {
        const items = locationBalances.filter((b: any) => b.warehouseId === w.id);
        return {
          warehouse: w,
          items,
          itemCount: items.length,
          totalQty: items.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0),
        };
      })
      .filter((c) =>
        !q || c.warehouse.name.toLowerCase().includes(q) || c.items.some((i: any) => i.itemName.toLowerCase().includes(q))
      );
  }, [warehouses, locationBalances, kind, q]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <EmptyState
          title={`No ${kind === "STORE" ? "stores" : "warehouses"} yet`}
          description={
            kind === "STORE"
              ? "A store is somewhere finished orders get delivered to. Add one to dispatch against it."
              : "A warehouse is where the factory keeps its own stock. Add one to start tracking it."
          }
        />
        <NewLocation kind={kind} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ warehouse, itemCount, totalQty }) => (
        <button
          key={warehouse.id}
          onClick={() => onOpen(warehouse.id)}
          className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-5 text-left transition hover:border-brand/40 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <Badge className={kind === "STORE" ? "bg-brand-soft text-brand" : "bg-brand-soft text-brand"}>{kind === "STORE" ? "Store" : "Warehouse"}</Badge>
          </div>
          <div>
            <p className="font-semibold text-text-primary truncate">{warehouse.name}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {itemCount === 0 ? "No stock yet" : `${itemCount} item${itemCount === 1 ? "" : "s"} · ${totalQty.toLocaleString("en-IN")} units`}
            </p>
          </div>
        </button>
      ))}
      </div>
      <NewLocation kind={kind} />
    </div>
  );
}

/**
 * Adding a warehouse or a store.
 *
 * This lived on the Master Data Sheets page, which meant the only way to create
 * the place stock sits was a spreadsheet three clicks away from the stock
 * itself — and Inventory's empty state used to say "add a warehouse in Master
 * Data", pointing at a screen that is now gone.
 */
function NewLocation({ kind }: { kind: "WAREHOUSE" | "STORE" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const label = kind === "STORE" ? "store" : "warehouse";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    const result = await createLocation({ name, kind });
    setSaving(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === "STORE" ? "New store name" : "New warehouse name"}
          aria-label={`New ${label} name`}
          className="w-56 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50"
        >
          {saving ? "Adding…" : `Add ${label}`}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function LocationDetailModal({ locationId, warehouses, locationBalances, ledger, onClose }: {
  locationId: string;
  warehouses: any[];
  locationBalances: any[];
  ledger: any[];
  onClose: () => void;
}) {
  const warehouse = warehouses.find((w: any) => w.id === locationId);
  const items = locationBalances.filter((b: any) => b.warehouseId === locationId);
  const movements = ledger.filter((l: any) => l.warehouse?.id === locationId).slice(0, 15);
  const th = "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary";
  const td = "px-4 py-2.5";

  return (
    <Modal title={warehouse?.name ?? "Location"} eyebrow={warehouse?.kind === "STORE" ? "Store" : "Warehouse"} onClose={onClose}>
      <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary mb-2">Current stock</p>
          {items.length === 0 ? (
            <p className="text-sm text-text-tertiary">No stock at this location yet.</p>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface-2"><tr className="border-b border-border">
                  <th className={th}>Item</th><th className={th}>SKU</th><th className={`${th} text-right`}>Qty</th>
                </tr></thead>
                <tbody className="divide-y divide-border/70">
                  {items.map((b: any) => (
                    <tr key={b.id}>
                      <td className={`${td} font-semibold text-text-primary`}>{b.itemName}</td>
                      <td className={`${td} font-mono text-xs text-text-secondary`}>{b.sku}</td>
                      <td className={`${td} text-right font-semibold text-text-primary`}>
                        {b.quantity} {b.uom}
                        {typeof b.secondaryQty === "number" && (
                          <span className="block text-[10px] font-normal text-text-tertiary">
                            ({Number(b.secondaryQty.toFixed(2))} {b.secondaryUOM})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary mb-2">Recent movements</p>
          {movements.length === 0 ? (
            <p className="text-sm text-text-tertiary">No movement recorded at this location yet.</p>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface-2"><tr className="border-b border-border">
                  <th className={th}>Date</th><th className={th}>Type</th><th className={th}>Item</th><th className={`${th} text-right`}>Qty</th>
                </tr></thead>
                <tbody className="divide-y divide-border/70">
                  {movements.map((entry: any) => (
                    <tr key={entry.id}>
                      <td className={`${td} text-text-secondary whitespace-nowrap`}>{dayjs(entry.createdAt).format("MMM D, HH:mm")}</td>
                      <td className={td}>
                        <Badge className={entry.transactionType === "RECEIPT" ? "bg-success-soft text-success" : entry.transactionType === "ISSUE" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"}>{entry.transactionType}</Badge>
                      </td>
                      <td className={`${td} font-semibold text-text-primary`}>{entry.material?.name || "Unknown"}</td>
                      <td className={`${td} text-right`}>
                        <span className={`inline-flex items-center gap-1 font-semibold ${entry.quantityChange > 0 ? "text-success" : "text-danger"}`}>
                          {entry.quantityChange > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {entry.quantityChange > 0 ? "+" : ""}{entry.quantityChange}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/35 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 24 }}
        className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-border bg-surface shadow-[0_30px_100px_rgba(15,23,42,0.22)] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary transition hover:bg-surface" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{label}</label>
      {children}
    </div>
  );
}

function MiniStat({ label, value, hint, danger }: { label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <div className={`rounded-[16px] border px-5 py-4 ${danger ? "border-danger/25 bg-danger-soft/50" : "border-border bg-surface-2/40"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-[-0.04em] ${danger ? "text-danger" : "text-text-primary"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-text-tertiary">{hint}</p>
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
