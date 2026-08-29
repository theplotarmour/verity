"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, ErrorState, Field, Input, Panel, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type ProductType = "PHYSICAL" | "SERVICE";

type Brand = {
  brandId: string;
  brandName: string;
  brandActive: boolean;
  products: Array<{
    id: string;
    name: string;
    hsnCode: string;
    thicknessTenthMm: number | null;
    widthMm: number | null;
    heightMm: number | null;
    grade: string;
    unitLabel: string;
    reorderLevelUnits: number;
    active: boolean;
    type: ProductType;
  }>;
};

/**
 * "18.0 mm" — one decimal, always, so the column reads as a column.
 *
 * The store thinks in tenths of a millimetre because a thickness is exact; the
 * screen thinks in what is painted on the edge of the board. `null` is a
 * service or a hardware item with no sheet thickness at all, not a zero.
 */
function thickness(tenthMm: number | null): string {
  return tenthMm == null ? "—" : `${(tenthMm / 10).toFixed(1)} mm`;
}

/** "2440 × 1220" — the size a trader says out loud, in the order they say it. */
function sheetSize(widthMm: number | null, heightMm: number | null): string {
  return widthMm == null || heightMm == null ? "—" : `${widthMm} × ${heightMm}`;
}

/**
 * The catalogue.
 *
 * Grouped by brand because that is how the trade is organised and how a stock
 * question arrives: "do we have the Century BWR in 18". Within a brand the scan
 * target is the size, not the name — so thickness and sheet size are set in
 * tabular numerals and given their own columns, which lets the eye run down one
 * column instead of parsing a sentence per row.
 *
 * Dimensions appear on the creation form and never on the edit form. That is
 * not an oversight: editing a size in place would silently restate every past
 * movement and invoice line that referenced the product.
 */
