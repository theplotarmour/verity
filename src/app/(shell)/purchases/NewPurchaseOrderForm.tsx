"use client";

import { useMemo, useState } from "react";
import { Button, Field, FormRow, Input } from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";
import { Modal, ModalCancel } from "@/components/ui/Modal";
import { rupees } from "@/components/ui/business/format";

/**
 * Placing an order with a supplier.
 *
 * Task 71 items 5, 6, 8 and 9. The old form was one board, in a panel that
 * pushed the order table down the page, with a cost box labelled "blank uses
 * agreed price" that never said what the agreed price was — so a buyer either
 * retyped a figure they had already negotiated or trusted a box that showed
 * nothing. A real order is several boards; this one is too.
 */

export type AgreedCost = {
  supplierId: string;
  productId: string;
  negotiatedCostPaise: number;
};

type Line = { productId: string; qty: string; cost: string; discount: string };

const EMPTY_LINE: Line = { productId: "", qty: "", cost: "", discount: "" };

/** Net of discount, in rupees. The figure the order is actually placed at. */
function netCost(line: Line): number {
  const cost = Number.parseFloat(line.cost);
  if (!Number.isFinite(cost)) return 0;
  const discount = Number.parseFloat(line.discount);
  if (!Number.isFinite(discount) || discount <= 0) return cost;
  return (cost * (100 - discount)) / 100;
}

