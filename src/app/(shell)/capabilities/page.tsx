import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { DataTable } from "@/components/ui/DataTable";
import {
  PageHeader,
  Stat,
  StatRow,
} from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown> & {
  id: string; name: string; version: string; status: string;
  dependencies: string; entities: number; pinned: string; statusCategory: string;
};

/**
 * Capability registry (§24).
 *
 * Shows what is installed, what this tenant has activated, and what each
 * capability depends on. Deliberately read-only: activation has real dependency
 * consequences enforced by the database, and a one-click toggle here would
 * invite an administrator to discover them by accident.
 */
export default async function CapabilityRegistryPage() {
  const actor = await requireActor();

  const rows = await withTenant(actor.tenantId, async (tx) => {
    const [definitions, activations] = await Promise.all([
      tx.capabilityDefinition.findMany({ orderBy: { name: "asc" } }),
      tx.tenantActivation.findMany(),
    ]);
    const byId = new Map(activations.map((a) => [a.capabilityId, a]));

    return definitions.map<Row>((d) => {
      const activation = byId.get(d.id);
      return {
        id: d.id,
        name: d.name,
        version: d.version,
        status: activation ? activation.status : "Not activated",
        // The canonical category the badge renders; never a per-screen colour.
        statusCategory:
          activation?.status === "Active" ? "Active"
          : activation?.status === "Suspended" ? "Blocked"
          : "Draft",
        dependencies: d.dependencies.length ? d.dependencies.map((x) => x.split(".").pop()).join(", ") : "None",
        entities: d.entityTypes.length,
        pinned: activation?.pinnedVersion ?? "—",
      };
    });
  });

  return (
    <>
      <PageHeader
        title="Capability registry"
        description="Every capability installed on the platform, and whether this tenant has activated it."
      />

      <StatRow cols={3} className="mb-6">
        <Stat label="Installed" value={rows.length} hint="Available on the platform" />
        <Stat
          label="Active here"
          value={rows.filter((r) => r.status === "Active").length}
          hint="Activated for this tenant"
        />
        <Stat
          label="Not activated"
          value={rows.filter((r) => r.status === "Not activated").length}
        />
      </StatRow>

      <DataTable
        caption="Capabilities"
        rows={rows}
        columns={[
          { key: "name", header: "Capability" },
          { key: "status", header: "Status", variant: "state", categoryKey: "statusCategory" },
          { key: "version", header: "Version" },
          { key: "pinned", header: "Pinned at" },
          { key: "dependencies", header: "Depends on" },
          { key: "entities", header: "Entities", numeric: true },
        ]}
        emptyTitle="No capabilities installed"
        emptyDescription="A capability registers itself with the platform at boot. None has."
      />
    </>
  );
}
