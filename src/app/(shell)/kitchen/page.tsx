import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { kitchenQueue, type KitchenTicket } from "@/server/capabilities/dinein";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { KitchenBoard } from "./KitchenBoard";

export const dynamic = "force-dynamic";

/**
 * The kitchen.
 *
 * Permitted by ADR-014, inside the four boundaries it sets: capability-private,
 * no kitchen vocabulary in the platform, no recipe or inventory logic, and
 * timing that rides the existing SLA substrate rather than a bespoke timer.
 * DEC-001 still excludes a Kitchen Display System from Verity's core, and this
 * screen is not one — nothing here is reusable by another capability, which is
 * exactly what makes it permitted.
 *
 * Everything it needs already existed. It reads one registered query and calls
 * one registered command; there is no kitchen-shaped contract anywhere.
 */
export default async function KitchenPage() {
  installCapabilities();
  const actor = await requireActor();

  let tickets: KitchenTicket[];
  try {
    tickets = await executeQuery(actor, kitchenQueue, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="the kitchen queue" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Kitchen"
        description="What is waiting, what is on, and what is ready to go out. Oldest first."
      />
      <KitchenBoard tickets={tickets} />
    </>
  );
}
