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
} from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Board = {
  id: string;
  name: string;
  brandName: string;
  thicknessTenthMm: number | null;
};

type Party = { id: string; displayName: string };

type Agreed = { partyId: string; productId: string; pricePaise: number };

function boardLabel(board: Board): string {
  return board.thicknessTenthMm == null
    ? board.name
    : `${board.name} · ${(board.thicknessTenthMm / 10).toFixed(1)} mm`;
}

/** Rupees as a plain editable string. Blank means "no agreed price". */
function toCell(paise: number | undefined): string {
  return paise === undefined ? "" : String(paise / 100);
}

/**
 * A rate card, edited as a sheet.
 *
 * Reported: "there should be an Excel-sheet kind of sheet for agreeing a price
 * with suppliers and customers."
 *
 * The behaviour that makes it feel like a sheet rather than a long form:
 * Enter and the arrow keys move down the column, Save writes everything that
 * changed in one transaction, and only what changed is sent — so re-saving a
 * sheet where one cell moved does not rewrite four hundred rows and fill the
 * activity log with edits nobody made.
 *
 * A blank cell REMOVES the agreed price. It does not store zero: zero is a
 * price — a free supply — and an order taking that as its default would poison
 * the weighted-average cost of every sheet in the godown.
 */
export function PriceSheet({
  side,
  partyId,
  suppliers,
  customers,
  boards,
  agreed,
}: {
  side: "supplier" | "customer";
  partyId: string | null;
  suppliers: Party[];
  customers: Party[];
  boards: Board[];
  agreed: Agreed[];
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();

  const parties = side === "supplier" ? suppliers : customers;

  /** What is stored today, by product, for the chosen party. */
  const stored = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of agreed) {
      if (row.partyId === partyId) map.set(row.productId, row.pricePaise);
    }
    return map;
  }, [agreed, partyId]);

  // Keyed by party so switching parties starts from their own stored figures
  // rather than carrying the last one's edits across.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editsFor, setEditsFor] = useState<string | null>(partyId);
  if (editsFor !== partyId) {
    setEditsFor(partyId);
    setEdits({});
  }

  function cellValue(productId: string): string {
    return edits[productId] ?? toCell(stored.get(productId));
  }

  const changed = boards.filter((board) => {
    const now = cellValue(board.id).trim();
    return now !== toCell(stored.get(board.id)).trim();
  });

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return boards;
    return boards.filter((board) =>
      `${board.brandName} ${boardLabel(board)}`.toLowerCase().includes(needle),
    );
  }, [boards, filter]);

  function save() {
    if (!partyId || changed.length === 0) return;
    setFailure(null);
    setSaved(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.plywood.set_price_sheet",
        {
          side,
          partyId,
          prices: changed.map((board) => {
            const raw = cellValue(board.id).trim();
            const parsed = Number.parseFloat(raw);
            return {
              productId: board.id,
              pricePaise:
                raw === "" || !Number.isFinite(parsed)
                  ? null
                  : Math.round(parsed * 100),
            };
          }),
        },
        `/prices?side=${side}${partyId ? `&party=${partyId}` : ""}`,
      );
      if (result.ok) {
        setEdits({});
        setSaved(
          `${changed.length} ${changed.length === 1 ? "price" : "prices"} saved.`,
        );
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  /** Enter and the arrow keys walk the column, as a sheet does. */
  function onCellKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    const step =
      event.key === "Enter" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    const next = shown[index + step];
    if (!next) return;
    event.preventDefault();
    document.getElementById(`price-${next.id}`)?.focus();
  }

  function choose(nextSide: "supplier" | "customer", nextParty: string) {
    router.push(
      `/prices?side=${nextSide}${nextParty ? `&party=${nextParty}` : ""}`,
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {failure && (
        <ErrorState
          title="That was refused"
          message={failure.message}
          issues={failure.issues}
          retryable={failure.retryable}
        />
      )}

      <Panel title="Whose prices">
        <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
          <Field label="Side" htmlFor="price-side" required>
            <Combobox
              id="price-side"
              value={side}
              required
              onChange={(value) =>
                choose(value as "supplier" | "customer", "")
              }
              options={[
                { value: "supplier", label: "What we pay suppliers" },
                { value: "customer", label: "What we charge customers" },
              ]}
            />
          </Field>
          <Field
            label={side === "supplier" ? "Supplier" : "Customer"}
            htmlFor="price-party"
            required
          >
            <Combobox
              id="price-party"
              value={partyId ?? ""}
              required
              placeholder="Search"
              onChange={(value) => choose(side, value)}
              options={parties.map((row) => ({
                value: row.id,
                label: row.displayName,
              }))}
            />
          </Field>
        </div>
      </Panel>

      {!partyId ? (
        <EmptyState
          title={`Choose a ${side}`}
          description="Their whole rate card appears here, one row per board, and saves in one go."
        />
      ) : boards.length === 0 ? (
        <EmptyState
          title="No boards in the catalogue"
          description="Add boards under Catalogue and their rows appear here."
        />
      ) : (
        <Panel
          flush
          title={`${boards.length} boards · ${stored.size} priced`}
          action={
            <div className="flex items-center gap-2">
              <div className="w-56">
                <Input
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter boards"
                  aria-label="Filter boards"
                />
              </div>
              <Button
                variant="primary"
                disabled={pending || changed.length === 0}
                onClick={save}
              >
                {pending
                  ? "Saving…"
                  : changed.length === 0
                    ? "Nothing changed"
                    : `Save ${changed.length}`}
              </Button>
            </div>
          }
        >
          {saved && (
            <p className="m-0 border-b border-line px-5 py-2 text-[13px] text-success">
              {saved}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <caption className="sr-only">
                Agreed prices, one row per board. A blank price removes it.
              </caption>
              <thead>
                <tr>
                  <th className="border-b border-line px-5 py-2 text-left text-[12px] font-normal text-text-tertiary">
                    Board
                  </th>
                  <th className="w-[180px] border-b border-line px-5 py-2 text-right text-[12px] font-normal text-text-tertiary">
                    {side === "supplier"
                      ? "We pay, per unit (₹)"
                      : "We charge, per unit (₹)"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((board, index) => {
                  const value = cellValue(board.id);
                  const isChanged =
                    value.trim() !== toCell(stored.get(board.id)).trim();
                  return (
                    <tr
                      key={board.id}
                      className={isChanged ? "bg-accent-subtle" : undefined}
                    >
                      <td className="border-b border-line px-5 py-1.5 text-[14px] text-text">
                        {boardLabel(board)}
                        <span className="mt-0.5 block text-[12px] text-text-tertiary">
                          {board.brandName}
                        </span>
                      </td>
                      <td className="border-b border-line px-5 py-1.5 text-right">
                        <Input
                          id={`price-${board.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="h-9 text-right"
                          aria-label={`Price for ${boardLabel(board)}`}
                          value={value}
                          onChange={(event) =>
                            setEdits((current) => ({
                              ...current,
                              [board.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => onCellKeyDown(event, index)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="m-0 border-t border-line px-5 py-2.5 text-[12px] text-text-tertiary">
            Enter or the arrow keys move down the column. Clearing a cell removes
            the agreed price — it does not set it to zero, because zero is a
            price and would be taken as one.
          </p>
        </Panel>
      )}
    </div>
  );
}
