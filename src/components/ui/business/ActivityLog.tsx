import { EmptyState, Panel, Row, RowList } from "@/components/ui/primitives";

/**
 * §78 — who did what to this record, when, and what changed.
 *
 * The specification's own example is a credit override showing actor, from,
 * to, and reason. That is a *business* history, so this renders field names and
 * values in ordinary words rather than the platform's own vocabulary: a reader
 * of a purchase order should not have to know that `state` is a column or that
 * `verity.plywood.receive_goods` is a command key.
 *
 * An unmapped field falls through to its raw name rather than being hidden. A
 * change that happened and cannot be described is still a change that happened,
 * and dropping it would make the log quietly incomplete.
 */

/** Field names as a business reads them. */
const FIELD_LABEL: Record<string, string> = {
  state: "Status",
  totalCostPaise: "Order value",
  totalPricePaise: "Order value",
  qtyReceived: "Received quantity",
  qtyShipped: "Issued quantity",
  creditLimitPaise: "Credit limit",
  reference: "Reference",
  reason: "Reason",
  active: "Active",
};

/** Command keys as an action, for the rows that carry one. */
const COMMAND_LABEL: Record<string, string> = {
  "verity.plywood.create_purchase_order": "Order raised",
  "verity.plywood.submit_purchase_order": "Sent to supplier",
  "verity.plywood.receive_goods": "Goods received",
  "verity.plywood.cancel_purchase_order": "Order cancelled",
  "verity.plywood.create_sales_order": "Order taken",
  "verity.plywood.approve_credit": "Credit approved",
  "verity.plywood.reserve_for_order": "Stock reserved",
  "verity.plywood.dispatch_order": "Goods issued",
  "verity.plywood.cancel_sales_order": "Order cancelled",
  "verity.plywood.raise_sales_invoice": "Invoice raised",
  "verity.plywood.raise_purchase_invoice": "Supplier invoice recorded",
  "verity.plywood.record_payment": "Payment recorded",
};

export type ActivityEntry = {
  occurredAt: Date | string;
  action: string;
  before: string | null;
  after: string | null;
  actorUserId: string | null;
  commandKey: string | null;
};

function when(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityLog({
  entries,
  title = "Activity",
}: {
  entries: ActivityEntry[];
  title?: string;
}) {
  return (
    <Panel flush title={title}>
      {entries.length === 0 ? (
        <div className="px-5 py-6">
          <EmptyState compact title="Nothing recorded yet" />
        </div>
      ) : (
        <RowList>
          {entries.map((entry, index) => (
            <Row key={`${entry.occurredAt}-${entry.action}-${index}`}>
              <div className="min-w-0">
                <p className="m-0 text-[14px] text-text">
                  {(entry.commandKey && COMMAND_LABEL[entry.commandKey]) ??
                    FIELD_LABEL[entry.action] ??
                    entry.action}
                </p>
                <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                  {entry.before !== null || entry.after !== null ? (
                    <>
                      {FIELD_LABEL[entry.action] ?? entry.action}
                      {": "}
                      {entry.before ?? "—"} → {entry.after ?? "—"}
                    </>
                  ) : (
                    (FIELD_LABEL[entry.action] ?? entry.action)
                  )}
                </p>
              </div>
              <span className="shrink-0 text-[12px] text-text-tertiary">
                {when(entry.occurredAt)}
              </span>
            </Row>
          ))}
        </RowList>
      )}
    </Panel>
  );
}
