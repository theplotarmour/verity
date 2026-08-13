"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, Receipt, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Button, Input } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { formatMenuPrice } from "@/lib/menu";
import { GST_RATE } from "@/lib/dining";
import { checkoutCounterOrder, getCounterQueue } from "@/server/actions/diningOrders";

type MenuItem = { id: string; name: string; price: number; isVeg: boolean; available: boolean };
type MenuCategory = { id: string; name: string; items: MenuItem[] };
type Ticket = {
  id: string;
  state: string;
  token: number | null;
  customerLabel: string | null;
  total: number;
  itemCount: number;
  at: string;
};
type Line = { id: string; name: string; price: number; qty: number };
type Method = "CASH" | "UPI" | "CARD";

const METHODS: Method[] = ["CASH", "UPI", "CARD"];

const STATE_STYLE: Record<string, string> = {
  NEW: "bg-warning-soft text-warning",
  ACCEPTED: "bg-accent-soft text-brand-strong",
  PREPARING: "bg-accent-soft text-brand-strong",
  READY: "bg-success-soft text-success",
  SERVED: "bg-surface-2 text-text-tertiary",
};

export function CounterClient({ menu, initialQueue }: { menu: MenuCategory[]; initialQueue: Ticket[] }) {
  const [cart, setCart] = useState<Map<string, Line>>(new Map());
  const [label, setLabel] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [queue, setQueue] = useState<Ticket[]>(initialQueue);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const add = (item: MenuItem) => {
    if (!item.available) return;
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(item.id);
      next.set(item.id, {
        id: item.id,
        name: item.name,
        price: item.price,
        qty: (line?.qty ?? 0) + 1,
      });
      return next;
    });
  };

  const bump = (id: string, delta: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(id);
      if (!line) return next;
      const qty = line.qty + delta;
      if (qty <= 0) next.delete(id);
      else next.set(id, { ...line, qty });
      return next;
    });
  };

  const lines = [...cart.values()];
  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const tax = Math.round(subtotal * GST_RATE);
  const total = subtotal + tax;

  const refreshQueue = () =>
    startTransition(async () => {
      setQueue(await getCounterQueue());
    });

  const checkout = () => {
    if (lines.length === 0) return;
    setSaving(true);
    void checkoutCounterOrder(
      lines.map((l) => ({ menuItemId: l.id, quantity: l.qty })),
      { customerLabel: label || null, paymentMethod: method }
    ).then((res) => {
      setSaving(false);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Token #${res.token} · ${formatMenuPrice(res.total)} ${method}`);
      setCart(new Map());
      setLabel("");
      refreshQueue();
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-0.5">
      <PageHeader title="Counter" description="Ring up a walk-up order and take payment at the till." />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_360px]">
        {/* Menu */}
        <div className="min-h-0 overflow-y-auto pr-1">
          {menu.length === 0 ? (
            <Surface className="rounded-[24px] p-8 text-center text-sm text-text-secondary">
              No menu items yet. Add items in Menu, then ring them up here.
            </Surface>
          ) : (
            <div className="space-y-5">
              {menu.map((cat) => (
                <section key={cat.id}>
                  <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                    {cat.name}
                  </h2>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {cat.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!item.available}
                        onClick={() => add(item)}
                        className={`flex flex-col items-start gap-1 rounded-[16px] border p-3 text-left transition-colors ${
                          item.available
                            ? "border-border bg-surface hover:border-[var(--brand)]/50"
                            : "border-border bg-surface-2 opacity-50"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${item.isVeg ? "bg-success" : "bg-danger"}`}
                          />
                          <span className="text-[13px] font-semibold text-text-primary">{item.name}</span>
                        </span>
                        <span className="font-mono text-[12px] text-text-secondary">
                          {formatMenuPrice(item.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Cart + queue */}
        <div className="flex min-h-0 flex-col gap-4">
          <Surface className="flex min-h-0 flex-1 flex-col rounded-[24px] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Ticket</span>
              {lines.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCart(new Map())}
                  className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {lines.length === 0 ? (
                <p className="mt-8 text-center text-[13px] text-text-tertiary">Tap items to add them.</p>
              ) : (
                lines.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 rounded-[12px] border border-border bg-surface-2 px-2.5 py-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{l.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => bump(l.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-mono text-[13px] text-text-primary">{l.qty}</span>
                      <button type="button" onClick={() => bump(l.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="w-16 shrink-0 text-right font-mono text-[12px] text-text-secondary">
                      {formatMenuPrice(l.price * l.qty)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Customer name (optional)" />

              <div className="grid grid-cols-3 gap-1.5">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-full px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                      method === m ? "bg-[var(--brand)] text-white" : "border border-border text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-[12px] text-text-tertiary">
                <span>Subtotal</span>
                <span className="font-mono">{formatMenuPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-text-tertiary">
                <span>GST {Math.round(GST_RATE * 100)}%</span>
                <span className="font-mono">{formatMenuPrice(tax)}</span>
              </div>
              <div className="flex items-center justify-between text-[15px] font-bold text-text-primary">
                <span>Total</span>
                <span className="font-mono">{formatMenuPrice(total)}</span>
              </div>

              <Button className="w-full" disabled={saving || lines.length === 0} onClick={checkout}>
                <Receipt className="mr-1.5 h-4 w-4" />
                {saving ? "Charging…" : `Charge ${formatMenuPrice(total)}`}
              </Button>
            </div>
          </Surface>

          {/* Live tickets */}
          <Surface className="rounded-[24px] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">In the kitchen</span>
              <span className="font-mono text-[12px] text-text-tertiary">{queue.length}</span>
            </div>
            {queue.length === 0 ? (
              <p className="py-3 text-center text-[13px] text-text-tertiary">No tickets cooking.</p>
            ) : (
              <ol className="max-h-[180px] space-y-1.5 overflow-y-auto">
                {queue.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 rounded-[12px] border border-border bg-surface-2 px-3 py-2">
                    <span className="min-w-0 truncate text-[13px] font-semibold text-text-primary">
                      #{t.token}
                      {t.customerLabel ? <span className="font-normal text-text-secondary"> · {t.customerLabel}</span> : null}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATE_STYLE[t.state] ?? "bg-surface-2 text-text-tertiary"}`}>
                      {t.state}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}
