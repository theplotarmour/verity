"use client";

import Link from "next/link";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormRow,
  Input,
  Panel,
  Select,
} from "@/components/ui/primitives";
import { Modal, ModalCancel } from "@/components/ui/Modal";
import {
  CATEGORY_RULES,
  PRODUCT_CATEGORIES,
  formatProductSize,
  type ProductCategory,
  type SizeUnit,
} from "@/server/capabilities/plywood/product";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type ProductType = "PHYSICAL" | "SERVICE";

type Product = {
  id: string;
  name: string;
  hsnCode: string;
  thicknessTenthMm: number | null;
  category: ProductCategory;
  sizeUnit: SizeUnit;
  widthTenth: number | null;
  heightTenth: number | null;
  grade: string;
  unitLabel: string;
  reorderLevelUnits: number;
  active: boolean;
  type: ProductType;
};

type Brand = {
  brandId: string;
  brandName: string;
  brandActive: boolean;
  products: Product[];
};

/**
 * "18.0 mm" — one decimal, always, so the column reads as a column.
 *
 * The store thinks in tenths of a millimetre because a thickness is exact; the
 * screen thinks in what is painted on the edge of the board. `null` is a
 * service, a laminate or a louvre — things with no sheet thickness at all, not
 * a zero.
 */
function thickness(tenthMm: number | null): string {
  return tenthMm == null ? "—" : `${(tenthMm / 10).toFixed(1)} mm`;
}

/** The unit the user types in, spelt the way the label should read. */
function unitWord(unit: SizeUnit): string {
  return unit === "FT" ? "ft" : unit === "IN" ? "in" : "mm";
}

/**
 * The catalogue.
 *
 * Grouped by brand because that is how the trade is organised and how a stock
 * question arrives: "do we have the Century BWR in 18". Within a brand the scan
 * target is the size, not the name — so thickness and size are set in tabular
 * numerals and given their own columns, which lets the eye run down one column
 * instead of parsing a sentence per row.
 *
 * FOUR FAMILIES, NOT ONE. The business trades boards, plywood, laminates and
 * louvres, and each family is quoted in its own unit — feet for boards, plywood
 * and laminates; inches for louvres. That is why the size column prints its
 * unit and why the creation form changes shape when the family changes: a form
 * that asked for millimetres would be asking a question the yard cannot answer.
 *
 * Both creation forms are dialogs rather than panels that grow inside the page.
 * An inline panel pushed the table it belonged to down the screen and let two
 * forms be open at once with one shared error banner between them.
 */
