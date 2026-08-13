"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { formatMenuPrice } from "@/lib/menu";
import { cn } from "@/lib/utils";

export type FloorTable = {
  id: string;
  number: string;
  capacity: number;
  state: string;
  orderId: string | null;
  orderState: string | null;
  orderTotal: number | null;
};

/**
 * The room, colour-coded by table state.
 *
 * Semantic tokens for text everywhere; the state colours are the existing brand
 * variables, not new ones. A table with a live order links to it; a free table is
 * not a link, because there is nothing to open.
 *
 * Scrolls inside its own box — forty tables must not put a scrollbar on the page.
 */
const STATE_STYLE: Record<string, string> = {
  AVAILABLE: "border-border bg-surface-2",
  OCCUPIED: "border-[var(--warning)]/40 bg-[var(--warning)]/10",
  ORDERED: "border-[var(--warning)]/40 bg-[var(--warning)]/10",
  PREPARING: "border-[var(--brand)]/40 bg-[var(--brand)]/10",
  READY: "border-success/50 bg-success-soft/30",
  SERVED: "border-success/40 bg-success-soft/20",
  BILLING: "border-[var(--warning)]/60 bg-[var(--warning)]/15",
  PAID: "border-border bg-surface-2",
};

export function RestaurantFloor({ tables }: { tables: FloorTable[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <p className="text-[11px] text-text-tertiary">Tap a busy table to open its order.</p>
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:bg-surface-2 hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", pending && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid max-h-[420px] grid-cols-2 items-stretch gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => {
          const card = (
            <div
              className={cn(
                "flex h-full flex-col justify-between rounded-[12px] border p-3 transition",
                STATE_STYLE[table.state] ?? "border-border bg-surface-2",
                table.orderId && "hover:shadow-[var(--shadow-card)]"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-[15px] font-bold tracking-[-0.02em] text-text-primary">
                  {table.number}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                  {table.capacity}p
                </span>
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">
                {(table.orderState ?? table.state).toLowerCase()}
              </p>
              {table.orderTotal !== null ? (
                <p className="mt-0.5 font-mono text-[12px] font-semibold text-text-primary">
                  {formatMenuPrice(table.orderTotal)}
                </p>
              ) : null}
            </div>
          );

          return table.orderId ? (
            <Link key={table.id} href={`/owner/tables?order=${table.orderId}`} className="min-w-0">
              {card}
            </Link>
          ) : (
            <div key={table.id} className="min-w-0">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
