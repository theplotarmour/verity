import { PageHeader, Panel, Stat, StatRow } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  clientDirectory,
  platformActivity,
  requireOperator,
} from "@/server/platform/operator";

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", header: "Client", sortable: true, variant: "link", href: "/hq/clients" },
  { key: "activity30d", header: "Changes", numeric: true, sortable: true },
  { key: "securityEvents30d", header: "Security events", numeric: true, sortable: true },
  { key: "lastActivity", header: "Last change", sortable: true },
];

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
        <DataTable
          columns={columns}
          rows={activity.map((row) => ({
            id: row.tenantId,
            name: row.name,
            activity30d: row.activity30d,
            securityEvents30d: row.securityEvents30d,
            lastActivity: row.lastActivityAt
              ? row.lastActivityAt.toISOString().slice(0, 16).replace("T", " ")
              : "—",
          }))}
          caption="Activity per client over the last 30 days"
          emptyTitle="No clients yet"
          emptyDescription="Create the first client from the Clients page. Nothing is provisioned automatically."
        />
      </Panel>
    </>
  );
}