export function CatalogueAdmin({ catalogue }: { catalogue: Brand[] }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [newBrand, setNewBrand] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [family, setFamily] = useState<ProductCategory | "ALL">("ALL");
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

  // Which families are actually stocked. A filter offering "Louvre" to a
  // catalogue that holds none is a control that can only disappoint.
  const present = useMemo(() => {
    const seen = new Set<ProductCategory>();
    for (const brand of catalogue) {
      for (const product of brand.products) seen.add(product.category);
    }
    return PRODUCT_CATEGORIES.filter((category) => seen.has(category));
  }, [catalogue]);

  const shown = useMemo(() => {
    if (family === "ALL") return catalogue;
    return catalogue
      .map((brand) => ({
        ...brand,
        products: brand.products.filter(
          (product) => product.category === family,
        ),
      }))
      .filter((brand) => brand.products.length > 0);
  }, [catalogue, family]);

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

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {present.length > 1 ? (
          <div
            role="group"
            aria-label="Filter by product family"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-glass-2 p-1"
          >
            {(["ALL", ...present] as const).map((key) => {
              const active = family === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFamily(key)}
                  className={
                    "rounded-lg px-3 py-1.5 text-[13px] transition-colors duration-150 " +
                    "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-accent-subtle)] " +
                    (active
                      ? "bg-accent text-accent-on"
                      : "text-text-secondary hover:bg-accent-subtle hover:text-text")
                  }
                >
                  {key === "ALL" ? "Everything" : CATEGORY_RULES[key].label}
                </button>
              );
            })}
          </div>
        ) : (
          <span />
        )}
        <Button variant="primary" onClick={() => setNewBrand(true)}>
          New brand
        </Button>
      </div>

      <Modal
        open={newBrand}
        onClose={() => {
          setBrandName("");
          setNewBrand(false);
        }}
        title="New brand"
        description="The manufacturer whose products you trade. Everything you stock is filed under one."
        width="sm"
        footer={
          <>
            <ModalCancel
              onClose={() => {
                setBrandName("");
                setNewBrand(false);
              }}
              disabled={pending}
            />
            <Button
              variant="primary"
              disabled={pending || brandName.trim() === ""}
              onClick={() =>
                run(
                  "verity.plywood.create_brand",
                  { name: brandName.trim() },
                  () => {
                    setBrandName("");
                    setNewBrand(false);
                  },
                )
              }
            >
              {pending ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        <Field label="Brand name" htmlFor="brand-name" required>
          <Input
            id="brand-name"
            value={brandName}
            onChange={(event) => setBrandName(event.target.value)}
            autoFocus
            placeholder="Century Ply"
          />
        </Field>
      </Modal>

      <ProductModal
        open={addingTo !== null}
        pending={pending}
        onClose={() => setAddingTo(null)}
        onSubmit={(input) =>
          run(
            "verity.plywood.create_product",
            { brandId: addingTo, ...input },
            () => setAddingTo(null),
          )
        }
      />

      <EditProductModal
        product={editing}
        pending={pending}
        onClose={() => setEditing(null)}
        onSubmit={(input) =>
          run("verity.plywood.edit_product", input, () => setEditing(null))
        }
      />

      {catalogue.length === 0 ? (
        <Panel flush>
          <EmptyState
            compact
            title="No brands yet"
            description="Add a brand, then add the boards, plywood, laminates and louvres you trade under it."
          />
        </Panel>
      ) : shown.length === 0 ? (
        <Panel flush>
          <EmptyState
            compact
            title={`Nothing filed under ${CATEGORY_RULES[family as ProductCategory].label}`}
            description="Choose another family, or add one under a brand below."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((brand) => (
            <Panel
              key={brand.brandId}
              title={brand.brandName}
              action={
                <div className="flex items-center gap-2">
                  {!brand.brandActive && (
                    <span className="text-[12px] text-text-tertiary">
                      No longer traded
                    </span>
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
                    {brand.brandActive ? "Withdraw brand" : "Trade again"}
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!brand.brandActive}
                    onClick={() => setAddingTo(brand.brandId)}
                  >
                    Add product
                  </Button>
                </div>
              }
            >
              {brand.products.length === 0 ? (
                <p className="m-0 text-[13px] text-text-secondary">
                  Nothing under this brand yet.
                </p>
              ) : (
                <div className="-mx-3 overflow-x-auto px-3">
                  <table className="w-full min-w-[760px] border-collapse">
                    <caption className="sr-only">
                      {brand.brandName} products
                    </caption>
                    <thead>
                      <tr>
                        {[
                          "Product",
                          "Family",
                          "Grade",
                          "Thickness",
                          "Size",
                          "HSN",
                          "Reorder",
                          "State",
                          "",
                        ].map((heading, index) => (
                          <th
                            key={heading || index}
                            className={
                              "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                              (index <= 1 ? "text-left" : "text-right")
                            }
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {brand.products.map((product) => (
                        <tr key={product.id}>
                          <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                            {/* §10 — the product page connects everything about
                              this item: stock by godown, both sides of its
                              pricing, open orders, and every movement. */}
                            <Link
                              href={`/catalogue/${product.id}`}
                              className="text-text no-underline hover:underline"
                            >
                              {product.name}
                            </Link>
                          </td>
                          <td className="border-b border-line px-3 py-2 text-[13px]">
                            {product.type === "SERVICE" ? (
                              <span className="text-text-secondary">
                                Service
                              </span>
                            ) : (
                              <Badge>
                                {CATEGORY_RULES[product.category].label}
                              </Badge>
                            )}
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
                            {formatProductSize(product)}
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
                            <span
                              className={
                                product.active
                                  ? "text-success"
                                  : "text-text-tertiary"
                              }
                            >
                              {product.active ? "Trading" : "Withdrawn"}
                            </span>
                          </td>
                          <td className="border-b border-line px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={pending}
                                onClick={() => setEditing(product)}
                              >
                                Edit
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
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Adding a product.
 *
 * The family is the first field because it decides every field under it. A
 * board and a plywood sheet are quoted in feet and need a millimetre thickness;
 * a laminate comes in one size and the form states it rather than asking; a
 * louvre is quoted in inches. Asking for "Width (mm)" in every case was the
 * form pretending all four families were one.
 *
 * The unit is not a field. It follows from the family on the server too, so the
 * screen cannot disagree with what is stored.
 */
function ProductModal({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  const [category, setCategory] = useState<ProductCategory>("PLYWOOD");
  const [type, setType] = useState<ProductType>("PHYSICAL");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [hsn, setHsn] = useState("");
  const [unitLabel, setUnitLabel] = useState("sheets");
  const [thick, setThick] = useState("");
  const [width, setWidth] = useState("8");
  const [height, setHeight] = useState("4");
  const [reorder, setReorder] = useState("0");

  const rules = CATEGORY_RULES[category];
  const unit = unitWord(rules.sizeUnit);
  const physical = type === "PHYSICAL";
  const fixedSize = rules.fixedSizeTenth != null;
  const wantsSize = physical && !fixedSize;
  const thicknessRequired = physical && rules.thickness === "required";

  function reset() {
    setCategory("PLYWOOD");
    setType("PHYSICAL");
    setName("");
    setGrade("");
    setHsn("");
    setUnitLabel("sheets");
    setThick("");
    setWidth("8");
    setHeight("4");
    setReorder("0");
  }

  function close() {
    reset();
    onClose();
  }

  // Switching family re-states the sizes that family actually uses, so a
  // louvre does not inherit "8 × 4" from the plywood the user looked at first.
  function chooseCategory(next: ProductCategory) {
    const nextRules = CATEGORY_RULES[next];
    if (nextRules.sizeUnit !== rules.sizeUnit) {
      setWidth(nextRules.sizeUnit === "FT" ? "8" : "");
      setHeight(nextRules.sizeUnit === "FT" ? "4" : "");
    }
    setUnitLabel(next === "LOUVRE" ? "pcs" : "sheets");
    setCategory(next);
  }

  const incomplete =
    name.trim() === "" ||
    grade.trim() === "" ||
    hsn.trim() === "" ||
    (thicknessRequired && thick.trim() === "") ||
    (wantsSize && (width.trim() === "") !== (height.trim() === ""));

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add product"
      description="The family decides the unit its size is read in — feet for boards, plywood and laminates, inches for louvres."
      width="lg"
      footer={
        <>
          <ModalCancel onClose={close} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || incomplete}
            onClick={() => {
              onSubmit({
                name: name.trim(),
                hsnCode: hsn.trim(),
                grade: grade.trim(),
                category,
                type,
                unitLabel,
                // Tenths in, tenths stored — the same reason prices are typed
                // in rupees and kept in paise. Omitted rather than sent as
                // zero: the database refuses a zero dimension, and rightly,
                // because a board with no thickness is not a board.
                ...(physical && thick.trim()
                  ? { thicknessTenthMm: Math.round(Number(thick) * 10) }
                  : {}),
                ...(wantsSize && width.trim()
                  ? { widthTenth: Math.round(Number(width) * 10) }
                  : {}),
                ...(wantsSize && height.trim()
                  ? { heightTenth: Math.round(Number(height) * 10) }
                  : {}),
                reorderLevelUnits: Number(reorder) || 0,
              });
              reset();
            }}
          >
            {pending ? "Adding…" : "Add"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FormRow columns="repeat(auto-fit, minmax(180px, 1fr))">
          <Field label="Family" htmlFor="product-category" required>
            <Select
              id="product-category"
              value={category}
              onChange={(event) =>
                chooseCategory(event.target.value as ProductCategory)
              }
            >
              {PRODUCT_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_RULES[key].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kind" htmlFor="product-type">
            <Select
              id="product-type"
              value={type}
              onChange={(event) => setType(event.target.value as ProductType)}
            >
              <option value="PHYSICAL">Physical — held in a godown</option>
              <option value="SERVICE">Service — never stocked</option>
            </Select>
          </Field>
          <Field label="Sold in" htmlFor="product-unit">
            <Select
              id="product-unit"
              value={unitLabel}
              onChange={(event) => setUnitLabel(event.target.value)}
            >
              <option value="sheets">Sheets</option>
              <option value="pcs">Pieces</option>
              <option value="pairs">Pairs</option>
              <option value="CFT">CFT</option>
              <option value="RFT">RFT</option>
            </Select>
          </Field>
        </FormRow>

        <FormRow columns="minmax(0,1.6fr) minmax(0,0.8fr) minmax(0,1fr)">
          <Field label="Name" htmlFor="product-name" required>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              placeholder={
                category === "LOUVRE" ? "WPC Fluted Louvre" : "Sainik 710"
              }
            />
          </Field>
          <Field label="Grade" htmlFor="product-grade" required>
            <Input
              id="product-grade"
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder={category === "LOUVRE" ? "WPC" : "BWR"}
            />
          </Field>
          <Field
            label="HSN code"
            htmlFor="product-hsn"
            required
            hint="4, 6 or 8 digits"
          >
            <Input
              id="product-hsn"
              value={hsn}
              onChange={(event) => setHsn(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]{4}([0-9]{2}([0-9]{2})?)?"
              placeholder="44121000"
            />
          </Field>
        </FormRow>

        {/* A fixed four-column band rather than auto-fit: the measurement
            fields differ per family — a laminate has no width or height — and
            auto-fit would stretch the two that remain to twice their width,
            so the form visibly reflowed every time the family changed. */}
        {physical && (
          <FormRow columns="repeat(4, minmax(0, 1fr))">
            {rules.thickness !== "none" && (
              <Field
                label="Thickness (mm)"
                htmlFor="product-thickness"
                required={thicknessRequired}
                hint={
                  thicknessRequired
                    ? "What is printed on the edge"
                    : "Leave blank if it has none"
                }
              >
                <Input
                  id="product-thickness"
                  value={thick}
                  onChange={(event) => setThick(event.target.value)}
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="18"
                />
              </Field>
            )}
            {wantsSize && (
              <>
                <Field label={`Width (${unit})`} htmlFor="product-width">
                  <Input
                    id="product-width"
                    value={width}
                    onChange={(event) => setWidth(event.target.value)}
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder={rules.sizeUnit === "IN" ? "96" : "8"}
                  />
                </Field>
                <Field label={`Height (${unit})`} htmlFor="product-height">
                  <Input
                    id="product-height"
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder={rules.sizeUnit === "IN" ? "6" : "4"}
                  />
                </Field>
              </>
            )}
            <Field
              label="Reorder below"
              htmlFor="product-reorder"
              hint={unitLabel}
            >
              <Input
                id="product-reorder"
                value={reorder}
                onChange={(event) => setReorder(event.target.value)}
                type="number"
                min="0"
              />
            </Field>
          </FormRow>
        )}

        {physical && fixedSize && (
          <p className="m-0 rounded-lg border border-line bg-glass-2 px-3 py-2 text-[13px] text-text-secondary">
            Laminates are 8 × 4 ft. That size is set for you, so it cannot be
            entered wrongly.
          </p>
        )}
        {!physical && (
          <p className="m-0 rounded-lg border border-line bg-glass-2 px-3 py-2 text-[13px] text-text-secondary">
            A service is never received into a godown, so it has no size and no
            reorder level.
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * Correcting a product's description.
 *
 * Name, grade, HSN, reorder level, kind and family. The SIZE is absent because
 * an 18 mm board and a 12 mm board are different products, not one product with
 * a corrected field — editing it in place would silently restate every past
 * movement and invoice line that referenced it. The family is editable for the
 * same reason the kind is: a data-entry slip should not be permanent. The
 * command refuses it once stock has moved, or when it would re-label a size
 * from feet into inches without anyone typing a digit.
 */
function EditProductModal({
  product,
  pending,
  onClose,
  onSubmit,
}: {
  product: Product | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [hsn, setHsn] = useState("");
  const [reorder, setReorder] = useState("0");
  const [type, setType] = useState<ProductType>("PHYSICAL");
  const [category, setCategory] = useState<ProductCategory>("OTHER");
  // Which record the fields hold. Seeding on open rather than in an effect
  // keeps a half-typed correction from being overwritten by a re-render.
  const [loaded, setLoaded] = useState<string | null>(null);

  if (product && loaded !== product.id) {
    setLoaded(product.id);
    setName(product.name);
    setGrade(product.grade);
    setHsn(product.hsnCode);
    setReorder(String(product.reorderLevelUnits));
    setType(product.type);
    setCategory(product.category);
  }

  function close() {
    setLoaded(null);
    onClose();
  }

  return (
    <Modal
      open={product !== null}
      onClose={close}
      title={product ? `Edit ${product.name}` : "Edit product"}
      description="A size cannot be corrected here — withdraw the item and add it again at the right size."
      footer={
        <>
          <ModalCancel onClose={close} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || !product || name.trim() === ""}
            onClick={() => {
              if (!product) return;
              onSubmit({
                productId: product.id,
                name: name.trim(),
                grade: grade.trim(),
                hsnCode: hsn.trim(),
                reorderLevelUnits: Number(reorder) || 0,
                type,
                category,
              });
              setLoaded(null);
            }}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      {product && (
        <div className="flex flex-col gap-5">
          <FormRow columns="minmax(0,1.6fr) minmax(0,0.8fr) minmax(0,1fr)">
            <Field label="Name" htmlFor="edit-name" required>
              <Input
                id="edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Grade" htmlFor="edit-grade" required>
              <Input
                id="edit-grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
              />
            </Field>
            <Field
              label="HSN code"
              htmlFor="edit-hsn"
              required
              hint="4, 6 or 8 digits"
            >
              <Input
                id="edit-hsn"
                value={hsn}
                onChange={(event) => setHsn(event.target.value)}
                inputMode="numeric"
                pattern="[0-9]{4}([0-9]{2}([0-9]{2})?)?"
              />
            </Field>
          </FormRow>

          <FormRow columns="repeat(auto-fit, minmax(180px, 1fr))">
            <Field
              label="Family"
              htmlFor="edit-category"
              hint="Only while nothing has moved"
            >
              <Select
                id="edit-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ProductCategory)
                }
              >
                {PRODUCT_CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_RULES[key].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Kind"
              htmlFor="edit-type"
              hint="Only while nothing has moved"
            >
              <Select
                id="edit-type"
                value={type}
                onChange={(event) => setType(event.target.value as ProductType)}
              >
                <option value="PHYSICAL">Physical</option>
                <option value="SERVICE">Service</option>
              </Select>
            </Field>
            <Field
              label="Reorder below"
              htmlFor="edit-reorder"
              hint={product.unitLabel}
            >
              <Input
                id="edit-reorder"
                value={reorder}
                onChange={(event) => setReorder(event.target.value)}
                type="number"
                min="0"
              />
            </Field>
          </FormRow>

          <p className="m-0 rounded-lg border border-line bg-glass-2 px-3 py-2 text-[13px] text-text-secondary">
            {product.type === "SERVICE"
              ? "A service — no size to change."
              : `${thickness(product.thicknessTenthMm)} · ${formatProductSize(product)} — fixed at creation.`}
          </p>
        </div>
      )}
    </Modal>
  );
}
