// Stock a factory physically holds is not all issuable. Material awaiting
// incoming QC, or that failed it, stays on the shelf but must be quarantined
// out of the available balance rather than merely flagged — otherwise it gets
// issued to production by accident.
export const STOCK_STATUSES = [
  { value: "AVAILABLE", label: "Available", field: "stockAvailable" },
  { value: "QC_HOLD", label: "QC Hold", field: "stockQcHold" },
  { value: "REJECTED", label: "Rejected", field: "stockRejected" },
] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number]["value"];

export const STOCK_STATUS_FIELD: Record<StockStatus, "stockAvailable" | "stockQcHold" | "stockRejected"> = {
  AVAILABLE: "stockAvailable",
  QC_HOLD: "stockQcHold",
  REJECTED: "stockRejected",
};

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  AVAILABLE: "Available",
  QC_HOLD: "QC Hold",
  REJECTED: "Rejected",
};
