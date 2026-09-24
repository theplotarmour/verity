import { PageHeader, Panel, DefinitionList } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { platformSettings } from "@/server/platform/operator";

export const dynamic = "force-dynamic";

const operatorColumns: Column[] = [
  { key: "displayName", header: "Person", sortable: true },
  { key: "email", header: "Email", sortable: true },
  { key: "roleName", header: "Role", sortable: true },
];

const capabilityColumns: Column[] = [
  { key: "name", header: "Capability", sortable: true },
  { key: "capId", header: "Key", sortable: true },
  { key: "version", header: "Version", sortable: true },
];

/**
 * Platform settings.
 *
 * Read-only, and deliberately so. Every writable setting Verity has belongs to a
 * client and lives on that client's own Settings tab; what remains at platform
 * level is the operator roster, the platform tenant's own record, and the
 * capabilities installed by migration — none of which has a write path that
 * exists today.
 *
 * Adding buttons for them would mean either inventing a mechanism nothing asked
 * for or drawing controls that fail when pressed. Operator access is granted by
 * `prisma/bootstrap-operator.ts` under a human's hand, which is the right place
 * for it: granting platform authority should be a deliberate act at a terminal,
 * not a click.
 */
export default async function HqSettingsPage() {
  const settings = await platformSettings();

  return (
    <>
      <PageHeader
        title="Platform settings"
        description="The platform's own record, who operates it, and what is installed. Client configuration lives on each client's Settings tab."
      />

      <div className="mb-6">
        <Panel title="Platform tenant">
          <DefinitionList
            items={[
              { term: "Name", value: settings.tenantName },
              { term: "Time zone", value: settings.timeZone ?? "UTC (unset, recorded as a choice)" },
              { term: "Operators", value: String(settings.operators.length) },
            ]}
          />
        </Panel>
      </div>

      <div className="mb-6">
        <Panel title="Operators" flush>
          <DataTable
            columns={operatorColumns}
            rows={settings.operators.map((operator) => ({
              id: `${operator.displayName}-${operator.email ?? ""}`,
              displayName: operator.displayName,
              email: operator.email ?? "—",
              roleName: operator.roleName ?? "No role — grants nothing",
            }))}
            caption="People holding platform operator authority"
            emptyTitle="No operators"
          />
          <p className="mb-0 mt-3 px-4 pb-4 text-[12px] text-text-tertiary">
            Operator authority is granted by <code>prisma/bootstrap-operator.ts</code>, run by a
            person at a terminal. It is deliberately not a button here.
          </p>
        </Panel>
      </div>

      <Panel title="Installed capabilities" flush>
        <DataTable
          columns={capabilityColumns}
          rows={settings.installedCapabilities.map((capability) => ({
            id: capability.id,
            name: capability.name,
            capId: capability.id,
            version: capability.version,
          }))}
          caption="Capabilities installed on this platform"
          emptyTitle="No capabilities installed"
        />
        <p className="mb-0 mt-3 px-4 pb-4 text-[12px] text-text-tertiary">
          Installed by migration; enabled per client on that client&apos;s Modules tab.
        </p>
      </Panel>
    </>
  );
}
