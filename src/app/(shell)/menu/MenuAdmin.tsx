"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, ErrorState, Field, Input, Panel, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

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

function rupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Menu management.
 *
 * Prices are entered in rupees because that is what a manager thinks in, and
 * converted to paise before they leave the browser — the server never sees a
 * decimal amount, so there is nowhere for a rounding error to enter.
 *
 * Retiring is the only way to remove something. The button says "Retire", not
 * "Delete", because that is what it does.
 */
export function MenuAdmin({ menu }: { menu: MenuCategory[] }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/menu");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  return (
    <>
      {failure && (
        <div className="mb-4">
          <ErrorState
            title="That change was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setNewCategory((open) => !open)}>
          {newCategory ? "Cancel" : "New section"}
        </Button>
      </div>

      {newCategory && (
        <div className="mb-6">
          <Panel title="New section">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.dinein.create_menu_category",
                  { name: String(formData.get("name") ?? "") },
                  () => setNewCategory(false),
                )
              }
            >
              <div className="min-w-[240px]">
                <Field label="Section name" htmlFor="category-name" required>
                  <Input id="category-name" name="name" required autoFocus placeholder="Starters" />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Create
              </Button>
            </form>
          </Panel>
        </div>
      )}

      {menu.length === 0 ? (
        <Panel flush>
          <EmptyState
            compact
            title="No menu yet"
            description="Create a section, then add what goes in it."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {menu.map((category) => (
            <Panel
              key={category.categoryId}
              title={category.categoryName}
              action={
                <Button
                  size="sm"
                  onClick={() =>
                    setAddingTo(addingTo === category.categoryId ? null : category.categoryId)
                  }
                >
                  {addingTo === category.categoryId ? "Close" : "Add item"}
                </Button>
              }
            >
              {addingTo === category.categoryId && (
                <form
                  className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
                  action={(formData) =>
                    run(
                      "verity.dinein.create_menu_item",
                      {
                        categoryId: category.categoryId,
                        name: String(formData.get("name") ?? ""),
                        // Rupees in, paise out. The server never sees a decimal.
                        priceMinor: Math.round(Number(formData.get("price") ?? 0) * 100),
                      },
                      () => setAddingTo(null),
                    )
                  }
                >
                  <div className="min-w-[220px] flex-1">
                    <Field label="Item" htmlFor={`item-${category.categoryId}`} required>
                      <Input id={`item-${category.categoryId}`} name="name" required autoFocus />
                    </Field>
                  </div>
                  <div className="w-[140px]">
                    <Field label="Price (₹)" htmlFor={`price-${category.categoryId}`} required>
                      <Input
                        id={`price-${category.categoryId}`}
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                      />
                    </Field>
                  </div>
                  <Button type="submit" variant="primary" disabled={pending}>
                    Add
                  </Button>
                </form>
              )}

              {category.items.length === 0 ? (
                <p className="m-0 text-[13px] text-text-secondary">Nothing in this section yet.</p>
              ) : (
                <table className="w-full border-collapse">
                  <caption className="sr-only">{category.categoryName} items</caption>
                  <thead>
                    <tr>
                      {["Item", "Price", "Portions", "State", ""].map((heading, index) => (
                        <th
                          key={heading || index}
                          className={
                            "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                            (index === 0 || index === 2 ? "text-left" : "text-right")
                          }
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {category.items.map((item) => (
                      <tr key={item.id}>
                        <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                          {item.name}
                        </td>
                        <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                          {rupees(item.priceMinor)}
                        </td>
                        <td className="border-b border-line px-3 py-2 text-[13px] text-text-secondary">
                          {item.variants.length === 0
                            ? "—"
                            : item.variants
                                .map(
                                  (variant) =>
                                    `${variant.name} ${variant.priceDeltaMinor >= 0 ? "+" : "−"}${rupees(
                                      Math.abs(variant.priceDeltaMinor),
                                    )}`,
                                )
                                .join(", ")}
                        </td>
                        <td className="border-b border-line px-3 py-2 text-right text-[13px]">
                          <span className={item.active ? "text-success" : "text-text-tertiary"}>
                            {item.active ? "On the menu" : "Retired"}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-2 text-right">
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run("verity.dinein.set_menu_item_active", {
                                itemId: item.id,
                                active: !item.active,
                              })
                            }
                          >
                            {item.active ? "Retire" : "Bring back"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
