"use client";

import Link from "next/link";

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
type Correction = "adjust" | "damaged" | "returned";

/**
 * The stock board.
 *
 * Three questions in the order they get asked: what is it all worth, what has
 * run short, and where is each board sitting. The movement form is one form with
 * a movement selector rather than three panels, because a clerk arrives already
 * knowing which of the three they came to do — and the fields that differ
 * between them are two.
 *
 * Corrections sit in their own panel below, not among the movement buttons. An
 * adjustment asserts the system is wrong; damage and returns are events rather
 * than trade. All three demand a reason, and all three ride ActionExecute rather
 * than Create so they can be held by the owner without also withholding ordinary
 * receipts and issues.
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
  const [correction, setCorrection] = useState<Correction | null>(null);
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
        setCorrection(null);
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

      {canMove && (
        <div className="mb-4 flex justify-end gap-2">
          {(["adjust", "damaged", "returned"] as const).map((kind) => (
            <Button
              key={kind}
              variant={correction === kind ? "primary" : "secondary"}
              onClick={() => setCorrection(correction === kind ? null : kind)}
            >
              {kind === "adjust"
                ? "Stock count"
                : kind === "damaged"
                  ? "Damaged"
                  : "Returned"}
            </Button>
          ))}
        </div>
      )}

      {correction && (
        <div className="mb-6">
          <Panel
            title={
              correction === "adjust"
                ? "Correct a stock count"
                : correction === "damaged"
                  ? "Write off damaged stock"
                  : "Take returned stock back in"
            }
          >
            <CorrectionForm
              correction={correction}
              godowns={godowns}
              boards={boards}
              pending={pending}
              onSubmit={run}
            />
          </Panel>
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
                      {/* §71 — the name is the way in. Low stock leads to the
                          product, where the reorder decision has its context. */}
                      <Link
                        href={`/catalogue/${row.productId}`}
                        className="text-text no-underline hover:underline"
                      >
                        {row.brandName} · {row.productName}
                      </Link>
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
                <div className="flex items-center gap-4">
                  <span className="tabular text-[12px] text-text-tertiary">
                    {rupeesRound(godown.valuePaise)}
                  </span>
                  <Link
                    href={`/godowns/${locationId}`}
                    className="text-[12px] text-accent-ink no-underline hover:underline"
                  >
                    Open godown →
                  </Link>
                </div>
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
                        {/* §13 — clicking a quantity opens why that quantity
                            exists, scoped to the godown of this row. */}
                        <Link
                          href={`/stock/${row.productId}?godown=${row.locationId}`}
                          className="text-text no-underline hover:underline"
                        >
                          {row.brandName} · {row.productName}
                        </Link>
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

/**
 * Corrections: a stock count, damage, or goods coming back.
 *
 * A reason is required on all three, and the command enforces a minimum length —
 * "x" is not a reason. These are the entries somebody asks about six months
 * later, which is precisely when nobody remembers, so the answer has to be
 * written at the moment it is still obvious.
 *
 * None of them takes a cost. Found stock and returned goods re-enter at what the
 * godown already carries the board at; damage leaves at the same. A cost field
 * here would invite somebody to book a price nobody paid.
 */
function CorrectionForm({
  correction,
  godowns,
  boards,
  pending,
  onSubmit,
}: {
  correction: Correction;
  godowns: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; label: string; unitLabel: string }>;
  pending: boolean;
  onSubmit: (key: string, input: unknown) => void;
}) {
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      action={(formData) => {
        const base = {
          productId: String(formData.get("productId") ?? ""),
          locationId: String(formData.get("locationId") ?? ""),
          qtyUnits: Number(formData.get("qty") ?? 0),
          reason: String(formData.get("reason") ?? ""),
        };
        if (correction === "adjust") {
          onSubmit("verity.plywood.adjust_stock", {
            ...base,
            direction: String(formData.get("direction") ?? "out"),
          });
        } else if (correction === "damaged") {
          onSubmit("verity.plywood.record_damaged_stock", base);
        } else {
          onSubmit("verity.plywood.record_returned_stock", base);
        }
      }}
    >
      <div className="min-w-[240px] flex-1">
        <Field label="Board" htmlFor="correction-product" required>
          <Select id="correction-product" name="productId" required defaultValue="">
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

      <div className="min-w-[170px]">
        <Field label="Godown" htmlFor="correction-location" required>
          <Select id="correction-location" name="locationId" required defaultValue="">
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

      {correction === "adjust" && (
        <div className="w-[150px]">
          <Field label="Direction" htmlFor="correction-direction" required>
            <Select id="correction-direction" name="direction" required defaultValue="out">
              <option value="out">Short — remove</option>
              <option value="in">Found — add</option>
            </Select>
          </Field>
        </div>
      )}

      <div className="w-[120px]">
        <Field label="Quantity" htmlFor="correction-qty" required>
          <Input id="correction-qty" name="qty" type="number" min="1" step="1" required />
        </Field>
      </div>

      <div className="min-w-[280px] flex-1">
        <Field
          label="Reason"
          htmlFor="correction-reason"
          required
          hint="Read by whoever asks about this later"
        >
          <Input
            id="correction-reason"
            name="reason"
            required
            minLength={3}
            placeholder={
              correction === "adjust"
                ? "Physical count on 28 August found three short"
                : correction === "damaged"
                  ? "Water damage in the corner stack"
                  : "Customer returned five sheets, unopened"
            }
          />
        </Field>
      </div>

      <Button type="submit" variant="primary" disabled={pending}>
        Record
      </Button>

      <p className="m-0 w-full text-[12px] text-text-tertiary">
        {correction === "returned"
          ? "Re-enters at what the godown carries the board at, never at what it was sold for — a return is not a purchase."
          : "Costed at the godown's weighted average. The movement is appended to the ledger and can never be edited away."}
      </p>
    </form>
  );
}
