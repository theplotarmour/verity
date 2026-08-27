import "server-only";
import { registerLocationCapability } from "./location";
import { registerAssetCapability } from "./asset";
import { registerEvidenceCapability } from "./evidence";
import { registerSchedulingCapability } from "./scheduling";
import { registerApprovalCapability } from "./approval";
import { registerDineinCapability } from "./dinein";

/**
 * Installs every shipped capability into the running process.
 *
 * Registration is idempotent by guard rather than by making registerCommand
 * tolerant of duplicates: a genuine duplicate key is a real defect and should
 * still throw. Next.js may evaluate a module more than once per process, which
 * is not a defect, so the guard lives here.
 */
let installed = false;

export function installCapabilities(): void {
  if (installed) return;
  installed = true;
  registerLocationCapability();
  registerAssetCapability();
  registerEvidenceCapability();
  registerSchedulingCapability();
  registerApprovalCapability();
  registerDineinCapability();
}
