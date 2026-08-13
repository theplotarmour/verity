"use client";

import { useMemo, useState } from "react";
import { Truck, Search, Loader2, CheckCircle2, MapPin, Phone, Package } from "lucide-react";
import { confirmDelivery } from "@/server/actions/dispatch";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Badge, Button, Input, EmptyState } from "@/components/ui/primitives";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

export default function LogisticsClient({ dispatches }: any) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"transit" | "delivered">("transit");
  const [search, setSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const q = search.toLowerCase();
  const rows = (dispatches ?? []).filter((d: any) => {
    const matchesTab = activeTab === "transit" ? d.status === "IN_TRANSIT" : d.status === "DELIVERED";
    const text = `${d.salesOrder?.soNumber} ${d.transporter ?? ""} ${d.trackingId ?? ""} ${d.destinationWarehouse?.name ?? ""} ${d.customerName ?? ""}`.toLowerCase();
    return matchesTab && text.includes(q);
  });

  const stats = useMemo(() => ({
    transit: (dispatches ?? []).filter((d: any) => d.status === "IN_TRANSIT").length,
    delivered: (dispatches ?? []).filter((d: any) => d.status === "DELIVERED").length,
    customers: (dispatches ?? []).filter((d: any) => d.destinationType === "CUSTOMER").length,
  }), [dispatches]);

  const handleConfirm = async (id: string) => {
    setConfirmingId(id);
    try {
      const result = await confirmDelivery(id);
      if ((result as any)?.error) toast.error((result as any).error);
      else {
        toast.success("Delivery confirmed — stock updated");
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const destinationLabel = (d: any) =>
    d.destinationType === "CUSTOMER"
      ? `Customer · ${d.customerName ?? d.salesOrder?.customer?.name ?? "Unknown"}`
      : `${d.destinationType === "STORE" ? "Store" : "Warehouse"} · ${d.destinationWarehouse?.name ?? "Unknown"}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Logistics"
        title="Shipments & Deliveries"
        description="Every dispatched order, where it's headed, and how it's getting there."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="In transit" value={String(stats.transit)} hint="On the road" />
        <StatCard label="Delivered" value={String(stats.delivered)} hint="Completed" />
        <StatCard label="Customer deliveries" value={String(stats.customers)} hint="Direct to buyer" />
      </div>

      <div className="flex items-center gap-6 border-b border-border px-2">
        {(["transit", "delivered"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === tab ? "border-b-2 border-brand text-brand" : "text-text-secondary hover:text-text-primary"}`}
          >
            {tab === "transit" ? "In Transit" : "Delivered"}
          </button>
        ))}
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-text-primary">{activeTab === "transit" ? "Active shipments" : "Delivery history"}</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <Input className="w-64 pl-9" placeholder="Search shipments..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title={activeTab === "transit" ? "No shipments in transit" : "No deliveries yet"}
              description="Dispatch a passport-verified order from the Inventory → Dispatched tab."
            />
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((d: any) => (
              <div key={d.id} className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">{d.salesOrder?.soNumber}</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">
                      {d.salesOrder?.item?.group?.name ?? d.salesOrder?.item?.name ?? "Order"}
                      {d.salesOrder?.items?.[0]?.quantity ? ` · ${d.salesOrder.items[0].quantity} units` : ""}
                    </p>
                  </div>
                  <Badge className={d.status === "DELIVERED" ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}>
                    {d.status === "DELIVERED" ? "Delivered" : "In Transit"}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-xs text-text-secondary">
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0 text-text-tertiary" /> {destinationLabel(d)}</p>
                  {d.address && <p className="flex items-center gap-2"><Package className="h-3.5 w-3.5 shrink-0 text-text-tertiary" /> {d.address}</p>}
                  {d.customerPhone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-text-tertiary" /> {d.customerPhone}</p>}
                  <p className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    {d.transporter || "Transporter TBD"}{d.vehicleNo ? ` · ${d.vehicleNo}` : ""}{d.trackingId ? ` · #${d.trackingId}` : ""}
                  </p>
                  <p className="text-text-tertiary">
                    Dispatched {dayjs(d.dispatchedAt).format("MMM D, HH:mm")}
                    {d.deliveredAt ? ` · Delivered ${dayjs(d.deliveredAt).format("MMM D, HH:mm")}` : ""}
                  </p>
                  {d.notes && <p className="italic">{d.notes}</p>}
                </div>

                {d.status === "IN_TRANSIT" && (
                  <Button
                    className="mt-4 w-full gap-2"
                    disabled={confirmingId === d.id}
                    onClick={() => handleConfirm(d.id)}
                  >
                    {confirmingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm Order Delivery
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Surface>
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
