"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Car, Palette, Layers, FileText, Ruler } from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { DesignReference } from "@/components/factory/DesignReference";

// The full build spec for floor staff (workers + supervisors): vehicle, product,
// design, fabric, colour, seat specs, quantity and remarks.
//
// Customer identity is deliberately excluded — the floor needs to know WHAT to
// build, not WHO it is for.

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "" ) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-text-primary break-words">{value}</span>
    </div>
  );
}

export function OrderSpecCard({ order, defaultOpen = true }: { order: any; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!order) return null;

  const vehicle = [order.vehicleBrand?.name, order.vehicleModel?.name].filter(Boolean).join(" ");
  const seatSpec = [
    order.seatType,
    order.headrestCount ? `${order.headrestCount} HDR` : null,
    order.hasArmrest ? "Armrest" : null,
  ].filter(Boolean).join(" · ");
  const specFields: Array<{ label: string; value: string }> = order.specFields ?? [];
  const designImages: string[] = order.designImages ?? [];

  return (
    <Surface className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" /> : <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Order spec</p>
          <p className="truncate text-sm font-semibold text-text-primary">
            {vehicle || order.productName || order.orderNumber}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-secondary">
          {order.orderQuantity ?? 1} pc{(order.orderQuantity ?? 1) === 1 ? "" : "s"}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          <div className="divide-y divide-border/50">
            <div className="pb-1">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                <Car className="h-3 w-3" /> Vehicle
              </p>
              <Row label="Model" value={vehicle} />
              <Row label="Generation" value={order.vehicleYear} />
            </div>

            <div className="py-1">
              <p className="my-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                <Layers className="h-3 w-3" /> Product
              </p>
              <Row label="Product" value={order.productName} />
              <Row label="Variant" value={order.variantName} />
              <Row label="Specs" value={seatSpec} />
              {specFields.map((s) => <Row key={s.label} label={s.label} value={s.value} />)}
            </div>

            <div className="py-1">
              <p className="my-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                <Palette className="h-3 w-3" /> Material &amp; finish
              </p>
              <Row label="Design" value={order.designName} />
              <Row label="Family" value={order.designFamily} />
              <Row label="Fabric" value={order.fabricName} />
              <Row label="Colour" value={order.colorName} />
              {order.fabricConsumption ? <Row label="Fabric/unit" value={`${order.fabricConsumption} m`} /> : null}
            </div>

            {(order.remarks || order.cadFileUrl) && (
              <div className="py-1">
                <p className="my-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                  <FileText className="h-3 w-3" /> Instructions
                </p>
                {order.remarks && <p className="py-1 text-sm italic text-text-secondary">“{order.remarks}”</p>}
                {order.cadFileUrl && (
                  <a href={order.cadFileUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-[var(--brand)] hover:underline">
                    <Ruler className="h-3 w-3" /> Open CAD / cutting pattern
                  </a>
                )}
              </div>
            )}
          </div>

          {designImages.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Design reference</p>
              <DesignReference images={designImages} designName={order.designName ?? "Design"} compact />
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}
