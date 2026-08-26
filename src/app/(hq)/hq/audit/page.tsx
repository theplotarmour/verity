import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { platformAudit, requireOperator } from "@/server/platform/operator";

export const dynamic = "force-dynamic";

/**
 * Platform audit.
 *
 * Metadata only: which change happened, to which entity type, in which client,
 * by whom, and whether the actor was an operator. Not what the record contained
 * — a platform-wide view of every client's field values would be the leak this
 * whole mechanism exists to avoid, and it is not needed to answer the question
 * an operator actually has.
 *
 * ADR-013 answer 12 in the interface: privileged actions are labelled, because
 * an audit trail that cannot distinguish "the client did this" from "we did this
 * to the client" is not an audit trail anyone can act on.
 */
export default async function HqAuditPage() {
  const operator = await requireOperator();
  const rows = await platformAudit(operator, 100);

  return (
    <>
      <PageHeader
        title="Platform audit"
        description="Recent changes across every client. Operator actions are marked; payload values stay inside the client they belong to."
      />

      <Panel title={`${rows.length} most recent`} flush>
        {rows.length === 0 ? (
          <EmptyState compact title="Nothing recorded yet" />
        ) : (
          <table className="w-full border-collapse">
            <caption className="sr-only">Platform-wide audit metadata</caption>
            <thead>
              <tr>
                {["When", "Client", "Entity", "Change", "By"].map((h) => (
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
              {rows.map((row, i) => (
                <tr key={`${row.entityId}-${row.occurredAt.toISOString()}-${i}`}>
                  <td className="tabular border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                    {row.occurredAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="border-b border-line px-3 py-3 text-[14px]">{row.tenantName}</td>
                  <td className="border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                    {row.entityKey}
                  </td>
                  <td className="border-b border-line px-3 py-3 text-[13px]">
                    {row.fieldChanged}
                    {row.commandKey && (
                      <span className="ml-2 text-text-tertiary">{row.commandKey}</span>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-3 text-[13px]">
                    {row.isOperator ? (
                      <span className="inline-flex items-center rounded-pill bg-accent-subtle px-2 py-0.5 text-[12px] font-medium text-accent-ink">
                        Operator
                      </span>
                    ) : (
                      <span className="text-text-secondary">Client user</span>
                    )}
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
