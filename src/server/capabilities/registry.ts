import "server-only";
import { registerLocationCapability } from "./location";
import { registerAssetCapability } from "./asset";
import { registerEvidenceCapability } from "./evidence";
import { registerSchedulingCapability } from "./scheduling";
import { registerApprovalCapability } from "./approval";
import { registerDineinCapability } from "./dinein";
import { registerPlywoodCapability } from "./plywood";
import { installStorage } from "@/server/storage/supabase";

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
  // The storage binding rides the same bootstrap because every entry point
  // already calls this one, and a second install function would be a second
  // thing to remember. It is NOT a capability: it registers a deployment
  // backend through the platform's extension point, and it is silent when this
  // deployment has none configured.
  installStorage();
  registerLocationCapability();
  registerAssetCapability();
  registerEvidenceCapability();
  registerSchedulingCapability();
  registerApprovalCapability();
  registerDineinCapability();
  registerPlywoodCapability();
}
