"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/primitives";
import { Surface } from "@/components/design/Surface";
import { PageHeader } from "@/components/design/PageHeader";
import { toast } from "@/components/ui/toast";
import { markServed } from "@/server/actions/serving";
import { orderLabel } from "@/lib/dining";
import { cn } from "@/lib/utils";

type ReadyItem = {
  id: string;
  quantity: number;
  notes: string | null;
  menuItem: { id: string; name: string; isVeg: boolean };
};

export type ReadyOrder = {
  id: string;
  notes: string | null;
  updatedAt: string | Date;
  readyForMinutes: number;
  // Null for a table-less counter ticket, called by its token instead.
  table: { id: string; number: string } | null;
  token?: number | null;
  customerLabel?: string | null;
  items: ReadyItem[];
};

/**
 * The pass: one list, longest wait at the top.
 *
 * Empty is the normal state and it says so plainly — a spinner on an empty pass
 * reads as "loading", and a server would stand watching it.
 */
export function ServingClient({ orders, canWork }: { orders: ReadyOrder[]; canWork: boolean }) {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-0.5">
      <PageHeader
        title="Ready to serve"
        actions={
          <span className="font-mono text-sm text-text-secondary">
            {orders.length} waiting
          </span>
        }
      />

      {orders.length === 0 ? (
        <Surface className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <Check className="h-7 w-7 text-success" />
          <p className="text-[15px] font-semibold text-text-primary">Pass is clear</p>
          <p className="max-w-[34ch] text-[13px] text-text-secondary">
            Nothing waiting. Dishes appear here the moment the kitchen marks them ready.
          </p>
        </Surface>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {orders.map((order) => (
            <ReadyCard key={order.id} order={order} canWork={canWork} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReadyCard({ order, canWork }: { order: ReadyOrder; canWork: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  // Five minutes under a heat lamp is the point food stops being what the kitchen
  // sent out.
  const cold = order.readyForMinutes >= 5;

  const serve = () => {
    setDone(true);
    startTransition(async () => {
      const result = (await markServed(order.id)) as { error?: string } | undefined;
      if (result?.error) {
        setDone(false);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Surface
      className={cn(
        "border p-4 transition-opacity",
        cold && "border-[var(--brand)]/40",
        done && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <p className="font-display text-xl font-bold tracking-[-0.03em] text-text-primary">
              {orderLabel(order)}
            </p>
            <span
              className={cn(
                "flex items-center gap-1 font-mono text-sm font-semibold",
                cold ? "text-[var(--brand)]" : "text-text-secondary"
              )}
              title={`Ready ${order.readyForMinutes} minutes ago`}
            >
              <Clock className="h-3.5 w-3.5" />
              {order.readyForMinutes}m
            </span>
          </div>

          <p className="mt-2 text-[14px] text-text-secondary">
            {order.items
              .map((item) => `${item.quantity}× ${item.menuItem.name}`)
              .join(", ")}
          </p>

          {order.notes ? (
            <p className="mt-2 text-[12px] font-medium text-text-tertiary">{order.notes}</p>
          ) : null}
        </div>

        {canWork ? (
          <Button
            onClick={serve}
            disabled={pending || done}
            className="h-11 shrink-0 gap-2 px-5 text-sm"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UtensilsCrossed className="h-4 w-4" />
            )}
            Served
          </Button>
        ) : null}
      </div>
    </Surface>
  );
}
