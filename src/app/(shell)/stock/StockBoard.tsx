"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  Select,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type OnHandRow = {
  productId: string;
  productName: string;
  brandName: string;
  grade: string;
  unitLabel: string;
  locationId: string;
  locationName: string;
  qtyUnits: number;
  avgUnitCostPaise: number;
  valuePaise: number;
};

type ShortRow = {
  productId: string;
  productName: string;
  brandName: string;
  unitLabel: string;
  onHandUnits: number;
  reorderLevelUnits: number;
};

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Whole rupees for a total nobody reads to the paise. */
function rupeesRound(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

type Movement = "receive" | "issue" | "transfer";

/**
 * The stock board.
 *
 * Three questions in the order they get asked: what is it all worth, what has
 * run short, and where is each board sitting. The movement form is one form with
 * a movement selector rather than three panels, because a clerk arrives already
 * knowing which of the three they came to do — and the fields that differ
 * between them are two.
 *
 * Adjustments are deliberately absent from this screen. An adjustment asserts
 * the system is wrong, rides a different permission, and belongs where it is
 * deliberate rather than one row below the ordinary receipts.
 */
export function StockBoard({
  onHand,
  short,
  godowns,
  boards,
}: {
  onHand: OnHandRow[];
  short: ShortRow[];
  godowns: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; label: string; unitLabel: string }>;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [movement, setMovement] = useState<Movement | null>(null);
  const [pending, startTransition] = useTransition();

  const totalValuePaise = useMemo(
    () => onHand.reduce((sum, row) => sum + row.valuePaise, 0),
    [onHand],
  );
  const byGodown = useMemo(() => {
    const grouped = new Map<string, { name: string; rows: OnHandRow[]; valuePaise: number }>();
    for (const row of onHand) {
      const existing = grouped.get(row.locationId) ?? {
        name: row.locationName,
        rows: [],
        valuePaise: 0,
      };
      existing.rows.push(row);
      existing.valuePaise += row.valuePaise;
      grouped.set(row.locationId, existing);
    }
    return [...grouped.entries()];
  }, [onHand]);

  function run(key: string, input: unknown) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/stock");
      if (result.ok) {
        setMovement(null);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const canMove = godowns.length > 0 && boards.length > 0;

  return (
    <>
      {failure && (
        <div className="mb-4">
          <ErrorState
            title="That movement was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}

      <div className="mb-6">
        <StatRow cols={3}>
          <Stat
            label="Stock value"
            value={rupeesRound(totalValuePaise)}
            hint="At weighted average cost"
          />
          <Stat label="Godowns holding stock" value={String(byGodown.length)} />
          <Stat
            label="At or below reorder"
            value={String(short.length)}
            hint={short.length === 0 ? "Nothing to buy" : "Needs a purchase or a transfer"}
          />
        </StatRow>
      </div>

      {canMove && (
        <div className="mb-4 flex justify-end gap-2">
          {(["receive", "issue", "transfer"] as const).map((kind) => (
            <Button
              key={kind}
              variant={movement === kind ? "primary" : "secondary"}
              onClick={() => setMovement(movement === kind ? null : kind)}
            >
              {kind === "receive" ? "Receive" : kind === "issue" ? "Issue" : "Transfer"}
            </Button>
          ))}
        </div>
      )}

      {movement && (
        <div className="mb-6">
          <Panel
            title={
              movement === "receive"
                ? "Receive stock"
                : movement === "issue"
                  ? "Issue stock"
                  : "Transfer between godowns"
            }
          >
            <MovementForm
              movement={movement}
              godowns={godowns}
              boards={boards}
              pending={pending}
              onSubmit={run}
            />
          </Panel>
        </div>
      )}

      {short.length > 0 && (
        <div className="mb-4">
          <Panel title="At or below reorder level">
            <table className="w-full border-collapse">
              <caption className="sr-only">Boards at or below their reorder level</caption>
              <thead>
                <tr>
                  {["Board", "On hand", "Reorder at"].map((heading, index) => (
                    <th
                      key={heading}
                      className={
                        "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                        (index === 0 ? "text-left" : "text-right")
                      }
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {short.map((row) => (
                  <tr key={row.productId}>
                    <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                      {row.brandName} · {row.productName}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[14px] text-warning">
                      {row.onHandUnits} {row.unitLabel}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                      {row.reorderLevelUnits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mb-0 mt-3 text-[12px] text-text-tertiary">
              Counted across every godown. A board short in one and plentiful in another is a
              transfer, not a purchase.
            </p>
          </Panel>
        </div>
      )}

      {byGodown.length === 0 ? (
        <Panel flush>
          <EmptyState
            compact
            title="No stock recorded yet"
            description={
              canMove
                ? "Receive a first lot and this fills in."
                : "Add a godown and a board to the catalogue first."
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {byGodown.map(([locationId, godown]) => (
            <Panel
              key={locationId}
              title={godown.name}
              action={
                <span className="tabular text-[12px] text-text-tertiary">
                  {rupeesRound(godown.valuePaise)}
                </span>
              }
            >
              <table className="w-full border-collapse">
                <caption className="sr-only">Stock in {godown.name}</caption>
                <thead>
                  <tr>
                    {["Board", "Grade", "On hand", "Avg cost", "Value"].map((heading, index) => (
                      <th
                        key={heading}
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
                  {godown.rows.map((row) => (
                    <tr key={`${row.productId}-${row.locationId}`}>
                      <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                        {row.brandName} · {row.productName}
                      </td>
                      <td className="border-b border-line px-3 py-2 text-[13px] text-text-secondary">
                        {row.grade}
                      </td>
                      <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                        {row.qtyUnits} {row.unitLabel}
                      </td>
                      <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                        {rupees(row.avgUnitCostPaise)}
                      </td>
                      <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                        {rupeesRound(row.valuePaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * One form for three movements.
 *
 * A receipt needs a price; an issue does not, because it consumes at the average
 * the godown already carries — offering a cost field there would invite someone
 * to type a number the system is going to ignore. A transfer needs a second
 * godown and no price at all, for the same reason: cost travels with the stock.
 */
function MovementForm({
  movement,
  godowns,
  boards,
  pending,
  onSubmit,
}: {
  movement: Movement;
  godowns: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; label: string; unitLabel: string }>;
  pending: boolean;
  onSubmit: (key: string, input: unknown) => void;
}) {
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      action={(formData) => {
        const productId = String(formData.get("productId") ?? "");
        const qtyUnits = Number(formData.get("qty") ?? 0);
        if (movement === "receive") {
          onSubmit("verity.plywood.receive_stock", {
            productId,
            locationId: String(formData.get("locationId") ?? ""),
            qtyUnits,
            // Rupees in, paise out. The server never sees a decimal amount, so
            // there is nowhere for a rounding error to enter.
            unitCostPaise: Math.round(Number(formData.get("cost") ?? 0) * 100),
          });
        } else if (movement === "issue") {
          onSubmit("verity.plywood.issue_stock", {
            productId,
            locationId: String(formData.get("locationId") ?? ""),
            qtyUnits,
          });
        } else {
          onSubmit("verity.plywood.transfer_stock", {
            productId,
            fromLocationId: String(formData.get("locationId") ?? ""),
            toLocationId: String(formData.get("toLocationId") ?? ""),
            qtyUnits,
          });
        }
      }}
    >
      <div className="min-w-[260px] flex-1">
        <Field label="Board" htmlFor="movement-product" required>
          <Select id="movement-product" name="productId" required defaultValue="">
            <option value="" disabled>
              Choose a board
            </option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="min-w-[180px]">
        <Field
          label={movement === "transfer" ? "From godown" : "Godown"}
          htmlFor="movement-location"
          required
        >
          <Select id="movement-location" name="locationId" required defaultValue="">
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

      {movement === "transfer" && (
        <div className="min-w-[180px]">
          <Field label="To godown" htmlFor="movement-to-location" required>
            <Select id="movement-to-location" name="toLocationId" required defaultValue="">
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
      )}

      <div className="w-[130px]">
        <Field label="Quantity" htmlFor="movement-qty" required>
          <Input id="movement-qty" name="qty" type="number" min="1" step="1" required />
        </Field>
      </div>

      {movement === "receive" && (
        <div className="w-[160px]">
          <Field label="Cost per unit (₹)" htmlFor="movement-cost" required>
            <Input id="movement-cost" name="cost" type="number" step="0.01" min="0" required />
          </Field>
        </div>
      )}

      <Button type="submit" variant="primary" disabled={pending}>
        {movement === "receive" ? "Receive" : movement === "issue" ? "Issue" : "Transfer"}
      </Button>

      {movement !== "receive" && (
        <p className="m-0 w-full text-[12px] text-text-tertiary">
          {movement === "issue"
            ? "Costed at the godown's weighted average, recorded on the movement so this sale's margin stays fixed."
            : "Cost travels with the stock. A transfer moves boards between godowns without creating or destroying value."}
        </p>
      )}
    </form>
  );
}
