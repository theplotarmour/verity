import { ErrorState } from "@/components/ui/primitives";
import { runClientQuery } from "@/server/actions/hq";
import { OrganizationsAdmin } from "./OrganizationsAdmin";

export const dynamic = "force-dynamic";

export type OrgRow = { id: string; name: string; parentId: string | null; memberCount: number };

export default async function ClientOrganizationsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const organizations = await runClientQuery<OrgRow[]>(
    tenantId,
    "verity.platform.list_organizations",
    {},
  );

  if (!organizations.ok) {
    return (
      <ErrorState
        title="Could not load this client's organizations"
        message={organizations.message}
        retryable={organizations.retryable}
      />
    );
  }

  return <OrganizationsAdmin tenantId={tenantId} organizations={organizations.data} />;
}
