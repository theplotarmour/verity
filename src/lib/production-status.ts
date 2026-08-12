// The factory's real operational pipeline. These stages mirror the physical
// movement of a production bag through the building, which is why staff
// recognise them: the digital status is the same word they already use on the
// floor.
//
// Derived, never stored: the status is computed from the job-card chain, the QC
// inspection and the dispatch record, so it can never drift out of sync with
// what the floor actually did.

export const PRODUCTION_STATUSES = [
  "DRAFT",
  "PLANNED",
  "MATERIAL_READY",
  "CAD_READY",
  "READY_FOR_CUTTING",
  "CUTTING_IN_PROGRESS",
  "READY_FOR_STITCHING",
  "STITCHING_IN_PROGRESS",
  "READY_FOR_QC",
  "QC_IN_PROGRESS",
  "QC_APPROVED",
  "PACKING_IN_PROGRESS",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  DRAFT: "Draft",
  PLANNED: "Planned",
  MATERIAL_READY: "Material Ready",
  CAD_READY: "CAD Ready",
  READY_FOR_CUTTING: "Ready for Cutting",
  CUTTING_IN_PROGRESS: "Cutting In Progress",
  READY_FOR_STITCHING: "Ready for Stitching",
  STITCHING_IN_PROGRESS: "Stitching In Progress",
  READY_FOR_QC: "Ready for QC",
  QC_IN_PROGRESS: "QC In Progress",
  QC_APPROVED: "QC Approved",
  PACKING_IN_PROGRESS: "Packing In Progress",
  READY_FOR_DISPATCH: "Ready for Dispatch",
  DISPATCHED: "Dispatched",
};

export function productionStatusIndex(status: string): number {
  const i = PRODUCTION_STATUSES.indexOf(status as ProductionStatus);
  return i === -1 ? 0 : i;
}

/**
 * The one terminal job-card status.
 *
 * Everything else — WAITING, BLOCKED, ON_HOLD, IN_PROGRESS, QC_PENDING,
 * AWAITING_APPROVAL, REWORK_REQUIRED — is a card still on the floor, queued at or
 * being worked on at its stage. `deriveProductionStatus` already draws the line
 * here ("the first card that is not finished is where the bag physically is"), so
 * the funnel counts against the same definition rather than inventing a second
 * list of statuses that would drift from it.
 */
export const JOB_CARD_DONE = "COMPLETED";

export function isJobCardOnFloor(status: string): boolean {
  return status !== JOB_CARD_DONE;
}

// Department names are free text in master data, so match on the recognisable
// keyword rather than an exact string.
export type DepartmentKind = "CAD" | "CUTTING" | "STITCHING" | "QC" | "PACKING" | "OTHER";

export function departmentKind(name: string | null | undefined): DepartmentKind {
  const n = (name || "").toLowerCase();
  if (n.includes("cad") || n.includes("design")) return "CAD";
  if (n.includes("cut")) return "CUTTING";
  if (n.includes("stitch") || n.includes("sew")) return "STITCHING";
  if (n.includes("qc") || n.includes("quality") || n.includes("inspect")) return "QC";
  if (n.includes("pack")) return "PACKING";
  return "OTHER";
}

// The pipeline status a department implies once its card is waiting vs running.
const KIND_STATUS: Record<DepartmentKind, { waiting: ProductionStatus; running: ProductionStatus }> = {
  CAD: { waiting: "PLANNED", running: "PLANNED" },
  CUTTING: { waiting: "READY_FOR_CUTTING", running: "CUTTING_IN_PROGRESS" },
  STITCHING: { waiting: "READY_FOR_STITCHING", running: "STITCHING_IN_PROGRESS" },
  QC: { waiting: "READY_FOR_QC", running: "QC_IN_PROGRESS" },
  PACKING: { waiting: "QC_APPROVED", running: "PACKING_IN_PROGRESS" },
  OTHER: { waiting: "READY_FOR_STITCHING", running: "STITCHING_IN_PROGRESS" },
};

export type StatusJobCard = {
  sequence: number;
  status: string;
  departmentName?: string | null;
  stageName?: string | null;
};

export type StatusInput = {
  orderStatus?: string | null;
  jobCards: StatusJobCard[];
  materialIssued?: boolean;
  cadReady?: boolean;
  dispatched?: boolean;
};

// Walk the card chain and report where the physical bag currently sits.
export function deriveProductionStatus(input: StatusInput): ProductionStatus {
  // DELIVERED is dispatched-and-then-some: confirmDelivery moves the sales order
  // past DISPATCHED, and without this the pipeline fell through to the
  // all-cards-complete branch and showed a delivered bag as "Ready for Dispatch".
  if (input.dispatched || input.orderStatus === "DISPATCHED" || input.orderStatus === "DELIVERED") {
    return "DISPATCHED";
  }
  if (input.orderStatus === "DRAFT") return "DRAFT";

  const cards = [...(input.jobCards || [])].sort((a, b) => a.sequence - b.sequence);
  if (cards.length === 0) {
    if (input.cadReady) return "CAD_READY";
    if (input.materialIssued) return "MATERIAL_READY";
    return "PLANNED";
  }

  // Everything finished: the bag is packed and sealed, awaiting the truck.
  const allDone = cards.every((c) => c.status === "COMPLETED");
  if (allDone) return "READY_FOR_DISPATCH";

  // The first card that is not finished is where the bag physically is.
  const current = cards.find((c) => c.status !== "COMPLETED")!;
  const kind = departmentKind(current.departmentName || current.stageName);
  const map = KIND_STATUS[kind];

  if (current.status === "QC_PENDING") return "READY_FOR_QC";
  if (current.status === "IN_PROGRESS") return map.running;
  if (current.status === "AWAITING_APPROVAL") return map.running;
  if (current.status === "REWORK_REQUIRED") return map.running;
  // WAITING / ON_HOLD / BLOCKED — queued in front of this department.
  return map.waiting;
}

// Dispatch is only allowed once cutting, stitching, QC approval, packing and
// sealing have all actually happened.
export function isDispatchReady(input: StatusInput): boolean {
  return deriveProductionStatus(input) === "READY_FOR_DISPATCH";
}
