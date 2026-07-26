import "server-only";

// Server actions that throw lose their message in production: Next replaces it
// with the generic "An error occurred in the Server Components render" digest.
// Deletion failures are almost always something the user can fix themselves —
// the record is still in use somewhere — so the reason has to be *returned*,
// phrased in terms of what to do about it.

// Maps the FK constraint name Postgres reports to the thing actually holding
// the reference, so the message can name it.
const REFERENCE_LABELS: Array<{ match: RegExp; blocker: string; fix: string }> = [
  { match: /BOMItem|bom/i, blocker: "a bill of materials", fix: "Remove it from the BOM first." },
  { match: /StockLedgerEntry|BinBalance|MaterialReservation/i, blocker: "stock movements", fix: "Items with stock history can't be deleted — archive it instead." },
  { match: /PurchaseOrder|PurchaseReceipt/i, blocker: "a purchase order", fix: "Cancel or delete those orders first." },
  { match: /SalesOrder|SalesOrderItem/i, blocker: "a production order", fix: "Those productions must be deleted first." },
  { match: /ProductVariant|Blueprint/i, blocker: "a product variant or blueprint", fix: "Delete the variant first." },
  { match: /Product_categoryId|ProductCategory/i, blocker: "products in this category", fix: "Move or delete those products first." },
  { match: /JobCard|WorkOrder|ProductionPlan/i, blocker: "work on the factory floor", fix: "Those job cards must be closed or deleted first." },
  { match: /Design|SpecBOM/i, blocker: "a design", fix: "Detach it from the design first." },
  { match: /Warehouse|Bin|Shelf|Rack|Zone/i, blocker: "a storage location holding stock", fix: "Empty the location first." },
  { match: /User|Team/i, blocker: "a person or team", fix: "Reassign them first." },
];

export function describeDeleteError(error: unknown, entity: string): string {
  const code = (error as any)?.code as string | undefined;
  const meta = (error as any)?.meta ?? {};
  const detail = String(meta.field_name ?? meta.constraint ?? meta.modelName ?? (error as any)?.message ?? "");

  if (code === "P2025") {
    return `That ${entity} no longer exists — it may already have been deleted. Refresh the sheet.`;
  }

  if (code === "P2003" || code === "P2014") {
    const hit = REFERENCE_LABELS.find((r) => r.match.test(detail));
    if (hit) {
      return `This ${entity} is still used by ${hit.blocker}, so it can't be deleted. ${hit.fix}`;
    }
    return `This ${entity} is still referenced by other records, so it can't be deleted. Remove those references first.`;
  }

  // Anything else is genuinely unexpected; surface it rather than swallowing it.
  const message = (error as any)?.message;
  return typeof message === "string" && message.length < 300
    ? `Could not delete this ${entity}: ${message}`
    : `Could not delete this ${entity}. Please try again, or check whether it is still in use.`;
}

export type ActionResult = { success: true } | { error: string };

// Wraps a delete so the caller always gets a result it can show, never a masked
// server exception.
export async function guardDelete(entity: string, run: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await run();
    return { success: true };
  } catch (error) {
    return { error: describeDeleteError(error, entity) };
  }
}
