import Link from "next/link";
import { PageHeader, Panel, Stat, StatRow, EmptyState } from "@/components/ui/primitives";
import {
  clientDirectory,
  platformActivity,
  requireOperator,
} from "@/server/platform/operator";

export const dynamic = "force-dynamic";

/**
 * The operator overview.
 *
 * Every number here is counted, not estimated, and comes from the two read-only
 * projections ADR-013 enumerates. There is no trend, no sparkline and no
 * health score, because the platform has nothing to compare against yet and a
 * comparison invented for a dashboard is the exact fake metric this codebase
 * has refused elsewhere.
 */
export default async function HqOverviewPage() {
  const operator = await requireOperator();
  const [clients, activity] = await Promise.all([
    clientDirectory(operator),
    platformActivity(operator),
  ]);

  const totalMembers = clients.reduce((sum, c) => sum + c.memberCount, 0);
  const totalActivity = activity.reduce((sum, a) => sum + a.activity30d, 0);
  const totalSecurity = activity.reduce((sum, a) => sum + a.securityEvents30d, 0);

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Every client on this Verity installation, and what has happened inside them. Counts only — a client's own records stay inside that client."
      />

      <StatRow className="mb-6">
        <Stat label="Clients" value={clients.length} href="/hq/clients" />
        <Stat label="People with access" value={totalMembers} />
        <Stat label="Changes · 30 days" value={totalActivity} />
        <Stat label="Security events · 30 days" value={totalSecurity} href="/hq/audit" />
      </StatRow>

      <Panel title="Activity by client" flush>
        {activity.length === 0 ? (
          <EmptyState
            compact
            title="No clients yet"
            description="Create the first client from the Clients page. Nothing is provisioned automatically."
          />
        ) : (
          <table className="w-full border-collapse">
            <caption className="sr-only">Activity per client over the last 30 days</caption>
            <thead>
              <tr>
                <th className="border-b border-line px-3 py-3 text-left text-[12px] font-normal text-text-tertiary">
                  Client
                </th>
                <th className="border-b border-line px-3 py-3 text-right text-[12px] font-normal text-text-tertiary">
                  Changes
                </th>
                <th className="border-b border-line px-3 py-3 text-right text-[12px] font-normal text-text-tertiary">
                  Security events
                </th>
                <th className="border-b border-line px-3 py-3 text-right text-[12px] font-normal text-text-tertiary">
                  Last change
                </th>
              </tr>
            </thead>
            <tbody>
              {activity.map((row) => (
                <tr key={row.tenantId}>
                  <td className="border-b border-line px-3 py-3 text-[14px]">
                    <Link href="/hq/clients" className="no-underline text-text hover:text-accent">
                      {row.name}
                    </Link>
                  </td>
                  <td className="tabular border-b border-line px-3 py-3 text-right text-[14px]">
                    {row.activity30d}
                  </td>
                  <td className="tabular border-b border-line px-3 py-3 text-right text-[14px]">
                    {row.securityEvents30d}
                  </td>
                  <td className="border-b border-line px-3 py-3 text-right text-[13px] text-text-secondary">
                    {row.lastActivityAt
                      ? row.lastActivityAt.toISOString().slice(0, 16).replace("T", " ")
                      : "—"}
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
