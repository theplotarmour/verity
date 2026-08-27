"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Input, Panel } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";
import type { OrderDetail } from "@/server/capabilities/dinein";

type MenuCategory = {
  categoryId: string;
  categoryName: string;
  items: Array<{
    id: string;
    name: string;
    priceMinor: number;
    active: boolean;
    variants: Array<{ id: string; name: string; priceDeltaMinor: number }>;
  }>;
};

/** Paise to rupees, for display only. Every calculation stays in paise. */
function rupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const LINE_STATE: Record<string, { label: string; tone: string }> = {
  queued: { label: "With kitchen", tone: "text-text-secondary" },
  preparing: { label: "Cooking", tone: "text-info" },
  ready: { label: "On the pass", tone: "text-accent-ink" },
  served: { label: "Served", tone: "text-success" },
  voided: { label: "Voided", tone: "text-text-tertiary line-through" },
};

/**
 * The order pad.
 *
 * Built for someone standing up, holding a tablet, with a guest waiting: big
 * targets, one tap to add, and the running total always visible. The
 * side-by-side layout collapses to menu-then-order on a phone rather than
 * shrinking both into uselessness.
 *
 * Nothing is calculated here that the server will calculate again. The total
 * shown is a courtesy; the bill is computed server-side from the snapshots.
 */
export function OrderPad({ order, menu }: { order: OrderDetail; menu: MenuCategory[] }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const categories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return menu;
    return menu
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => item.name.toLowerCase().includes(term)),
      }))
      .filter((category) => category.items.length > 0);
  }, [menu, search]);

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, `/floor/${order.id}`);
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const canAdd = ["draft", "placed", "partially_served"].includes(order.state);
  const canPlace = order.state === "draft" && order.lines.length > 0;
  const servedCount = order.lines.filter((line) => line.state === "served").length;
  const liveCount = order.lines.filter((line) => line.state !== "voided").length;

  return (
    <>
      {failure && (
        <div className="mb-4">
          <ErrorState
            title="That did not happen"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Panel title="Menu">
          <div className="mb-4">
            <label htmlFor="menu-search" className="sr-only">
              Search the menu
            </label>
            <Input
              id="menu-search"
              type="search"
              placeholder="Search the menu"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {!canAdd && (
            <p className="mb-4 mt-0 text-[13px] text-text-secondary">
              This order is {order.state.replace("_", " ")} — nothing more can be added to it.
            </p>
          )}

          <div className="flex flex-col gap-5">
            {categories.map((category) => (
              <section key={category.categoryId}>
                <h3 className="mb-2">{category.categoryName}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] text-text">{item.name}</span>
                        <span className="text-[12px] text-text-tertiary">
                          {rupees(item.priceMinor)}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          disabled={!canAdd || pending}
                          onClick={() =>
                            run("verity.dinein.add_order_lines", {
                              orderId: order.id,
                              lines: [{ itemId: item.id, qty: 1 }],
                            })
                          }
                        >
                          Add
                        </Button>
                        {item.variants.map((variant) => (
                          <Button
                            key={variant.id}
                            size="sm"
                            disabled={!canAdd || pending}
                            onClick={() =>
                              run("verity.dinein.add_order_lines", {
                                orderId: order.id,
                                lines: [{ itemId: item.id, variantId: variant.id, qty: 1 }],
                              })
                            }
                          >
                            {variant.name}
                          </Button>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={`Order · ${liveCount} ${liveCount === 1 ? "line" : "lines"}`}>
            {order.lines.length === 0 ? (
              <p className="m-0 text-[13px] text-text-secondary">
                Nothing yet. Tap an item to start.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {order.lines.map((line) => {
                  const state = LINE_STATE[line.state] ?? LINE_STATE.queued!;
                  return (
                    <li key={line.id} className="border-b border-line pb-2 last:border-b-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 text-[14px] text-text">
                          {line.qty} × {line.itemName}
                          {line.variantName && (
                            <span className="text-text-tertiary"> ({line.variantName})</span>
                          )}
                        </span>
                        <span className="tabular shrink-0 text-[14px]">
                          {rupees(line.lineTotalMinor)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className={`text-[12px] ${state.tone}`}>{state.label}</span>
                        {line.state === "ready" && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run("verity.dinein.advance_order_line", {
                                lineId: line.id,
                                to: "served",
                              })
                            }
                          >
                            Mark served
                          </Button>
                        )}
                      </div>
                      {line.lineNote && (
                        <p className="mb-0 mt-1 text-[12px] text-text-tertiary">{line.lineNote}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[13px] text-text-secondary">Subtotal</span>
              <span className="tabular text-[16px] text-text">{rupees(order.subtotalMinor)}</span>
            </div>
            <p className="mb-0 mt-1 text-[12px] text-text-tertiary">
              Taxes are added when the counter generates the bill.
            </p>
          </Panel>

          <Panel title="Service">
            <div className="flex flex-col gap-2">
              {canPlace && (
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() => run("verity.dinein.place_order", { orderId: order.id })}
                >
                  {pending ? "Sending…" : "Send to kitchen"}
                </Button>
              )}

              {order.state === "served" && (
                <p className="m-0 text-[13px] text-text-secondary">
                  Everything is served. The counter can bill this table.
                </p>
              )}

              {["draft", "placed", "partially_served"].includes(order.state) && (
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() => run("verity.dinein.cancel_order", { orderId: order.id })}
                >
                  Cancel order
                </Button>
              )}

              <p className="mb-0 mt-1 text-[12px] text-text-tertiary">
                {servedCount} of {liveCount} served.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
