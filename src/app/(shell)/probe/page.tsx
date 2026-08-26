import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { installCapabilities } from "@/server/capabilities/registry";
import { PageHeader, Panel, EmptyState, StateBadge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * THROWAWAY: the probe's UI contribution — work plan Phase 4, gate 9.
 *
 * Deleted with the rest of the probe. Its only job is to show that a capability
 * can add a route under the existing shell, reachable through contributed
 * navigation, with no shell change of any kind: no route map, no registry of
 * pages, no edit to `ShellChrome`.
 */
export default async function ProbePage() {
  installCapabilities();
  const actor = await requireActor();

  const widgets = await withTenant(actor.tenantId, (tx) =>
    tx.$queryRaw<Array<{ id: string; name: string; state: string; category: string }>>`
      SELECT w.id, w.name, w.state, s.category
      FROM probe_widget w
      LEFT JOIN state_definition s
        ON s.entity_key = 'verity.probe.widget' AND s.key = w.state
      ORDER BY w.created_at DESC
      LIMIT 50`,
  );

  return (
    <>
      <PageHeader
        title="Composition probe"
        description="A throwaway capability that exercises every contribution point. It proves the foundation composes; it is not a product surface and will be deleted."
      />

      <Panel title={`${widgets.length} widget${widgets.length === 1 ? "" : "s"}`} flush>
        {widgets.length === 0 ? (
          <EmptyState compact title="No widgets" description="Created by the probe test run." />
        ) : (
          <table className="w-full border-collapse">
            <caption className="sr-only">Probe widgets</caption>
            <thead>
              <tr>
                {["Name", "State"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-line px-3 py-3 text-left text-[12px] font-normal text-text-tertiary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {widgets.map((widget) => (
                <tr key={widget.id}>
                  <td className="border-b border-line px-3 py-3 text-[14px]">{widget.name}</td>
                  <td className="border-b border-line px-3 py-3">
                    <StateBadge category={widget.category ?? "Draft"} label={widget.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
