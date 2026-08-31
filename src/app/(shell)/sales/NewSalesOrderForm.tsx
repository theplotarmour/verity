"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Field,
  Input,
  Panel,
  Select,
} from "@/components/ui/primitives";
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

type Line = { productId: string; qty: string; price: string };

const EMPTY_LINE: Line = { productId: "", qty: "", price: "" };

export function NewSalesOrderForm({
  customers,
  godowns,
  boards,
  sellable,
  pending,
  onSubmit,
  onCancel,
}: {
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
    const price = Number.parseFloat(line.price);
    return (
      sum + (Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0)
    );
  }, 0);

  const complete = lines.filter(
    (line) => line.productId !== "" && Number.parseInt(line.qty, 10) > 0,
  );
  const canSubmit =
    customerId !== "" && locationId !== "" && complete.length > 0;

  return (
    <Panel title="New sales order">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <Field label="Customer" htmlFor="sale-customer" required>
              <Select
                id="sale-customer"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="" disabled>
                  Choose a customer
                </option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="min-w-[190px]">
            <Field
              label="From godown"
              htmlFor="sale-godown"
              required
              hint={
                locationId === ""
                  ? "Choose one to see what is available"
                  : undefined
              }
            >
              <Select
                id="sale-godown"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
              >
                <option value="" disabled>
                  Choose a godown
                </option>
                {godowns.map((godown) => (
                  <option key={godown.id} value={godown.id}>
                    {godown.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="min-w-[170px] flex-1">
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
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line, index) => {
            const stock = inGodown.get(line.productId);
            const wanted = Number.parseInt(line.qty, 10);
            const short =
              stock !== undefined &&
              Number.isFinite(wanted) &&
              wanted > stock.availableUnits;
            const notHere =
              line.productId !== "" && (stock?.availableUnits ?? 0) === 0;

            return (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[260px] flex-1">
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
                    <Select
                      id={`sale-board-${index}`}
                      value={line.productId}
                      onChange={(event) =>
                        setLine(index, { productId: event.target.value })
                      }
                    >
                      <option value="" disabled>
                        Choose a board
                      </option>
                      {boards.map((board) => {
                        const available =
                          inGodown.get(board.id)?.availableUnits ?? 0;
                        return (
                          <option key={board.id} value={board.id}>
                            {board.label}
                            {locationId === ""
                              ? ""
                              : ` — ${available} available`}
                          </option>
                        );
                      })}
                    </Select>
                  </Field>
                </div>
                <div className="w-[120px]">
                  <Field
                    label="Quantity"
                    htmlFor={`sale-qty-${index}`}
                    required
                  >
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
                </div>
                <div className="w-[150px]">
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
                </div>
                {lines.length > 1 && (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((_, at) => at !== index),
                      )
                    }
                  >
                    Remove
                  </Button>
                )}
                {short && (
                  <p className="m-0 w-full text-[12px] text-warning">
                    Only {stock!.availableUnits} available here. The order can
                    still be taken; it cannot be reserved until there is stock.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => setLines((c) => [...c, { ...EMPTY_LINE }])}
          >
            Add another board
          </Button>
          {total > 0 && (
            <span className="tabular text-[13px] text-text-secondary">
              Order total {rupees(Math.round(total * 100))}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={pending || !canSubmit}
            onClick={() =>
              onSubmit({
                customerId,
                locationId,
                ...(reference.trim() ? { reference: reference.trim() } : {}),
                lines: complete.map((line) => ({
                  productId: line.productId,
                  qtyOrdered: Number.parseInt(line.qty, 10),
                  ...(line.price === ""
                    ? {}
                    : {
                        unitPricePaise: Math.round(
                          Number.parseFloat(line.price) * 100,
                        ),
                      }),
                })),
              })
            }
          >
            {pending ? "Creating…" : "Create order"}
          </Button>
          <Button disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <p className="m-0 text-[12px] text-text-tertiary">
          An order that takes the customer past their credit limit is held
          rather than refused, and shows here for someone with authority to
          approve.
        </p>
      </div>
    </Panel>
  );
}
