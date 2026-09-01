"use client";

import { useMemo, useState } from "react";
import { Button, Field, FormRow, Input } from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";
import { Modal, ModalCancel } from "@/components/ui/Modal";
import { rupees, sheets } from "@/components/ui/business/format";

/**
 * Taking an order.
 *
 * Rewritten against four findings from the hands-on audit, which turned out to
 * be one form's worth of problems:
 *
 * - **U0-1.** The old form asked for a godown and a board and said nothing
 *   about either. An order for a board that godown did not stock was created,
 *   APPROVED, and failed only at reservation — after the customer had been told
 *   yes. Availability now sits on the option itself, and a board with none in
 *   the chosen godown says where it is instead.
 * - **U1-3.** The old form was uncontrolled, so a refusal re-rendered it empty
 *   and five fields had to be retyped. State lives here now and survives a
 *   refusal, which is the whole point: the user fixes one field, not all of them.
 * - **U1-7.** One board per order. A real order is "40 of this and 20 of that",
 *   and the command has always accepted `lines[]` — only the form was singular.
 * - **U1-8.** "Blank uses their price" never showed what that price was.
 *
 * Task 71 moves it into a modal (item 6), swaps every native select for a
 * combobox you can type into (item 1), aligns the fields on a subgrid (item 2),
 * and adds the discount column (item 9).
 */

export type SellableRow = {
  productId: string;
  productName: string;
  brandName: string;
  locationId: string;
  locationName: string;
  availableUnits: number;
  agreedPricePaise: number | null;
};

type Line = { productId: string; qty: string; price: string; discount: string };

const EMPTY_LINE: Line = { productId: "", qty: "", price: "", discount: "" };

/** Net of discount, in rupees. The figure the order is actually placed at. */
function netPrice(line: Line): number {
  const price = Number.parseFloat(line.price);
  if (!Number.isFinite(price)) return 0;
  const discount = Number.parseFloat(line.discount);
  if (!Number.isFinite(discount) || discount <= 0) return price;
  return (price * (100 - discount)) / 100;
}

