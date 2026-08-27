import { ErrorState } from "@/components/ui/primitives";
import { runClientQuery } from "@/server/actions/hq";
import type { ModuleRow } from "@/server/platform/administration";
import { ModulesAdmin } from "./ModulesAdmin";

export const dynamic = "force-dynamic";

export default async function ClientModulesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const modules = await runClientQuery<ModuleRow[]>(tenantId, "verity.platform.list_modules", {});

  if (!modules.ok) {
    return (
      <ErrorState
        title="Could not load this client's modules"
        message={modules.message}
        retryable={modules.retryable}
      />
    );
  }

  return <ModulesAdmin tenantId={tenantId} modules={modules.data} />;
}
