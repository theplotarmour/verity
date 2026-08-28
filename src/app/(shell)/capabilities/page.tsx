import { redirect } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { PageHeader, Panel, Stat, StatRow, StateBadge } from "@/components/ui/primitives";
import { CapabilityControls } from "./CapabilityControls";

export const dynamic = "force-dynamic";

/**
 * Capability registry (§24).
 *
 * What is installed, what this tenant has activated, and what each capability
 * depends on — and now, what turns each one on and off.
 *
 * This screen was read-only, on the reasoning that "a one-click toggle here
 * would invite an administrator to discover [dependency consequences] by
 * accident". The concern was right and the conclusion was not: without a
 * control, a tenant could not be set up without SQL, which is exactly what D20
 * exists to prevent. What the screen owes an administrator is the consequences
 * in front of them, not the absence of the control — so each row states what it
 * needs and what needs it, and the button is disabled with the reason shown
 * whenever the database would refuse.
 *
 * A table would not hold that. Each capability gets a row of its own with the
 * dependency story beside the control, because the story is the point.
 */
export default async function CapabilityRegistryPage() {
  const actor = await requireActor();

  // Raw system-level capability toggling belongs to the operator console
  // (`/hq/clients/[tenantId]/modules`), not a client workspace — activating or
  // deactivating a database-level module bypasses licensing boundaries and can
  // break dependent capabilities. This screen is the platform tenant's own
  // registry, reachable only when the active membership IS the platform tenant.
  const isPlatform = await withTenant(actor.tenantId, async (tx) => {
    const [row] = await tx.$queryRaw<{ is_platform: boolean }[]>`
      SELECT is_platform FROM tenant WHERE id = ${actor.tenantId}::uuid`;
    return row?.is_platform === true;
  });
  if (!isPlatform) redirect("/");

  const rows = await withTenant(actor.tenantId, async (tx) => {
    const [definitions, activations] = await Promise.all([
      tx.capabilityDefinition.findMany({ orderBy: { name: "asc" } }),
      tx.tenantActivation.findMany(),
    ]);

    const byId = new Map(activations.map((a) => [a.capabilityId, a]));
    const nameOf = new Map(definitions.map((d) => [d.id, d.name]));
    const isActive = (id: string) => byId.get(id)?.status === "Active";

    return definitions.map((definition) => {
      const activation = byId.get(definition.id);
      const active = activation?.status === "Active";

      return {
        id: definition.id,
        name: definition.name,
        version: definition.version,
        active,
        status: activation ? activation.status : "Not activated",
        statusCategory:
          activation?.status === "Active"
            ? "Active"
            : activation?.status === "Suspended"
              ? "Blocked"
              : "Draft",
        entities: definition.entityTypes.length,
        pinned: activation?.pinnedVersion ?? null,
        dependencies: definition.dependencies.map((id) => nameOf.get(id) ?? id),
        // What this tenant has NOT activated yet. Activation is refused until
        // these are, and the database is the one that refuses.
        missingDependencies: definition.dependencies
          .filter((id) => !isActive(id))
          .map((id) => nameOf.get(id) ?? id),
        // The other direction, which is what makes deactivation fail.
        activeDependants: definitions
          .filter((other) => other.dependencies.includes(definition.id) && isActive(other.id))
          .map((other) => other.name),
      };
    });
  });

  const activeCount = rows.filter((row) => row.active).length;

  return (
    <>
      <PageHeader
        title="Capability registry"
        description="Every capability installed on the platform, and whether this tenant has activated it. Dependencies are enforced by the database in both directions."
      />

      <StatRow cols={3} className="mb-6">
        <Stat label="Installed" value={rows.length} hint="Available on the platform" />
        <Stat label="Active here" value={activeCount} hint="Activated for this tenant" />
        <Stat label="Not activated" value={rows.length - activeCount} />
      </StatRow>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <Panel key={row.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="m-0 text-[15px] font-normal text-text">{row.name}</h3>
                  <StateBadge category={row.statusCategory} label={row.status} />
                </div>
                <p className="mb-0 mt-1.5 text-[13px] text-text-secondary">
                  <span className="tabular">v{row.version}</span>
                  {row.pinned && <span className="tabular"> · pinned at {row.pinned}</span>}
                  <span className="tabular">
                    {" · "}
                    {row.entities} {row.entities === 1 ? "entity" : "entities"}
                  </span>
                </p>
                <p className="mb-0 mt-1.5 text-[12px] text-text-tertiary">
                  {row.dependencies.length === 0
                    ? "Depends on nothing."
                    : `Depends on ${row.dependencies.join(", ")}.`}
                  {row.activeDependants.length > 0 &&
                    ` Required by ${row.activeDependants.join(", ")}.`}
                </p>
              </div>

              <CapabilityControls
                capabilityId={row.id}
                name={row.name}
                active={row.active}
                missingDependencies={row.missingDependencies}
                activeDependants={row.activeDependants}
              />
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
