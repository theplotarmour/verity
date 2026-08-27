import { ErrorState, Panel, Stat, StatRow, EmptyState } from "@/components/ui/primitives";
import { runClientQuery } from "@/server/actions/hq";
import type { OperationsSnapshot } from "@/server/platform/administration";

export const dynamic = "force-dynamic";

/**
 * What is happening and what is failing inside one client.
 *
 * Read-only, and every number is a count of real rows. There is no health score
 * and no traffic light, because nothing defines one — a green tick computed
 * from an arbitrary formula tells an operator less than the four numbers it
 * would replace.
 *
 * Provider bindings appear here as a statement of fact rather than a status
 * light: the contracts are complete and no vendor is bound, which is a decision
 * (PLATFORM-FREEZE), not an outage.
 */
export default async function ClientOperationsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const snapshot = await runClientQuery<OperationsSnapshot>(
    tenantId,
    "verity.platform.operations_snapshot",
    {},
  );

  if (!snapshot.ok) {
    return (
      <ErrorState
        title="Could not load operations for this client"
        message={snapshot.message}
        retryable={snapshot.retryable}
      />
    );
  }

  const data = snapshot.data;

  return (
    <>
      <StatRow className="mb-6">
        <Stat label="Undelivered events" value={data.pendingOutbox} />
        <Stat label="SLA clocks running" value={data.runningClocks} />
        <Stat label="SLA breached" value={data.breachedClocks} />
        <Stat label="Unresolved sync exceptions" value={data.syncExceptions} />
      </StatRow>

      <div className="mb-6">
        <Panel title="Provider bindings">
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px]">
            {[
              ["Storage driver", "Evidence, file upload", "Not bound"],
              ["Job runner", "SLA sweeps, notification dispatch", "Not bound"],
              ["Notification transport", "Reminders and alerts", "Not bound"],
            ].map(([name, purpose, status]) => (
              <li key={name} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-text">
                  {name}
                  <span className="ml-2 text-text-tertiary">{purpose}</span>
                </span>
                <span className="text-text-secondary">{status}</span>
              </li>
            ))}
          </ul>
          <p className="mb-0 mt-3 text-[12px] text-text-tertiary">
            Each contract is complete and tested; none is wired to a vendor. A provider chosen
            without a requirement is a guess encoded into the foundation, so binding waits for the
            first requirement that names one.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent changes" flush>
          {data.recentActivity.length === 0 ? (
            <EmptyState compact title="Nothing recorded yet" />
          ) : (
            <ul className="m-0 list-none p-0">
              {data.recentActivity.map((row, index) => (
                <li
                  key={`${row.occurredAt}-${index}`}
                  className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-b-0"
                >
                  <span className="min-w-0 truncate text-text">
                    {row.entityKey}
                    <span className="ml-2 text-text-tertiary">{row.fieldChanged}</span>
                  </span>
                  <span className="tabular shrink-0 text-text-tertiary">
                    {new Date(row.occurredAt).toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Security events" flush>
          {data.securityEvents.length === 0 ? (
            <EmptyState compact title="Nothing recorded yet" />
          ) : (
            <ul className="m-0 list-none p-0">
              {data.securityEvents.map((row, index) => (
                <li
                  key={`${row.occurredAt}-${index}`}
                  className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-b-0"
                >
                  <span className="text-text">{row.eventType}</span>
                  <span className="tabular shrink-0 text-text-tertiary">
                    {new Date(row.occurredAt).toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