export function NewSalesOrderForm({
  open,
  customers,
  godowns,
  boards,
  sellable,
  pending,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  customers: Array<{ id: string; displayName: string }>;
  godowns: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; label: string }>;
  sellable: SellableRow[];
  pending: boolean;
  onSubmit: (input: unknown) => void;
  onCancel: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  /** Availability and agreed price for the chosen godown, by product. */
  const inGodown = useMemo(() => {
    const map = new Map<string, SellableRow>();
    for (const row of sellable) {
      if (row.locationId === locationId) map.set(row.productId, row);
    }
    return map;
  }, [sellable, locationId]);

  /** Where a board is, when it is not here. The fact that changes what you do. */
  const elsewhere = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of sellable) {
      if (row.locationId === locationId || row.availableUnits <= 0) continue;
      const existing = map.get(row.productId);
      const phrase = `${row.locationName} has ${row.availableUnits}`;
      map.set(row.productId, existing ? `${existing}; ${phrase}` : phrase);
    }
    return map;
  }, [sellable, locationId]);

  /** The agreed price for this customer, in rupees, for the price field. */
  const agreedPrice = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of sellable) {
      if (row.agreedPricePaise !== null)
        map.set(row.productId, row.agreedPricePaise / 100);
    }
    return map;
  }, [sellable]);

  function setLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, at) => {
        if (at !== index) return line;
        const next = { ...line, ...patch };
        // Choosing a board fills in what this customer has agreed to pay, so
        // the figure is visible before the order is taken rather than after it
        // is refused. Typed prices are never overwritten.
        if (patch.productId && line.price === "") {
          const agreed = agreedPrice.get(patch.productId);
          if (agreed !== undefined) next.price = String(agreed);
        }
        return next;
      }),
    );
  }

  const total = lines.reduce((sum, line) => {
    const qty = Number.parseFloat(line.qty);
    return sum + (Number.isFinite(qty) ? qty * netPrice(line) : 0);
  }, 0);

  const complete = lines.filter(
    (line) => line.productId !== "" && Number.parseInt(line.qty, 10) > 0,
  );
  const canSubmit =
    customerId !== "" && locationId !== "" && complete.length > 0;

  const boardOptions = boards.map((board) => ({
    value: board.id,
    label: board.label,
    note:
      locationId === ""
        ? undefined
        : `${inGodown.get(board.id)?.availableUnits ?? 0} available here`,
  }));

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="New sales order"
      description="An order past the customer's credit limit is held for approval, not refused."
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
                customerId,
                locationId,
                ...(reference.trim() ? { reference: reference.trim() } : {}),
                lines: complete.map((line) => {
                  const discount = Number.parseFloat(line.discount);
                  return {
                    productId: line.productId,
                    qtyOrdered: Number.parseInt(line.qty, 10),
                    ...(line.price === ""
                      ? {}
                      : {
                          unitPricePaise: Math.round(
                            Number.parseFloat(line.price) * 100,
                          ),
                        }),
                    // Sent as basis points, which is how the line stores it: a
                    // percentage with two decimals and no floating point.
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
          <Field label="Customer" htmlFor="sale-customer" required>
            <Combobox
              id="sale-customer"
              value={customerId}
              onChange={setCustomerId}
              required
              placeholder="Search customers"
              options={customers.map((customer) => ({
                value: customer.id,
                label: customer.displayName,
              }))}
            />
          </Field>
          <Field
            label="From godown"
            htmlFor="sale-godown"
            required
            hint={
              locationId === "" ? "Choose one to see what is available" : undefined
            }
          >
            <Combobox
              id="sale-godown"
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
            htmlFor="sale-reference"
            hint="Blank gets a number"
          >
            <Input
              id="sale-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
        </FormRow>

        <div className="flex flex-col gap-4 border-t border-line pt-4">
          {lines.map((line, index) => {
            const stock = inGodown.get(line.productId);
            const wanted = Number.parseInt(line.qty, 10);
            const short =
              stock !== undefined &&
              Number.isFinite(wanted) &&
              wanted > stock.availableUnits;
            const notHere =
              line.productId !== "" && (stock?.availableUnits ?? 0) === 0;
            const discount = Number.parseFloat(line.discount);
            const discounted =
              Number.isFinite(discount) && discount > 0 && line.price !== "";

            return (
              <div key={index} className="flex flex-col gap-2">
                <FormRow columns="minmax(0,1.6fr) 110px 140px 120px auto">
                  <Field
                    label={index === 0 ? "Board" : `Board ${index + 1}`}
                    htmlFor={`sale-board-${index}`}
                    required
                    hint={
                      locationId === ""
                        ? undefined
                        : notHere
                          ? (elsewhere.get(line.productId) ??
                            "None in any godown you can see")
                          : stock
                            ? `${sheets(stock.availableUnits)} available here`
                            : undefined
                    }
                  >
                    <Combobox
                      id={`sale-board-${index}`}
                      value={line.productId}
                      onChange={(value) => setLine(index, { productId: value })}
                      required
                      placeholder="Search boards"
                      options={boardOptions}
                    />
                  </Field>
                  <Field label="Quantity" htmlFor={`sale-qty-${index}`} required>
                    <Input
                      id={`sale-qty-${index}`}
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(event) =>
                        setLine(index, { qty: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Price per sheet"
                    htmlFor={`sale-price-${index}`}
                    hint={
                      line.productId === ""
                        ? undefined
                        : agreedPrice.has(line.productId)
                          ? "Their agreed price"
                          : "No agreed price — enter one"
                    }
                  >
                    <Input
                      id={`sale-price-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.price}
                      onChange={(event) =>
                        setLine(index, { price: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Discount %"
                    htmlFor={`sale-discount-${index}`}
                    hint={
                      discounted
                        ? `Nets ${rupees(Math.round(netPrice(line) * 100))}`
                        : undefined
                    }
                  >
                    <Input
                      id={`sale-discount-${index}`}
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
                  {/* `verity-field` so the row's subgrid places this on the
                      CONTROL row rather than the label row — an empty span
                      holds the label track open. A bare button here would sit
                      a line above every input beside it. */}
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
                {short && (
                  <p className="m-0 text-[12px] text-warning">
                    Only {stock!.availableUnits} available here. The order can
                    still be taken; it cannot be reserved until there is stock.
                  </p>
                )}
              </div>
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