export function NewPurchaseOrderForm({
  open,
  suppliers,
  godowns,
  boards,
  agreed,
  pending,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  suppliers: Array<{ id: string; displayName: string; stateCode: string | null }>;
  godowns: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; label: string }>;
  agreed: AgreedCost[];
  pending: boolean;
  onSubmit: (input: unknown) => void;
  onCancel: () => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  /** What this supplier has agreed to, in rupees, by product. */
  const agreedFor = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of agreed) {
      if (row.supplierId === supplierId) {
        map.set(row.productId, row.negotiatedCostPaise / 100);
      }
    }
    return map;
  }, [agreed, supplierId]);

  const supplier = suppliers.find((row) => row.id === supplierId) ?? null;

  function setLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, at) => {
        if (at !== index) return line;
        const next = { ...line, ...patch };
        // Item 8: choosing a board fills in the agreed cost. A cost the buyer
        // has typed is never overwritten — they are correcting the agreement,
        // not being corrected by it.
        if (patch.productId && line.cost === "") {
          const price = agreedFor.get(patch.productId);
          if (price !== undefined) next.cost = String(price);
        }
        return next;
      }),
    );
  }

  // Changing the supplier changes what every line costs. Untouched lines take
  // the new supplier's price; a line the buyer has typed into keeps its figure,
  // because that figure is a decision and this is not.
  function chooseSupplier(next: string) {
    setSupplierId(next);
    const prices = new Map<string, number>();
    for (const row of agreed) {
      if (row.supplierId === next) {
        prices.set(row.productId, row.negotiatedCostPaise / 100);
      }
    }
    setLines((current) =>
      current.map((line) => {
        if (line.productId === "") return line;
        const wasAgreed = agreedFor.get(line.productId);
        const untouched =
          line.cost === "" ||
          (wasAgreed !== undefined && line.cost === String(wasAgreed));
        if (!untouched) return line;
        const price = prices.get(line.productId);
        return { ...line, cost: price === undefined ? "" : String(price) };
      }),
    );
  }

  const total = lines.reduce((sum, line) => {
    const qty = Number.parseFloat(line.qty);
    return sum + (Number.isFinite(qty) ? qty * netCost(line) : 0);
  }, 0);

  const complete = lines.filter(
    (line) =>
      line.productId !== "" &&
      Number.parseInt(line.qty, 10) > 0 &&
      (line.cost !== "" || agreedFor.has(line.productId)),
  );
  const canSubmit =
    supplierId !== "" && locationId !== "" && complete.length > 0;

  const boardOptions = boards.map((board) => ({
    value: board.id,
    label: board.label,
    note:
      supplierId === ""
        ? undefined
        : agreedFor.has(board.id)
          ? `Agreed ${rupees(Math.round(agreedFor.get(board.id)! * 100))}`
          : "No agreed price",
  }));

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="New purchase order"
      description="The supplier's bill and what you owe them are raised for you when the goods arrive."
      width="lg"
      footer={
        <>
          {total > 0 && (
            <span className="tabular mr-auto text-[13px] text-text-secondary">
              Order total {rupees(Math.round(total * 100))}
            </span>
          )}
          <ModalCancel onClose={onCancel} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || !canSubmit}
            onClick={() =>
              onSubmit({
                supplierId,
                locationId,
                ...(reference.trim() ? { reference: reference.trim() } : {}),
                lines: complete.map((line) => {
                  const discount = Number.parseFloat(line.discount);
                  return {
                    productId: line.productId,
                    qtyOrdered: Number.parseInt(line.qty, 10),
                    // Blank means "use the agreed price". Sending zero instead
                    // would book a free delivery and poison the weighted
                    // average cost of every sheet already in the godown.
                    ...(line.cost === ""
                      ? {}
                      : {
                          unitCostPaise: Math.round(
                            Number.parseFloat(line.cost) * 100,
                          ),
                        }),
                    ...(Number.isFinite(discount) && discount > 0
                      ? { discountBps: Math.round(discount * 100) }
                      : {}),
                  };
                }),
              })
            }
          >
            {pending ? "Creating…" : "Create order"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FormRow columns="minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)">
          <Field
            label="Supplier"
            htmlFor="po-supplier"
            required
            hint={
              // A supplier with no state code cannot be taxed, and the bill
              // raised at goods receipt will refuse. Said here, where it can
              // still be fixed, rather than at the warehouse door.
              supplier && !supplier.stateCode
                ? "No GST state code — their bill cannot be taxed until you add one"
                : undefined
            }
          >
            <Combobox
              id="po-supplier"
              value={supplierId}
              onChange={chooseSupplier}
              required
              placeholder="Search suppliers"
              options={suppliers.map((row) => ({
                value: row.id,
                label: row.displayName,
                note: row.stateCode ? undefined : "No state code",
              }))}
            />
          </Field>
          <Field label="Deliver to" htmlFor="po-godown" required>
            <Combobox
              id="po-godown"
              value={locationId}
              onChange={setLocationId}
              required
              placeholder="Search godowns"
              options={godowns.map((godown) => ({
                value: godown.id,
                label: godown.name,
              }))}
            />
          </Field>
          <Field
            label="Reference"
            htmlFor="po-reference"
            hint="Blank gets a number"
          >
            <Input
              id="po-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
        </FormRow>

        <div className="flex flex-col gap-4 border-t border-line pt-4">
          {lines.map((line, index) => {
            const discount = Number.parseFloat(line.discount);
            const discounted =
              Number.isFinite(discount) && discount > 0 && line.cost !== "";

            return (
              <FormRow
                key={index}
                columns="minmax(0,1.6fr) 110px 150px 120px auto"
              >
                <Field
                  label={index === 0 ? "Board" : `Board ${index + 1}`}
                  htmlFor={`po-board-${index}`}
                  required
                >
                  <Combobox
                    id={`po-board-${index}`}
                    value={line.productId}
                    onChange={(value) => setLine(index, { productId: value })}
                    required
                    placeholder="Search boards"
                    options={boardOptions}
                  />
                </Field>
                <Field label="Quantity" htmlFor={`po-qty-${index}`} required>
                  <Input
                    id={`po-qty-${index}`}
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={(event) =>
                      setLine(index, { qty: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Cost per unit"
                  htmlFor={`po-cost-${index}`}
                  hint={
                    line.productId === ""
                      ? undefined
                      : agreedFor.has(line.productId)
                        ? "Your agreed price"
                        : "No agreed price — enter one"
                  }
                >
                  <Input
                    id={`po-cost-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.cost}
                    onChange={(event) =>
                      setLine(index, { cost: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Discount %"
                  htmlFor={`po-discount-${index}`}
                  hint={
                    discounted
                      ? `Nets ${rupees(Math.round(netCost(line) * 100))}`
                      : undefined
                  }
                >
                  <Input
                    id={`po-discount-${index}`}
                    type="number"
                    min={0}
                    max={99.99}
                    step="0.01"
                    value={line.discount}
                    onChange={(event) =>
                      setLine(index, { discount: event.target.value })
                    }
                  />
                </Field>
                {/* `verity-field` so the row's subgrid puts this on the control
                    row; an empty span holds the label track open. */}
                <div className="verity-field">
                  <span aria-hidden="true" />
                  {lines.length > 1 && (
                    <Button
                      disabled={pending}
                      aria-label={`Remove board ${index + 1}`}
                      onClick={() =>
                        setLines((current) =>
                          current.filter((_, at) => at !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </FormRow>
            );
          })}

          <div>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => setLines((c) => [...c, { ...EMPTY_LINE }])}
            >
              Add another board
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
