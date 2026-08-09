"use client";

import { Printer, ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import type { MaterialLine } from "@/server/actions/cad";

type OrderInfo = {
  soNumber: string;
  customerName: string;
  orderDate: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  designImage: string | null;
  cadFileUrl: string | null;
  // The item's own answered fields, product-agnostic — no hardcoded labels.
  specDetails: { label: string; value: string }[];
  remarks: string | null;
};

export function ProductionLabel({
  factoryName,
  labelCode,
  qrCodeUrl,
  order,
  materials,
}: {
  factoryName: string;
  labelCode: string;
  qrCodeUrl: string;
  order: OrderInfo;
  materials: MaterialLine[];
}) {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/owner/production"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Production
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-text-primary text-background text-xs font-bold hover:opacity-90 transition cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Print Label
        </button>
      </div>

      {/* The printed sheet. Kept to plain borders and black text so it survives
          a cheap floor printer and stays legible taped to a bag. */}
      <div className="bg-white text-black border-2 border-black rounded-lg overflow-hidden print:border-black print:rounded-none">
        <div className="flex items-stretch justify-between border-b-2 border-black">
          <div className="p-4 flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold">{factoryName}</p>
            <p className="text-3xl font-black tracking-tight mt-1 break-all">{labelCode}</p>
            <p className="text-[11px] font-semibold mt-1">
              {order.soNumber} · {new Date(order.orderDate).toLocaleDateString()}
            </p>
          </div>
          <div className="p-3 border-l-2 border-black flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeUrl} alt="Label QR" className="w-24 h-24" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 border-b-2 border-black text-xs">
          <Field label="Customer" value={order.customerName} />
          <Field label="Quantity" value={`${order.quantity}`} />
          <Field label="Product" value={[order.productName, order.variantName].filter(Boolean).join(" — ")} />
          {order.specDetails.map((d) => (
            <Field key={d.label} label={d.label} value={d.value || "—"} />
          ))}
        </div>

        {/* Cutting issues exactly this much material and no more. */}
        <div className="p-4 border-b-2 border-black">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2">Material Requirement (calculated)</p>
          {materials.length === 0 ? (
            <p className="text-xs">
              Not calculated — set the design&apos;s standard fabric consumption in Master Data.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="py-1 font-bold">Material</th>
                  <th className="py-1 font-bold text-right">Per Unit</th>
                  <th className="py-1 font-bold text-right">Total to Issue</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={m.itemId ?? i} className="border-b border-black/20 last:border-0">
                    <td className="py-1">{m.name}</td>
                    <td className="py-1 text-right">{m.perUnit} {m.uom}</td>
                    <td className="py-1 text-right font-bold">{m.quantity} {m.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Signed off at each handover so the bag's route is auditable on paper
            as well as in the system. */}
        <div className="p-4 border-b-2 border-black">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3">Department Handover</p>
          <div className="grid grid-cols-3 gap-3">
            {["CAD", "Cutting", "Stitching", "QC", "Packing", "Dispatch"].map((d) => (
              <div key={d} className="border border-black rounded p-2">
                <p className="text-[10px] font-bold uppercase">{d}</p>
                <div className="h-8 border-b border-dashed border-black/50 mt-2" />
                <p className="text-[8px] mt-1">Sign / Date</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 flex items-start gap-4">
          {order.designImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={order.designImage}
              alt="Design reference"
              className="w-28 h-28 object-cover border border-black rounded shrink-0"
            />
          )}
          <div className="min-w-0 flex-1 text-xs">
            {order.remarks && (
              <>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Remarks</p>
                <p className="mt-1 break-words">{order.remarks}</p>
              </>
            )}
            {order.cadFileUrl && (
              <a
                href={order.cadFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 font-semibold underline print:no-underline"
              >
                <FileText className="h-3.5 w-3.5" /> CAD / cutting pattern
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-[0.15em] font-bold opacity-60">{label}</p>
      <p className="font-semibold break-words">{value}</p>
    </div>
  );
}
