import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { taxSettings } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { TaxSettingsForm } from "./TaxSettingsForm";

export const dynamic = "force-dynamic";

/**
 * §5 — tax settings in the business's own words.
 *
 * Deliberately not a configuration-key screen. The specification names
 * `verity.trading.tax.cgst_rate_bp` as exactly what a client must never be
 * shown, and the reason is not cosmetic: a rate is a business fact with a date
 * on it, and a settings key is a value with none. Storing it as the latter is
 * what makes a mid-year rate change unrepresentable.
 */
export default async function TaxSettingsPage() {
  installCapabilities();
  const actor = await requireActor();

  let settings: Awaited<ReturnType<typeof taxSettings.handler>>;
  try {
    settings = await executeQuery(actor, taxSettings, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="tax settings" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Tax settings"
        description="The registration invoices are issued under, and the rates in force for each HSN. A rate has a date, so changing one does not rewrite what was already billed."
      />
      <TaxSettingsForm settings={settings} />
    </>
  );
}
