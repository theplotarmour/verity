import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listFloor, type FloorTable } from "@/server/capabilities/dinein";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { FloorEditor } from "./FloorEditor";

export const dynamic = "force-dynamic";

/**
 * The floor plan editor.
 *
 * Separate from `/floor` on purpose. During service a waiter needs to tap a
 * table and have it seat guests; a manager laying out the room needs to drag the
 * same table somewhere else. Putting both on one screen means one of them
 * happens by accident, and it is always the wrong one at the worst moment.
 */
export default async function FloorSetupPage() {
  installCapabilities();
  const actor = await requireActor();

  let tables: FloorTable[];
  try {
    tables = await executeQuery(actor, listFloor, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="the floor plan" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Floor plan"
        description="Add zones and tables, and drag them into the shape of the room. Positions are what the floor screen draws during service."
      />
      <FloorEditor tables={tables} />
    </>
  );
}
