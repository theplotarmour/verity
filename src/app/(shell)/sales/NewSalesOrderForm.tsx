"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Checkbox,
  Field,
  FormRow,
  Input,
} from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";
import { Modal, ModalCancel } from "@/components/ui/Modal";
import { NewCustomerModal } from "@/components/ui/business/NewCustomerModal";
import { rupees, sheets } from "@/components/ui/business/format";
import { runCommand } from "@/server/actions/platform";

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
  /** Combined GST rate in basis points, or null when no rule covers the HSN. */
  taxRateBp: number | null;
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
  // Requested: an option to remove GST on a specific order. The reason is
  // required, because a zero-tax invoice with no stated ground cannot be told
  // apart later from an under-declared one — the command and the database
  // enforce that too, not just this form.
  const [taxExempt, setTaxExempt] = useState(false);
  const [exemptReason, setExemptReason] = useState("");
  // Requested: add a customer without abandoning a half-written order. The new
  // one is selected on the way back, because the only reason to create a
  // customer here is to sell to them.
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [creating, startCreating] = useTransition();
  const router = useRouter();

  function createCustomer(input: unknown) {
    startCreating(async () => {
      const result = await runCommand(
        "verity.plywood.create_customer",
        input,
        "/sales",
      );
      if (result.ok) {
        setCustomerId((result.data as { id: string }).id);
        setAddingCustomer(false);
        router.refresh();
      }
    });
  }

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

  // Requested: show the order total INCLUDING tax while it is being written.
  //
  // Per line, because a mixed-rate order is possible in principle and averaging
  // would quietly misstate it. `unknownRate` is tracked separately so a board
  // with no tax rule produces "tax unknown" rather than a total that is short
  // by the tax nobody noticed was missing.
  const totals = useMemo(() => {
    let net = 0;
    let tax = 0;
    let unknownRate = false;
    for (const line of lines) {
      const qty = Number.parseFloat(line.qty);
      if (!Number.isFinite(qty)) continue;
      const lineNet = qty * netPrice(line);
      net += lineNet;
      if (taxExempt) continue;
      const rate = inGodown.get(line.productId)?.taxRateBp ?? null;
      if (line.productId !== "" && rate === null) {
        unknownRate = true;
        continue;
      }
      tax += (lineNet * (rate ?? 0)) / 10_000;
    }
    return { net, tax, gross: net + tax, unknownRate };
  }, [lines, inGodown, taxExempt]);
  const total = totals.net;

  const complete = lines.filter(
    (line) => line.productId !== "" && Number.parseInt(line.qty, 10) > 0,
  );
  const canSubmit =
    customerId !== "" &&
    locationId !== "" &&
    complete.length > 0 &&
    (!taxExempt || exemptReason.trim().length >= 3);

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
            <span className="mr-auto text-[13px] text-text-secondary">
              <span className="tabular text-[15px] text-text">
                {rupees(Math.round(totals.gross * 100))}
              </span>{" "}
              {taxExempt ? (
                "total · no GST on this order"
              ) : totals.unknownRate ? (
                <span className="text-warning">
                  plus tax — no GST rule for one of these boards
                </span>
              ) : (
                <>
                  total · {rupees(Math.round(totals.net * 100))} goods +{" "}
                  {rupees(Math.round(totals.tax * 100))} GST
                </>
              )}
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
                ...(taxExempt
                  ? { taxExempt: true, taxExemptReason: exemptReason.trim() }
                  : {}),
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
            label="Customer"
            htmlFor="sale-customer"
            required
            hint={
              customerId === "" ? "Not listed? Add them without leaving." : undefined
            }
          >
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
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
              </div>
              <Button
                disabled={pending || creating}
                onClick={() => setAddingCustomer(true)}
                aria-label="Add a customer"
              >
                +
              </Button>
            </div>
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
                      max={100}
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

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <Checkbox
            checked={taxExempt}
            onChange={(event) => setTaxExempt(event.target.checked)}
            label="No GST on this order"
          />
          {taxExempt && (
            <Field
              label="Why is this supply exempt?"
              htmlFor="sale-exempt-reason"
              required
              hint="Printed on the invoice and listed on the tax page. An exempt sale is more visible, not less."
            >
              <Input
                id="sale-exempt-reason"
                value={exemptReason}
                onChange={(event) => setExemptReason(event.target.value)}
                placeholder="Exempt supply under Notification 2/2017"
                minLength={3}
              />
            </Field>
          )}
        </div>
      </div>

      {/* A dialog opened from inside a dialog. Both are native <dialog>
          elements, so the second joins the top layer above the first and
          Escape closes only the one on top. */}
      <NewCustomerModal
        open={addingCustomer}
        pending={creating}
        onClose={() => setAddingCustomer(false)}
        onSubmit={createCustomer}
      />
    </Modal>
  );
}
