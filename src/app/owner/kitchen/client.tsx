"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Clock, Flame, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/primitives";
import { Surface } from "@/components/design/Surface";
import { PageHeader } from "@/components/design/PageHeader";
import { toast } from "@/components/ui/toast";
import { acceptOrder, markReady, startPreparing } from "@/server/actions/kitchen";
import { orderLabel } from "@/lib/dining";
import { cn } from "@/lib/utils";

type QueueItem = {
  id: string;
  quantity: number;
  notes: string | null;
  menuItem: { id: string; name: string; isVeg: boolean };
};

export type QueueOrder = {
  id: string;
  state: string;
  notes: string | null;
  createdAt: string | Date;
  waitingMinutes: number;
  // Null for a table-less counter ticket, which is called by its token instead.
  table: { id: string; number: string } | null;
  token?: number | null;
  customerLabel?: string | null;
  items: QueueItem[];
};

/**
 * Two columns: what is queued, and what is on. Nothing else.
 *
 * A kitchen screen is read across a hot room at arm's length, so the type is large,
 * there is one action per card, and the action is whatever that ticket's state
 * allows — no menus, no state picker. The one decision a cook makes here is "next",
 * and the screen should not make them find it.
 */
export function KitchenClient({ orders, canWork }: { orders: QueueOrder[]; canWork: boolean }) {
  const queued = orders.filter((o) => o.state === "NEW" || o.state === "ACCEPTED");
  const cooking = orders.filter((o) => o.state === "PREPARING");

  return (
    <div className="flex h-full w-full flex-col gap-4 p-0.5">
      <PageHeader
        title="Kitchen"
        actions={
          <span className="font-mono text-sm text-text-secondary">
            {queued.length} queued · {cooking.length} on
          </span>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <Column title="Queue" hint="Oldest first" empty="No tickets waiting." orders={queued} canWork={canWork} />
        <Column title="Preparing" hint="On the pass next" empty="Nothing on." orders={cooking} canWork={canWork} />
      </div>
    </div>
  );
}

function Column({
  title,
  hint,
  empty,
  orders,
  canWork,
}: {
  title: string;
  hint: string;
  empty: string;
  orders: QueueOrder[];
  canWork: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-baseline justify-between border-b border-border/60 pb-2">
        <h2 className="font-display text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          {title}
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
          {hint}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <ChefHat className="h-6 w-6 text-text-tertiary" />
          <p className="text-[13px] text-text-secondary">{empty}</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {orders.map((order) => (
            <Ticket key={order.id} order={order} canWork={canWork} />
          ))}
        </div>
      )}
    </section>
  );
}

/** The one action this ticket's state allows. */
const NEXT_ACTION: Record<string, { label: string; run: (id: string) => Promise<unknown> }> = {
  NEW: { label: "Accept", run: acceptOrder },
  ACCEPTED: { label: "Start preparing", run: startPreparing },
  PREPARING: { label: "Mark ready", run: markReady },
};

function Ticket({ order, canWork }: { order: QueueOrder; canWork: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const action = NEXT_ACTION[order.state];
  // Twenty minutes is when a table starts looking at the kitchen door.
  const late = order.waitingMinutes >= 20;

  const run = () => {
    if (!action) return;
    setDone(true);
    startTransition(async () => {
      const result = (await action.run(order.id)) as { error?: string } | undefined;
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
        late && "border-[var(--brand)]/40",
        done && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold tracking-[-0.03em] text-text-primary">
            {orderLabel(order)}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase text-text-tertiary">
            #{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 font-mono text-sm font-semibold",
            late ? "text-[var(--brand)]" : "text-text-secondary"
          )}
          title={`Ordered ${order.waitingMinutes} minutes ago`}
        >
          {late ? <Flame className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {order.waitingMinutes}m
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-baseline gap-2.5">
            <span className="shrink-0 font-mono text-base font-bold text-[var(--brand)]">
              {item.quantity}&times;
            </span>
            <span className="min-w-0">
              <span className="text-[15px] font-medium text-text-primary">
                {item.menuItem.name}
              </span>
              {item.notes ? (
                // The line a cook must not miss — allergies and "no onion" live here.
                <span className="mt-0.5 block text-[12px] font-semibold text-[var(--warning)]">
                  {item.notes}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {order.notes ? (
        <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[12px] font-medium text-text-secondary">
          {order.notes}
        </p>
      ) : null}

      {action && canWork ? (
        <Button onClick={run} disabled={pending || done} className="mt-3 h-11 w-full gap-2 text-sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {action.label}
        </Button>
      ) : null}
    </Surface>
  );
}
