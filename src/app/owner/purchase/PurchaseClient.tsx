"use client";

import { useMemo, useState } from "react";
import { confirmDialog } from "@/components/ui/dialog-service";
import { Plus, Search, Loader2, X, Trash2, Undo2, PackageCheck, AlertTriangle, Building2, CheckCircle2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPurchaseOrder, returnMaterials, updatePurchaseOrderStatus, deletePurchaseOrder, receivePurchaseOrder, approvePurchaseOrder, getSupplierDetail, createSupplier, updateSupplier, deleteSupplier } from "@/server/actions/purchase";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Badge, Button, Input, Select, EmptyState } from "@/components/ui/primitives";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

export default function PurchaseClient({ orders, suppliers, materials, reorderSuggestions = [] }: any) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [poExpectedDate, setPoExpectedDate] = useState("");
  const [orderItems, setOrderItems] = useState<Array<{ materialId: string; quantity: number | ""; rate: number | "" }>>([{ materialId: materials[0]?.id || "", quantity: "", rate: "" }]);

  // GRN (goods receipt) state — receive a PO into raw-material stock
  const [receivePo, setReceivePo] = useState<any>(null);
  const [receiveLines, setReceiveLines] = useState<Array<{ materialId: string; name: string; ordered: number; already: number; quantity: number | ""; rate: number | ""; batchNumber: string }>>([]);

  const openReceive = (order: any) => {
    setReceivePo(order);
    setReceiveLines(
      order.items.map((i: any) => {
        const remaining = Math.max(0, i.quantity - (i.receivedQty ?? 0));
        return { materialId: i.materialId, name: i.material?.name ?? "Material", ordered: i.quantity, already: i.receivedQty ?? 0, quantity: remaining || "", rate: i.rate ?? 0, batchNumber: "" };
      })
    );
  };

  const handleReceiveSubmit = async (e: any) => {
    e.preventDefault();
    setSyncing(true);
    try {
      const lines = receiveLines
        .map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity) || 0, rate: Number(l.rate) || 0, batchNumber: l.batchNumber || undefined }))
        .filter((l) => l.quantity > 0);
      if (lines.length === 0) { toast.error("Enter a received quantity for at least one line"); setSyncing(false); return; }
      const res = await receivePurchaseOrder(receivePo.id, lines);
      if ((res as any)?.error) { toast.error((res as any).error); }
      else { toast.success("Goods received into raw stock"); setReceivePo(null); router.refresh(); }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const draftReorder = (s: any) => {
    if (s.supplier?.id) setSupplierId(s.supplier.id);
    setOrderItems([{ materialId: s.id, quantity: s.suggestedQty, rate: s.supplier?.rate ?? "" }]);
    setIsModalOpen(true);
  };

  // Supplier drawer + editor
  const [supplierDetail, setSupplierDetail] = useState<any>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const emptySupplier = { id: "", name: "", contactPerson: "", phone: "", email: "", address: "", gst: "", pan: "", bankName: "", bankAccount: "", paymentTerms: "", leadTimeDays: "" as number | "" };
  const [supplierForm, setSupplierForm] = useState<any>(null); // null = closed

  const openSupplier = async (id: string) => {
    setLoadingDrawer(true);
    setSupplierDetail({ loading: true });
    try {
      const d = await getSupplierDetail(id);
      setSupplierDetail(d);
    } finally {
      setLoadingDrawer(false);
    }
  };

  const handleSupplierSave = async (e: any) => {
    e.preventDefault();
    setSyncing(true);
    try {
      const payload = { ...supplierForm, leadTimeDays: supplierForm.leadTimeDays === "" ? null : Number(supplierForm.leadTimeDays) };
      const res = supplierForm.id ? await updateSupplier(supplierForm.id, payload) : await createSupplier(payload);
      if ((res as any)?.error) { toast.error((res as any).error); }
      else { toast.success(supplierForm.id ? "Supplier updated" : "Supplier added"); setSupplierForm(null); router.refresh(); }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  // Vendor return state
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnSupplierId, setReturnSupplierId] = useState(suppliers[0]?.id || "");
  const [returnItems, setReturnItems] = useState([{ materialId: materials[0]?.id || "", quantity: 1, rate: 0 }]);
  const [returnReason, setReturnReason] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSyncing(true);
    try {
      const items = orderItems.map((i) => ({ materialId: i.materialId, quantity: Number(i.quantity) || 0, rate: Number(i.rate) || 0 })).filter((i) => i.quantity > 0);
      if (items.length === 0) { toast.error("Enter a quantity for at least one item"); setSyncing(false); return; }
      await createPurchaseOrder({ supplierId, items, expectedDate: poExpectedDate || undefined });
      toast.success("Purchase Order Created");
      setIsModalOpen(false);
      setOrderItems([{ materialId: materials[0]?.id || "", quantity: "", rate: "" }]);
      setPoExpectedDate("");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleReturnSubmit = async (e: any) => {
    e.preventDefault();
    setSyncing(true);
    try {
      const res = await returnMaterials({ supplierId: returnSupplierId, items: returnItems, reason: returnReason });
      toast.success(`Materials returned (${(res as any).returnNumber})`);
      setIsReturnOpen(false);
      setReturnItems([{ materialId: materials[0]?.id || "", quantity: 1, rate: 0 }]);
      setReturnReason("");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = orders.filter((o: any) =>
    o.supplier?.name.toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = useMemo(
    () => orders.reduce((sum: number, o: any) => sum + o.items.reduce((s: number, i: any) => s + i.quantity * i.rate, 0), 0),
    [orders]
  );

  const openCount = useMemo(
    () => orders.filter((o: any) => o.status !== "COMPLETED" && o.status !== "CANCELLED" && o.status !== "RETURNED").length,
    [orders]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Purchase"
        title="Purchase"
        description="Raise and track material purchase orders with your suppliers. Deliveries are confirmed from the Inventory raw-material tab."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsReturnOpen(true)} className="gap-2">
              <Undo2 className="h-4 w-4" />
              Return Materials
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New PO
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Purchase orders" value={String(orders.length)} hint="All time" />
        <StatCard label="Open orders" value={String(openCount)} hint="In progress" />
        <StatCard label="Suppliers" value={String(suppliers.length)} hint="Registered" />
        <StatCard label="Total value" value={`₹${totalValue.toFixed(0)}`} hint="Ordered spend" />
      </div>

      {reorderSuggestions.length > 0 && (
        <Surface className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-border bg-warning-soft/60 px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold text-text-primary">Reorder suggestions</p>
            <span className="text-xs text-text-tertiary">{reorderSuggestions.length} material(s) at or below minimum stock</span>
          </div>
          <div className="divide-y divide-border/70">
            {reorderSuggestions.map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">{s.name} <span className="font-mono text-xs text-text-tertiary">{s.sku}</span></p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    On hand {s.netStock} {s.uom} · min {s.minStockLevel} · suggest <span className="font-semibold text-text-primary">{s.suggestedQty} {s.uom}</span>
                    {s.supplier ? ` · ${s.supplier.name}` : " · no supplier on file"}
                  </p>
                </div>
                <Button className="h-9 text-xs gap-1.5" onClick={() => draftReorder(s)}>
                  <Plus className="h-3.5 w-3.5" />
                  Draft PO
                </Button>
              </div>
            ))}
          </div>
        </Surface>
      )}

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-text-primary">Order history</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <Input
              className="w-64 pl-9"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title="No purchase orders"
              description="Raise a purchase order to start tracking supplier deliveries."
            />
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">PO #</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Date</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Supplier</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Items</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Total</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((order: any) => (
                  <tr key={order.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-text-secondary">{order.poNumber}</td>
                    <td className="px-5 py-3.5 text-text-secondary">{dayjs(order.orderDate).format("MMM D, YYYY")}</td>
                    <td className="px-5 py-3.5 font-semibold text-text-primary">{order.supplier?.name}</td>
                    <td className="px-5 py-3.5">
                      <Badge
                        className={
                          order.status === "COMPLETED"
                            ? "bg-success-soft text-success"
                            : order.status === "CANCELLED"
                              ? "bg-danger-soft text-danger"
                              : order.status === "RETURNED"
                                ? "bg-warning-soft text-warning"
                                : "bg-brand-soft text-brand"
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">{order.items.length} items</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-text-primary">
                      ₹{order.items.reduce((sum: number, i: any) => sum + i.quantity * i.rate, 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {order.status === "SUBMITTED" && (
                        <button
                          onClick={async () => { const r = await approvePurchaseOrder(order.id); if ((r as any)?.error) toast.error((r as any).error); else { toast.success("Order approved"); router.refresh(); } }}
                          className="mr-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      )}
                      {order.status !== "COMPLETED" && order.status !== "CANCELLED" && order.status !== "RETURNED" && (
                        <button
                          onClick={() => openReceive(order)}
                          className="mr-3 inline-flex items-center gap-1 text-[11px] font-semibold text-success hover:underline"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Receive
                        </button>
                      )}
                      {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                        <button
                          onClick={async () => { await updatePurchaseOrderStatus(order.id, "CANCELLED"); toast.success("Order cancelled"); router.refresh(); }}
                          className="mr-3 text-[11px] font-semibold text-warning hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={async () => { if (!(await confirmDialog({ title: `Delete ${order.poNumber}?`, variant: "danger", confirmLabel: "Delete" }))) return; await deletePurchaseOrder(order.id); toast.success("Order deleted"); router.refresh(); }}
                        className="text-[11px] font-semibold text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <Surface className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-text-tertiary" />
            <p className="text-sm font-semibold text-text-primary">Suppliers</p>
          </div>
          <Button className="h-9 text-xs gap-1.5" onClick={() => setSupplierForm({ ...emptySupplier })}>
            <Plus className="h-3.5 w-3.5" />
            Add Supplier
          </Button>
        </div>
        {suppliers.length === 0 ? (
          <div className="p-8"><EmptyState title="No suppliers yet" description="Add a supplier to start raising purchase orders." /></div>
        ) : (
          <div className="divide-y divide-border/70">
            {suppliers.map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">{s.name}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {[s.contactPerson, s.phone, s.gst && `GST ${s.gst}`].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSupplierForm({ ...emptySupplier, ...s, leadTimeDays: s.leadTimeDays ?? "" })} className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-brand">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <Button variant="secondary" className="h-8 text-xs" onClick={() => openSupplier(s.id)}>View profile</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <AnimatePresence>
        {supplierDetail && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/35 backdrop-blur-md" onClick={() => setSupplierDetail(null)} />
            <motion.div
              initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="relative h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface shadow-[0_0_80px_rgba(15,23,42,0.25)]"
            >
              {loadingDrawer || supplierDetail?.loading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-text-tertiary" /></div>
              ) : !supplierDetail?.supplier ? (
                <div className="p-6"><EmptyState title="Not found" description="Supplier could not be loaded." /></div>
              ) : (() => {
                const { supplier, stats, materials, recentOrders } = supplierDetail;
                const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
                return (
                  <div>
                    <div className="flex items-start justify-between border-b border-border px-6 py-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Vendor</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">{supplier.name}</h2>
                        <p className="mt-1 text-xs text-text-secondary">{[supplier.contactPerson, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "No contact on file"}</p>
                      </div>
                      <button onClick={() => setSupplierDetail(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary hover:bg-surface" aria-label="Close"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="space-y-5 p-6">
                      <div className="grid grid-cols-2 gap-3">
                        <DrawerStat label="Purchase orders" value={String(stats.poCount)} />
                        <DrawerStat label="Total received spend" value={fmt(stats.totalSpend)} />
                        <DrawerStat label="On-time delivery" value={stats.onTimePct === null ? "—" : `${stats.onTimePct}%`} />
                        <DrawerStat label="Returns" value={`${stats.returnCount} · ${fmt(stats.returnValue)}`} />
                      </div>

                      {(supplier.gst || supplier.pan || supplier.paymentTerms || supplier.leadTimeDays != null || supplier.bankName || supplier.address) && (
                        <div className="rounded-[16px] border border-border bg-surface-2/40 p-4 text-sm">
                          {supplier.address && <Row k="Address" v={supplier.address} />}
                          {supplier.gst && <Row k="GST" v={supplier.gst} />}
                          {supplier.pan && <Row k="PAN" v={supplier.pan} />}
                          {supplier.paymentTerms && <Row k="Payment terms" v={supplier.paymentTerms} />}
                          {supplier.leadTimeDays != null && <Row k="Lead time" v={`${supplier.leadTimeDays} days`} />}
                          {supplier.bankName && <Row k="Bank" v={`${supplier.bankName}${supplier.bankAccount ? ` · ${supplier.bankAccount}` : ""}`} />}
                        </div>
                      )}

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Materials & price history</p>
                        {materials.length === 0 ? <p className="text-sm text-text-tertiary">No materials purchased yet.</p> : (
                          <div className="space-y-2">
                            {materials.map((m: any) => (
                              <div key={m.materialId} className="rounded-[14px] border border-border p-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-text-primary">{m.name}</p>
                                  <p className="text-xs text-text-secondary">last ₹{m.lastRate.toFixed(2)}</p>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {m.history.map((h: any, i: number) => (
                                    <span key={i} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-secondary">{dayjs(h.date).format("MMM D")} · ₹{h.rate.toFixed(2)}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Recent orders</p>
                        {recentOrders.length === 0 ? <p className="text-sm text-text-tertiary">No orders yet.</p> : (
                          <div className="space-y-1.5">
                            {recentOrders.map((o: any) => (
                              <div key={o.poNumber} className="flex items-center justify-between text-sm">
                                <span className="font-mono text-xs text-text-secondary">{o.poNumber}</span>
                                <span className="text-text-tertiary">{dayjs(o.date).format("MMM D")}</span>
                                <span className="font-semibold text-text-primary">{fmt(o.value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button variant="secondary" className="w-full gap-2" onClick={() => { setSupplierForm({ ...emptySupplier, ...supplier, leadTimeDays: supplier.leadTimeDays ?? "" }); setSupplierDetail(null); }}>
                        <Pencil className="h-4 w-4" /> Edit supplier
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}

        {supplierForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/35 backdrop-blur-md" onClick={() => setSupplierForm(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 24 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[26px] border border-border bg-surface shadow-[0_30px_100px_rgba(15,23,42,0.22)] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Vendor</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">{supplierForm.id ? "Edit supplier" : "Add supplier"}</h2>
                </div>
                <button type="button" onClick={() => setSupplierForm(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary hover:bg-surface" aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSupplierSave} className="space-y-3 p-6">
                <SupField label="Name" required val={supplierForm.name} set={(v: string) => setSupplierForm({ ...supplierForm, name: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <SupField label="Contact person" val={supplierForm.contactPerson} set={(v: string) => setSupplierForm({ ...supplierForm, contactPerson: v })} />
                  <SupField label="Phone" val={supplierForm.phone} set={(v: string) => setSupplierForm({ ...supplierForm, phone: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SupField label="Email" val={supplierForm.email} set={(v: string) => setSupplierForm({ ...supplierForm, email: v })} />
                  <SupField label="Lead time (days)" type="number" val={supplierForm.leadTimeDays} set={(v: string) => setSupplierForm({ ...supplierForm, leadTimeDays: v === "" ? "" : Number(v) })} />
                </div>
                <SupField label="Address" val={supplierForm.address} set={(v: string) => setSupplierForm({ ...supplierForm, address: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <SupField label="GST" val={supplierForm.gst} set={(v: string) => setSupplierForm({ ...supplierForm, gst: v })} />
                  <SupField label="PAN" val={supplierForm.pan} set={(v: string) => setSupplierForm({ ...supplierForm, pan: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SupField label="Bank name" val={supplierForm.bankName} set={(v: string) => setSupplierForm({ ...supplierForm, bankName: v })} />
                  <SupField label="Bank account" val={supplierForm.bankAccount} set={(v: string) => setSupplierForm({ ...supplierForm, bankAccount: v })} />
                </div>
                <SupField label="Payment terms" val={supplierForm.paymentTerms} set={(v: string) => setSupplierForm({ ...supplierForm, paymentTerms: v })} />
                <div className="flex items-center justify-between pt-2">
                  {supplierForm.id ? (
                    <button type="button" onClick={async () => { if (!(await confirmDialog({ title: `Delete ${supplierForm.name}?`, variant: "danger", confirmLabel: "Delete" }))) return; const r = await deleteSupplier(supplierForm.id); if ((r as any)?.error) toast.error((r as any).error); else { toast.success("Supplier deleted"); setSupplierForm(null); router.refresh(); } }}
                      className="text-[11px] font-semibold text-danger hover:underline">Delete</button>
                  ) : <span />}
                  <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={() => setSupplierForm(null)}>Cancel</Button>
                    <Button type="submit" disabled={syncing} className="gap-2">{syncing && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {receivePo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/35 backdrop-blur-md" onClick={() => setReceivePo(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[26px] border border-border bg-surface shadow-[0_30px_100px_rgba(15,23,42,0.22)] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Goods Receipt</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">Receive {receivePo.poNumber}</h2>
                </div>
                <button type="button" onClick={() => setReceivePo(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary transition hover:bg-surface" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleReceiveSubmit} className="space-y-4 p-6">
                <p className="text-xs text-text-tertiary">Enter received quantities. Leave a line at 0 to receive it in a later GRN — the order stays partially received until every line is fully in.</p>
                <div className="space-y-2">
                  {receiveLines.map((line, idx) => (
                    <div key={idx} className="rounded-[16px] border border-border bg-surface-2/40 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-text-primary">{line.name}</p>
                        <p className="text-[11px] text-text-tertiary">Ordered {line.ordered} · received {line.already}</p>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Receive qty</label>
                          <Input type="number" min="0" step="0.01" value={line.quantity === "" ? "" : String(line.quantity)}
                            onChange={(e) => { const n = [...receiveLines]; n[idx].quantity = e.target.value === "" ? "" : parseFloat(e.target.value); setReceiveLines(n); }} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Rate</label>
                          <Input type="number" min="0" step="0.01" value={line.rate === "" ? "" : String(line.rate)}
                            onChange={(e) => { const n = [...receiveLines]; n[idx].rate = e.target.value === "" ? "" : parseFloat(e.target.value); setReceiveLines(n); }} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Batch (opt)</label>
                          <Input placeholder="Batch #" value={line.batchNumber}
                            onChange={(e) => { const n = [...receiveLines]; n[idx].batchNumber = e.target.value; setReceiveLines(n); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setReceivePo(null)}>Cancel</Button>
                  <Button type="submit" disabled={syncing} className="gap-2">
                    {syncing && <Loader2 className="h-4 w-4 animate-spin" />}
                    <PackageCheck className="h-4 w-4" />
                    Receive Goods
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/35 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[26px] border border-border bg-surface shadow-[0_30px_100px_rgba(15,23,42,0.22)]"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Purchase</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">New purchase order</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary transition hover:bg-surface"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Supplier</label>
                    <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                      {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Expected Date</label>
                    <Input type="date" value={poExpectedDate} onChange={(e) => setPoExpectedDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Items</label>
                  <div className="space-y-2">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          className="flex-1"
                          value={item.materialId}
                          onChange={(e) => {
                            const next = [...orderItems];
                            next[idx].materialId = e.target.value;
                            setOrderItems(next);
                          }}
                          required
                        >
                          {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                        <Input
                          className="w-24"
                          type="number"
                          placeholder="Quantity"
                          min="1"
                          value={item.quantity === "" ? "" : String(item.quantity)}
                          onChange={(e) => {
                            const next = [...orderItems];
                            next[idx].quantity = e.target.value === "" ? "" : parseFloat(e.target.value);
                            setOrderItems(next);
                          }}
                          required
                        />
                        <Input
                          className="w-32"
                          type="number"
                          placeholder="Price / unit"
                          min="0"
                          step="0.01"
                          value={item.rate === "" ? "" : String(item.rate)}
                          onChange={(e) => {
                            const next = [...orderItems];
                            next[idx].rate = e.target.value === "" ? "" : parseFloat(e.target.value);
                            setOrderItems(next);
                          }}
                          required
                        />
                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text-tertiary transition hover:text-danger"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 text-xs"
                    onClick={() => setOrderItems([...orderItems, { materialId: materials[0]?.id || "", quantity: "", rate: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add another item
                  </Button>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={syncing} className="gap-2">
                    {syncing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Order
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isReturnOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/35 backdrop-blur-md"
              onClick={() => setIsReturnOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[26px] border border-border bg-surface shadow-[0_30px_100px_rgba(15,23,42,0.22)]"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Purchase</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">Return materials to supplier</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReturnOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary transition hover:bg-surface"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleReturnSubmit} className="space-y-4 p-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Supplier</label>
                  <Select value={returnSupplierId} onChange={(e) => setReturnSupplierId(e.target.value)} required>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Items to return</label>
                  <div className="space-y-2">
                    {returnItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          className="flex-1"
                          value={item.materialId}
                          onChange={(e) => {
                            const next = [...returnItems];
                            next[idx].materialId = e.target.value;
                            setReturnItems(next);
                          }}
                          required
                        >
                          {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                        <Input
                          className="w-24"
                          type="number"
                          placeholder="Qty"
                          min="0.01"
                          step="0.01"
                          value={String(item.quantity)}
                          onChange={(e) => {
                            const next = [...returnItems];
                            next[idx].quantity = parseFloat(e.target.value);
                            setReturnItems(next);
                          }}
                          required
                        />
                        <Input
                          className="w-32"
                          type="number"
                          placeholder="Rate"
                          min="0"
                          step="0.01"
                          value={String(item.rate)}
                          onChange={(e) => {
                            const next = [...returnItems];
                            next[idx].rate = parseFloat(e.target.value);
                            setReturnItems(next);
                          }}
                        />
                        {returnItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setReturnItems(returnItems.filter((_, i) => i !== idx))}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text-tertiary transition hover:text-danger"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 text-xs"
                    onClick={() => setReturnItems([...returnItems, { materialId: materials[0]?.id || "", quantity: 1, rate: 0 }])}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add another item
                  </Button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Reason (optional)</label>
                  <Input placeholder="e.g. Damaged roll, wrong shade" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
                </div>

                <p className="text-xs text-text-tertiary">
                  Stock for these materials will be reduced and the return will appear in order history as a RET entry.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setIsReturnOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={syncing} className="gap-2">
                    {syncing && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Undo2 className="h-4 w-4" />
                    Return Materials
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

function DrawerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-surface-2/40 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-text-primary">{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-text-tertiary">{k}</span>
      <span className="text-right font-medium text-text-primary">{v}</span>
    </div>
  );
}

function SupField({ label, val, set, type = "text", required }: { label: string; val: any; set: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{label}</label>
      <Input type={type} required={required} value={val === null || val === undefined ? "" : String(val)} onChange={(e) => set(e.target.value)} />
    </div>
  );
}
