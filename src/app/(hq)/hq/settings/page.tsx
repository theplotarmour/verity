import { PageHeader, Panel, DefinitionList, EmptyState } from "@/components/ui/primitives";
import { platformSettings } from "@/server/platform/operator";

export const dynamic = "force-dynamic";

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
          {settings.operators.length === 0 ? (
            <EmptyState compact title="No operators" />
          ) : (
            <table className="w-full border-collapse">
              <caption className="sr-only">People holding platform operator authority</caption>
              <thead>
                <tr>
                  {["Person", "Email", "Role"].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-line px-3 py-3 text-left text-[12px] font-normal text-text-tertiary"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settings.operators.map((operator) => (
                  <tr key={`${operator.displayName}-${operator.email ?? ""}`}>
                    <td className="border-b border-line px-3 py-3 text-[14px] text-text">
                      {operator.displayName}
                    </td>
                    <td className="border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                      {operator.email ?? "—"}
                    </td>
                    <td className="border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                      {operator.roleName ?? "No role — grants nothing"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mb-0 mt-3 px-4 pb-4 text-[12px] text-text-tertiary">
            Operator authority is granted by <code>prisma/bootstrap-operator.ts</code>, run by a
            person at a terminal. It is deliberately not a button here.
          </p>
        </Panel>
      </div>

      <Panel title="Installed capabilities" flush>
        <table className="w-full border-collapse">
          <caption className="sr-only">Capabilities installed on this platform</caption>
          <thead>
            <tr>
              {["Capability", "Key", "Version"].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-line px-3 py-3 text-left text-[12px] font-normal text-text-tertiary"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {settings.installedCapabilities.map((capability) => (
              <tr key={capability.id}>
                <td className="border-b border-line px-3 py-3 text-[14px] text-text">
                  {capability.name}
                </td>
                <td className="border-b border-line px-3 py-3 text-[13px] text-text-tertiary">
                  {capability.id}
                </td>
                <td className="border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                  {capability.version}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mb-0 mt-3 px-4 pb-4 text-[12px] text-text-tertiary">
          Installed by migration; enabled per client on that client&apos;s Modules tab.
        </p>
      </Panel>
    </>
  );
}
