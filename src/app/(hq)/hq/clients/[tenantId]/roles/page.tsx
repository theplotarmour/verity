import { ErrorState } from "@/components/ui/primitives";
import { runClientQuery } from "@/server/actions/hq";
import type { GrantableGroup, RoleRow } from "@/server/platform/administration";
import { RolesAdmin } from "./RolesAdmin";

export const dynamic = "force-dynamic";

export default async function ClientRolesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [roles, grantable] = await Promise.all([
    runClientQuery<RoleRow[]>(tenantId, "verity.platform.list_roles", {}),
    runClientQuery<GrantableGroup[]>(tenantId, "verity.platform.list_grantable_entities", {}),
  ]);

  if (!roles.ok) {
    return (
      <ErrorState
        title="Could not load this client's roles"
        message={roles.message}
        retryable={roles.retryable}
      />
    );
  }

  // The matrix degrades to the advanced raw form rather than failing the whole
  // page — a query hiccup here should not block viewing existing grants.
  const groups = grantable.ok ? grantable.data : [];

  return <RolesAdmin tenantId={tenantId} roles={roles.data} grantable={groups} />;
}
