import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { PageHeader } from "@/components/ui/primitives";
import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";

/**
 * Task 87 — bringing a real client's pre-Verity records in.
 *
 * Authority: `taskplans/87_import_export_migration_framework.md`.
 * `Import → map → validate → preview → commit → reconcile`, at file scale.
 * Fine-grained authorization lives per-step: previewing customers needs
 * Read on Customer, committing needs Create on whichever entity the row
 * targets — both already enforced by the underlying query/command this
 * page's actions call, so this page itself needs no permission check of
 * its own beyond being signed in.
 */
export default async function ImportPage() {
  installCapabilities();
  await requireActor();

  return (
    <>
      <PageHeader
        title="Import data"
        description="Bring in customers, suppliers or boards from a spreadsheet. Nothing is written until you confirm — every row is checked first, and one bad row never blocks the rest."
      />
      <ImportWizard />
    </>
  );
}
