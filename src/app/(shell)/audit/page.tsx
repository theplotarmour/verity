import { requireActor } from "@/server/platform/auth";
import {
  commandLabelOf,
  entityLabelOf,
  fieldLabelOf,
} from "@/components/ui/business/vocabulary";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import { DataTable } from "@/components/ui/DataTable";
import {
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  SectionHeading,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { OperationalHistory } from "./OperationalHistory";

export const dynamic = "force-dynamic";

type ActivityRow = Record<string, unknown> & {
  id: string; entity: string; field: string; change: string; at: string; command: string;
  // Full detail for the Context Panel — the table columns above stay
  // truncated/formatted for scanning; the panel shows the untruncated facts.
  entityKey: string; entityId: string; oldValue: string; newValue: string;
  commandFull: string; actor: string; occurredAtFull: string;
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
        // §78 — a business audit, in business words. The raw keys are kept
        // below for the context panel, because an operator chasing a support
        // ticket needs the identifier and a manager reading the log does not.
        entity: entityLabelOf(a.entityKey),
        field: fieldLabelOf(a.fieldChanged),
        change: `${a.oldValue ?? "empty"} → ${a.newValue ?? "empty"}`,
        at: a.occurredAt.toISOString().replace("T", " ").slice(0, 16),
        command: commandLabelOf(a.commandKey) ?? "—",
        entityKey: a.entityKey,
        entityId: a.entityId,
        oldValue: a.oldValue ?? "empty",
        newValue: a.newValue ?? "empty",
        commandFull: a.commandKey ?? "—",
        // Unjoined by design, matching `operator.ts`'s `platformAudit` — an
        // audit row's actor is a raw id, not a Party lookup this query owns.
        actor: a.actorUserId ?? "System",
        occurredAtFull: a.occurredAt.toISOString(),
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
      {/*
        Two streams, deliberately not merged. Operational history answers "what
        changed on this record"; the security stream answers "whose access
        moved". They have different audiences and different permissions, and
        interleaving them puts authentication noise in front of an operator who
        cannot act on it. Separate headings keep that boundary legible.
      */}
      <PageHeader
        title="Audit"
        description="Recorded facts. Audit rows cannot be edited or deleted by the application at any privilege level."
      />

      <StatRow cols={3} className="mb-8">
        <Stat label="Domain events" value={data.eventCount} hint="Emitted through the outbox" />
        <Stat label="Field changes" value={data.activity.length} hint="Most recent 100" />
        <Stat
          label="Security events"
          value={data.canSeeSecurity ? data.security.length : "—"}
          hint={data.canSeeSecurity ? "Most recent 50" : "Not visible to your role"}
        />
      </StatRow>

      <div className="flex flex-col gap-8">
        <section>
          <SectionHeading note="Newest first">Operational history</SectionHeading>
          <OperationalHistory rows={data.activity} />
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
              emptyDescription="Sign-ins and context switches appear here as they happen."
            />
          ) : (
            <Panel flush>
              <EmptyState
                title="Security stream not visible"
                description="It records authentication and permission changes. Your current role does not include access to it."
              />
            </Panel>
          )}
        </section>
      </div>
    </>
  );
}
