import { ErrorState } from "@/components/ui/primitives";
import { runClientQuery } from "@/server/actions/hq";
import { SettingsAdmin } from "./SettingsAdmin";

export const dynamic = "force-dynamic";

export type ConfigRow = { key: string; value: unknown; scope: string };

export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const configuration = await runClientQuery<ConfigRow[]>(
    tenantId,
    "verity.platform.list_configuration",
    {},
  );

  if (!configuration.ok) {
    return (
      <ErrorState
        title="Could not load this client's configuration"
        message={configuration.message}
        retryable={configuration.retryable}
      />
    );
  }

  return <SettingsAdmin tenantId={tenantId} configuration={configuration.data} />;
}
