import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listMenu } from "@/server/capabilities/dinein";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { MenuAdmin } from "./MenuAdmin";

export const dynamic = "force-dynamic";

/**
 * The menu.
 *
 * Retired items are shown here and nowhere else: the ordering surfaces hide
 * them, but a manager needs to see what exists in order to bring something
 * back. There is no delete, anywhere, by design — a bill from last month
 * references what was sold.
 */
export default async function MenuPage() {
  installCapabilities();
  const actor = await requireActor();

  let menu: Awaited<ReturnType<typeof listMenu.handler>>;
  try {
    menu = await executeQuery(actor, listMenu, { includeInactive: true });
  } catch (error) {
    if (error instanceof ForbiddenError)
      return <PermissionDenied what="the menu" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Menu"
        description="What can be ordered, and what it costs. Prices change forward — bills already raised keep the price they were raised at."
      />
      <MenuAdmin menu={menu} />
    </>
  );
}
