import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_ASSET } from "@/server/capabilities/asset";
import { DataTable } from "@/components/ui/DataTable";
import { DemoDataNotice, PageHeader, PermissionDenied } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown> & {
  id: string; name: string; reference: string; location: string; state: string; category: string;
};

export default async function AssetsPage() {
  installCapabilities();
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_ASSET))) return null;

    const [assets, states] = await Promise.all([
      tx.asset.findMany({ include: { location: true }, orderBy: { name: "asc" } }),
      tx.stateDefinition.findMany({ where: { entityKey: ENTITY_ASSET } }),
    ]);
    const category = new Map(states.map((s) => [s.key, s.category]));

    return assets.map<Row>((a) => ({
      id: a.id,
      name: a.name,
      reference: a.reference ?? "—",
      location: a.location?.name ?? "Unassigned",
      state: a.state,
      category: category.get(a.state) ?? "Draft",
    }));
  });

  if (!data) return <PermissionDenied what="reading assets" />;

  return (
    <>
      <PageHeader
        eyebrow="Capability"
        title="Assets"
        description="Physical equipment. Equipment-specific attributes live in custom fields, never as platform columns."
      />
      <DataTable
        caption="Assets"
        rows={data}
        columns={[
          { key: "name", header: "Asset", variant: "link", href: "/assets/{id}", subKey: "reference" },
          { key: "location", header: "Location" },
          { key: "state", header: "State", variant: "state", categoryKey: "category" },
        ]}
        emptyTitle="No assets registered"
        emptyDescription="An asset is physical equipment the platform tracks. None has been registered in your scope."
      />
      <div className="mt-6">
        <DemoDataNotice />
      </div>
    </>
  );
}
