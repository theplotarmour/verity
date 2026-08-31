/**
 * How a stock movement is named, and where it leads.
 *
 * §13 calls the movement ledger critical for warehouse staff and accountants,
 * and §71 asks that every record lead back to the document that explains it.
 * A row reading `purchase_inward` explains nothing; a row reading "Received
 * against purchase order" and linking to that order explains everything.
 */

/** The eight kinds `stock.ts` writes, in the words a warehouse uses. */
export const MOVEMENT_KIND: Record<string, string> = {
  purchase_inward: "Goods received",
  sales_outward: "Goods issued",
  transfer_in: "Transferred in",
  transfer_out: "Transferred out",
  adjust_in: "Adjustment — increase",
  adjust_out: "Adjustment — decrease",
  damaged_out: "Damaged",
  returned_stock: "Customer return",
};

/**
 * The document a movement came from, or null when it has none.
 *
 * Takes the RESOLVED order, not the raw `sourceId`. A movement's source id is a
 * goods receipt or a goods issue, and those are not orders — building
 * `/purchases/<receiptId>` from one would be a confident link to a 404. The
 * server resolves the hop; this only formats it.
 *
 * An adjustment, a damage record and a manual transfer legitimately have no
 * source document. They return null and the row renders as plain text, which
 * is honest: there is no document, and inventing a link to the product the
 * reader is already looking at would be a link to nowhere.
 */
export function movementHref(
  orderType: "purchase" | "sales" | null | undefined,
  orderId: string | null | undefined,
): string | null {
  if (!orderType || !orderId) return null;
  return orderType === "purchase"
    ? `/purchases/${orderId}`
    : `/sales/${orderId}`;
}