export function CatalogueAdmin({ catalogue }: { catalogue: Brand[] }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/catalogue");
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
        <Button variant="primary" onClick={() => setNewBrand((open) => !open)}>
          {newBrand ? "Cancel" : "New brand"}
        </Button>
      </div>

      {newBrand && (
        <div className="mb-6">
          <Panel title="New brand">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.create_brand",
                  { name: String(formData.get("name") ?? "") },
                  () => setNewBrand(false),
                )
              }
            >
              <div className="min-w-[240px]">
                <Field label="Brand name" htmlFor="brand-name" required>
                  <Input id="brand-name" name="name" required autoFocus placeholder="Century Ply" />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Create
              </Button>
            </form>
          </Panel>
        </div>
      )}

      {catalogue.length === 0 ? (
        <Panel flush>
          <EmptyState
            compact
            title="No brands yet"
            description="Add a brand, then add the boards you buy and sell under it."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {catalogue.map((brand) => (
            <Panel
              key={brand.brandId}
              title={brand.brandName}
              action={
                <div className="flex items-center gap-2">
                  {!brand.brandActive && (
                    <span className="text-[12px] text-text-tertiary">No longer traded</span>
                  )}
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run("verity.plywood.set_brand_active", {
                        brandId: brand.brandId,
                        active: !brand.brandActive,
                      })
                    }
                  >
                    {brand.brandActive ? "Stop trading" : "Trade again"}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!brand.brandActive}
                    onClick={() =>
                      setAddingTo(addingTo === brand.brandId ? null : brand.brandId)
                    }
                  >
                    {addingTo === brand.brandId ? "Close" : "Add board"}
                  </Button>
                </div>
              }
            >
              {addingTo === brand.brandId && (
                <form
                  className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
                  action={(formData) => {
                    const thicknessRaw = String(formData.get("thickness") ?? "").trim();
                    const widthRaw = String(formData.get("width") ?? "").trim();
                    const heightRaw = String(formData.get("height") ?? "").trim();
                    run(
                      "verity.plywood.create_product",
                      {
                        brandId: brand.brandId,
                        name: String(formData.get("name") ?? ""),
                        hsnCode: String(formData.get("hsn") ?? ""),
                        grade: String(formData.get("grade") ?? ""),
                        type: String(formData.get("type") ?? "PHYSICAL"),
                        unitLabel: String(formData.get("unitLabel") ?? "sheets"),
                        // Millimetres in, tenths out — the same reason prices
                        // are entered in rupees and stored in paise. Absent
                        // for a service or an item with no sheet size —
                        // sending 0 would fail the database's own
                        // strictly-positive-when-not-null check.
                        ...(thicknessRaw
                          ? { thicknessTenthMm: Math.round(Number(thicknessRaw) * 10) }
                          : {}),
                        ...(widthRaw ? { widthMm: Number(widthRaw) } : {}),
                        ...(heightRaw ? { heightMm: Number(heightRaw) } : {}),
                        reorderLevelUnits: Number(formData.get("reorder") ?? 0),
                      },
                      () => setAddingTo(null),
                    );
                  }}
                >
                  <div className="min-w-[200px] flex-1">
                    <Field label="Board" htmlFor={`name-${brand.brandId}`} required>
                      <Input
                        id={`name-${brand.brandId}`}
                        name="name"
                        required
                        autoFocus
                        placeholder="Sainik 710"
                      />
                    </Field>
                  </div>
                  <div className="w-[110px]">
                    <Field label="Grade" htmlFor={`grade-${brand.brandId}`} required>
                      <Input id={`grade-${brand.brandId}`} name="grade" required placeholder="BWR" />
                    </Field>
                  </div>
                  <div className="w-[130px]">
                    <Field label="Type" htmlFor={`type-${brand.brandId}`}>
                      <Select id={`type-${brand.brandId}`} name="type" defaultValue="PHYSICAL">
                        <option value="PHYSICAL">Physical</option>
                        <option value="SERVICE">Service</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="w-[110px]">
                    <Field label="Unit" htmlFor={`unit-${brand.brandId}`}>
                      <Select id={`unit-${brand.brandId}`} name="unitLabel" defaultValue="sheets">
                        <option value="sheets">Sheets</option>
                        <option value="pcs">Pcs</option>
                        <option value="pairs">Pairs</option>
                        <option value="CFT">CFT</option>
                        <option value="RFT">RFT</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="w-[130px]">
                    <Field
                      label="Thickness (mm)"
                      htmlFor={`thickness-${brand.brandId}`}
                      hint="Leave blank for a service"
                    >
                      <Input
                        id={`thickness-${brand.brandId}`}
                        name="thickness"
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="18"
                      />
                    </Field>
                  </div>
                  <div className="w-[120px]">
                    <Field label="Width (mm)" htmlFor={`width-${brand.brandId}`}>
                      <Input
                        id={`width-${brand.brandId}`}
                        name="width"
                        type="number"
                        min="1"
                        placeholder="2440"
                      />
                    </Field>
                  </div>
                  <div className="w-[120px]">
                    <Field label="Height (mm)" htmlFor={`height-${brand.brandId}`}>
                      <Input
                        id={`height-${brand.brandId}`}
                        name="height"
                        type="number"
                        min="1"
                        placeholder="1220"
                      />
                    </Field>
                  </div>
                  <div className="w-[130px]">
                    <Field
                      label="HSN code"
                      htmlFor={`hsn-${brand.brandId}`}
                      required
                      hint="4, 6 or 8 digits"
                    >
                      <Input
                        id={`hsn-${brand.brandId}`}
                        name="hsn"
                        required
                        inputMode="numeric"
                        pattern="[0-9]{4}([0-9]{2}([0-9]{2})?)?"
                        placeholder="44121000"
                      />
                    </Field>
                  </div>
                  <div className="w-[130px]">
                    <Field
                      label="Reorder below"
                      htmlFor={`reorder-${brand.brandId}`}
                      hint="Sheets"
                    >
                      <Input
                        id={`reorder-${brand.brandId}`}
                        name="reorder"
                        type="number"
                        min="0"
                        defaultValue={0}
                      />
                    </Field>
                  </div>
                  <Button type="submit" variant="primary" disabled={pending}>
                    Add
                  </Button>
                </form>
              )}

              {brand.products.length === 0 ? (
                <p className="m-0 text-[13px] text-text-secondary">
                  No boards under this brand yet.
                </p>
              ) : (
                <table className="w-full border-collapse">
                  <caption className="sr-only">{brand.brandName} boards</caption>
                  <thead>
                    <tr>
                      {["Board", "Type", "Grade", "Thickness", "Sheet (mm)", "HSN", "Reorder", "State", ""].map(
                        (heading, index) => (
                          <th
                            key={heading || index}
                            className={
                              "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                              (index <= 1 ? "text-left" : "text-right")
                            }
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {brand.products.map((product) => (
                      <tr key={product.id}>
                        <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                          {product.name}
                        </td>
                        <td className="border-b border-line px-3 py-2 text-[13px] text-text-secondary">
                          {product.type === "SERVICE" ? "Service" : "Physical"}
                        </td>
                        <td className="border-b border-line px-3 py-2 text-[13px] text-text-secondary">
                          {product.grade}
                        </td>
                        {/* Tabular numerals so thickness and size read down the
                            column — this is the scan the trade actually does. */}
                        <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                          {thickness(product.thicknessTenthMm)}
                        </td>
                        <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                          {sheetSize(product.widthMm, product.heightMm)}
                        </td>
                        <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                          {product.hsnCode}
                        </td>
                        <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                          {product.reorderLevelUnits === 0
                            ? "—"
                            : `${product.reorderLevelUnits} ${product.unitLabel}`}
                        </td>
                        <td className="border-b border-line px-3 py-2 text-right text-[13px]">
                          <span className={product.active ? "text-success" : "text-text-tertiary"}>
                            {product.active ? "Trading" : "Withdrawn"}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                setEditing(editing === product.id ? null : product.id)
                              }
                            >
                              {editing === product.id ? "Close" : "Edit"}
                            </Button>
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                run("verity.plywood.set_product_active", {
                                  productId: product.id,
                                  active: !product.active,
                                })
                              }
                            >
                              {product.active ? "Withdraw" : "Trade again"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {editing && brand.products.some((product) => product.id === editing) && (
                <EditProduct
                  product={brand.products.find((product) => product.id === editing)!}
                  pending={pending}
                  onSubmit={(input) =>
                    run("verity.plywood.edit_product", input, () => setEditing(null))
                  }
                />
              )}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Correcting a board's description.
 *
 * Name, grade, HSN and reorder level only. The size is absent because the
 * command that backs this form does not accept one, and a form that offered a
 * field the server ignores would be a lie told politely.
 */
function EditProduct({
  product,
  pending,
  onSubmit,
}: {
  product: Brand["products"][number];
  pending: boolean;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
      action={(formData) =>
        onSubmit({
          productId: product.id,
          name: String(formData.get("name") ?? ""),
          grade: String(formData.get("grade") ?? ""),
          hsnCode: String(formData.get("hsn") ?? ""),
          reorderLevelUnits: Number(formData.get("reorder") ?? 0),
        })
      }
    >
      <div className="min-w-[200px] flex-1">
        <Field label="Board" htmlFor={`edit-name-${product.id}`} required>
          <Input id={`edit-name-${product.id}`} name="name" defaultValue={product.name} required />
        </Field>
      </div>
      <div className="w-[110px]">
        <Field label="Grade" htmlFor={`edit-grade-${product.id}`} required>
          <Input
            id={`edit-grade-${product.id}`}
            name="grade"
            defaultValue={product.grade}
            required
          />
        </Field>
      </div>
      <div className="w-[140px]">
        <Field
          label="HSN code"
          htmlFor={`edit-hsn-${product.id}`}
          required
          hint="4, 6 or 8 digits"
        >
          <Input
            id={`edit-hsn-${product.id}`}
            name="hsn"
            defaultValue={product.hsnCode}
            required
            inputMode="numeric"
            pattern="[0-9]{4}([0-9]{2}([0-9]{2})?)?"
          />
        </Field>
      </div>
      <div className="w-[130px]">
        <Field label="Reorder below" htmlFor={`edit-reorder-${product.id}`} hint="Sheets">
          <Input
            id={`edit-reorder-${product.id}`}
            name="reorder"
            type="number"
            min="0"
            defaultValue={product.reorderLevelUnits}
          />
        </Field>
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        Save
      </Button>
      <p className="m-0 w-full text-[12px] text-text-tertiary">
        {product.type === "SERVICE"
          ? "A service — no size to change."
          : `${thickness(product.thicknessTenthMm)} · ${sheetSize(product.widthMm, product.heightMm)} mm — a size cannot be changed. Withdraw this board and add the right one.`}
      </p>
    </form>
  );
}
