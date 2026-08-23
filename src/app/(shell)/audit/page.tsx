import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader, PermissionDenied, SectionHeading, Surface } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type ActivityRow = Record<string, unknown> & {
  id: string; entity: string; field: string; change: string; at: string; command: string;
};
type SecurityRow = Record<string, unknown> & { id: string; type: string; at: string; ip: string };

/**
 * Audit (§17).
 *
 * The two streams are presented separately because they answer different
 * questions for different audiences: the operational stream is "what changed on
 * our records", the security stream is "whose access moved". The brief requires
 * that distinction to be respected rather than flattened into one feed.
 *
 * The security stream is shown only to an actor who can edit permissions.
 * Everyone who can read a record can see its history; not everyone should see
 * role reassignments.
 */
export default async function AuditPage() {
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    const permissions = actor.roleId ? await resolvePermissions(tx, actor.roleId) : [];
    if (permissions.length === 0) return null;

    // Seeing security events is a stronger right than seeing record history.
    const canSeeSecurity = permissions.some(
      (p) => p.verb === "Edit" && p.entity.includes("role"),
    ) || permissions.some((p) => p.verb === "Delete");

    const [activity, security, events] = await Promise.all([
      tx.activity.findMany({ orderBy: { occurredAt: "desc" }, take: 100 }),
      canSeeSecurity
        ? tx.securityAuditEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 50 })
        : Promise.resolve([]),
      tx.domainEvent.count(),
    ]);

    return {
      canSeeSecurity,
      eventCount: events,
      activity: activity.map<ActivityRow>((a) => ({
        id: a.id,
        entity: a.entityKey.split(".").slice(-1)[0] ?? a.entityKey,
        field: a.fieldChanged,
        change: `${a.oldValue ?? "empty"} → ${a.newValue ?? "empty"}`,
        at: a.occurredAt.toISOString().replace("T", " ").slice(0, 16),
        command: a.commandKey ?? "—",
      })),
      security: security.map<SecurityRow>((s) => ({
        id: s.id,
        type: s.eventType,
        at: s.occurredAt.toISOString().replace("T", " ").slice(0, 16),
        ip: s.ipAddress ?? "—",
      })),
    };
  });

  if (!data) return <PermissionDenied what="reading the audit trail" />;

  return (
    <>
      <PageHeader
        title="Audit"
        description="Recorded facts. Audit rows cannot be edited or deleted by the application at any privilege level."
      />

      <div className="flex flex-col gap-10">
        <section>
          <SectionHeading note={`${data.eventCount} platform events recorded`}>
            Operational history
          </SectionHeading>
          <DataTable
            caption="Operational history"
            rows={data.activity}
            columns={[
              { key: "entity", header: "Record" },
              { key: "field", header: "Field" },
              { key: "change", header: "Change" },
              { key: "command", header: "Command" },
              { key: "at", header: "When" },
            ]}
            emptyTitle="No changes recorded yet"
            emptyDescription="History begins when a command modifies a record."
          />
        </section>

        <section>
          <SectionHeading>Security events</SectionHeading>
          {data.canSeeSecurity ? (
            <DataTable
              caption="Security events"
              rows={data.security}
              columns={[
                { key: "type", header: "Event" },
                { key: "ip", header: "Source" },
                { key: "at", header: "When" },
              ]}
              emptyTitle="No security events recorded"
            />
          ) : (
            <Surface className="p-5">
              <p className="text-text-secondary m-0">
                The security stream records authentication and permission changes. Your role does not
                include access to it.
              </p>
            </Surface>
          )}
        </section>
      </div>
    </>
  );
}
