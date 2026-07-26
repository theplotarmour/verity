"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

type Item = {
  id: string;
  name: string;
  sku: string;
  uom: string;
  location: string | null;
};

// A sheet of shelf labels. The QR encodes the SKU, which is what the
// scan-to-find inputs on the stock modals match against — scanning a shelf
// label therefore selects that material directly.
export default function ItemLabelSheet({ factoryName, items }: { factoryName: string; items: Item[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/owner/inventory"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-text-primary text-background text-xs font-bold hover:opacity-90 transition cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Print {items.length} label{items.length === 1 ? "" : "s"}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">No raw materials to label.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white text-black border-2 border-black rounded p-3 flex gap-3 break-inside-avoid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(item.sku)}`}
                alt={`QR for ${item.sku}`}
                className="w-16 h-16 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[8px] uppercase tracking-[0.15em] font-bold opacity-60 truncate">{factoryName}</p>
                <p className="text-[11px] font-bold leading-tight break-words">{item.name}</p>
                <p className="font-mono text-[10px] font-bold mt-0.5 break-all">{item.sku}</p>
                <p className="text-[9px] mt-0.5">
                  {item.location ? item.location : "No bin assigned"} · {item.uom}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
