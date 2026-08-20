"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";

import { formatPaise } from "@/lib/money";
import { createPortalOrder } from "@/server/actions/portal";

/**
 * The customer menu.
 *
 * Cart state is local and deliberately not persisted. A half-filled cart that
 * survives a reload is a promise about stock and price that a menu cannot keep;
 * the server re-prices every line at checkout anyway, so a stale cart would only
 * surprise someone at the total.
 */

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePaise: number;
  categoryName: string;
};

export function MenuClient({
  slug,
  tenantName,
  canOrder,
  items,
}: {
  slug: string;
  tenantName: string;
  canOrder: boolean;
  items: MenuItem[];
}) {
  const categories = useMemo(
    () => [...new Set(items.map((i) => i.categoryName))],
    [items],
  );
  const [category, setCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [placed, setPlaced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = category ? items.filter((i) => i.categoryName === category) : items;
  const lines = items.filter((i) => (cart[i.id] ?? 0) > 0);
  const total = lines.reduce((sum, i) => sum + i.pricePaise * (cart[i.id] ?? 0), 0);
  const count = lines.reduce((sum, i) => sum + (cart[i.id] ?? 0), 0);

  const bump = (id: string, by: number) =>
    setCart((prev) => {
      const next = Math.max(0, Math.min(99, (prev[id] ?? 0) + by));
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createPortalOrder({
        slug,
        customerName: name,
        customerPhone: phone,
        reference,
        lines: lines.map((i) => ({ itemId: i.id, quantity: cart[i.id] ?? 0 })),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPlaced(result.soNumber);
      setCart({});
      setCheckout(false);
    });
  }

  if (placed) {
    return (
      <div className="py-10 text-center">
        <span
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
        >
          <Check className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
          Order placed
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {tenantName} has your order. Quote{" "}
          <span className="font-mono font-semibold text-text-primary">{placed}</span> if you need
          to ask about it.
        </p>
        <button
          onClick={() => setPlaced(null)}
          className="mt-6 text-sm font-semibold"
          style={{ color: "var(--brand)" }}
        >
          Order something else
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Nothing on the menu yet</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {tenantName} has not published any items.
        </p>
      </div>
    );
  }

  if (checkout) {
    return (
      <div className="space-y-5 pb-8">
        <button
          onClick={() => setCheckout(false)}
          className="text-sm font-medium text-text-secondary"
        >
          ← Back to menu
        </button>

        <h1 className="text-xl font-semibold tracking-[-0.03em] text-text-primary">Your order</h1>

        <div className="space-y-2">
          {lines.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-text-primary">
                {cart[i.id]} × {i.name}
              </span>
              <span className="font-mono text-text-secondary">
                {formatPaise(i.pricePaise * (cart[i.id] ?? 0))}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
            <span className="text-text-primary">Total</span>
            <span className="font-mono text-text-primary">{formatPaise(total)}</span>
          </div>
        </div>

        <Field label="Name" value={name} onChange={setName} autoFocus />
        <Field label="Phone" value={phone} onChange={setPhone} inputMode="tel" />
        <Field
          label="Table or pickup name (optional)"
          value={reference}
          onChange={setReference}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          onClick={submit}
          disabled={pending || lines.length === 0}
          className="w-full rounded-xl py-4 text-base font-semibold transition active:scale-[0.99] disabled:opacity-60"
          style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
        >
          {pending ? "Sending…" : `Place order · ${formatPaise(total)}`}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip label="All" active={category === null} onClick={() => setCategory(null)} />
        {categories.map((c) => (
          <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {shown.map((item) => {
          const qty = cart[item.id] ?? 0;
          return (
            <article
              key={item.id}
              className="verity-glass flex flex-col overflow-hidden rounded-[20px]"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="text-sm font-semibold leading-tight text-text-primary">{item.name}</p>
                {item.description && (
                  <p className="line-clamp-2 text-[11px] text-text-secondary">{item.description}</p>
                )}
                <p className="mt-auto pt-2 font-mono text-sm font-semibold text-text-primary">
                  {formatPaise(item.pricePaise)}
                </p>

                {canOrder &&
                  (qty === 0 ? (
                    <button
                      onClick={() => bump(item.id, 1)}
                      className="mt-2 h-10 w-full rounded-lg text-sm font-semibold transition active:scale-[0.98]"
                      style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
                    >
                      Add
                    </button>
                  ) : (
                    <div className="mt-2 flex h-10 items-center justify-between rounded-lg border border-border">
                      <button
                        onClick={() => bump(item.id, -1)}
                        aria-label={`One less ${item.name}`}
                        className="flex h-10 w-10 items-center justify-center text-text-secondary"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-mono text-sm font-semibold text-text-primary">
                        {qty}
                      </span>
                      <button
                        onClick={() => bump(item.id, 1)}
                        aria-label={`One more ${item.name}`}
                        className="flex h-10 w-10 items-center justify-center text-text-secondary"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </article>
          );
        })}
      </div>

      {canOrder && count > 0 && (
        <button
          onClick={() => setCheckout(true)}
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <span
            className="flex w-full items-center justify-between rounded-xl px-5 py-4 text-base font-semibold shadow-lg"
            style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {count} item{count === 1 ? "" : "s"}
            </span>
            <span className="font-mono">{formatPaise(total)}</span>
          </span>
        </button>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full border border-border px-4 py-2 text-xs font-semibold transition"
      style={
        active
          ? {
              background: "var(--brand)",
              color: "var(--brand-contrast)",
              borderColor: "var(--brand)",
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "tel";
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-base text-text-primary outline-none focus:border-[var(--brand)]"
      />
    </label>
  );
}
