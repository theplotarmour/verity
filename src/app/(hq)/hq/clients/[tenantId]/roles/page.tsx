import { ErrorState } from "@/components/ui/primitives";
import { runClientQuery } from "@/server/actions/hq";
import type { RoleRow } from "@/server/platform/administration";
import { RolesAdmin } from "./RolesAdmin";

export const dynamic = "force-dynamic";

export default async function ClientRolesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const roles = await runClientQuery<RoleRow[]>(tenantId, "verity.platform.list_roles", {});

  if (!roles.ok) {
    return (
      <ErrorState
        title="Could not load this client's roles"
        message={roles.message}
        retryable={roles.retryable}
      />
    );
  }

  return <RolesAdmin tenantId={tenantId} roles={roles.data} />;
}
