// Valid manual stock-adjustment reasons. Shared between the server action and
// the client UI (a "use server" module may only export async functions, so
// this constant lives outside it).
export const ADJUSTMENT_TYPES = [
  { value: "EXTRA_CONSUMED", label: "Extra material consumed" },
  { value: "WASTAGE", label: "Material wastage" },
  { value: "DAMAGED", label: "Damaged material" },
  { value: "LOST", label: "Lost inventory" },
  { value: "CORRECTION", label: "Manual correction" },
  { value: "RECONCILIATION", label: "Physical stock reconciliation" },
] as const;
