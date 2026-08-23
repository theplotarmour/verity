import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_ASSET } from "@/server/capabilities/asset";
import { ENTITY_EVIDENCE } from "@/server/capabilities/evidence";
import { entityHistory } from "@/server/platform/audit";
import {
  DefinitionList, PageHeader, PermissionDenied, SectionHeading, StateBadge, Surface,
} from "@/components/ui/primitives";
import { AuditTrail } from "@/components/shell/AuditTrail";
import { AssetActions } from "./AssetActions";
import { EvidencePanel } from "./EvidencePanel";

export const dynamic = "force-dynamic";

/**
 * Asset detail — the full entity experience: identity, state and its permitted
 * transitions, related records, evidence, and history.
 *
 * The available actions come from the platform's own transition definitions
 * intersected with the actor's permissions. Nothing is offered that the command
 * pipeline would then refuse, and nothing is hidden that it would allow.
 */
export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  installCapabilities();
  const { id } = await params;
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_ASSET))) return { denied: true as const };

    const asset = await tx.asset.findUnique({ where: { id }, include: { location: true } });
    if (!asset) return { notFound: true as const };

    const states = await tx.stateDefinition.findMany({ where: { entityKey: ENTITY_ASSET } });
    const current = states.find((s) => s.key === asset.state);

    // Only transitions the capability actually declared from here.
    const outgoing = current
      ? await tx.transitionDefinition.findMany({
          where: { entityKey: ENTITY_ASSET, fromStateId: current.id },
        })
      : [];
    const byId = new Map(states.map((s) => [s.id, s]));

    const [canEdit, canCaptureEvidence, history, evidence, bookings] = await Promise.all([
      hasPermission(tx, actor.roleId, "Edit", ENTITY_ASSET),
      hasPermission(tx, actor.roleId, "Create", ENTITY_EVIDENCE),
      entityHistory(tx, ENTITY_ASSET, asset.id),
      tx.evidence.findMany({ where: { entityKey: ENTITY_ASSET, entityId: asset.id }, orderBy: { capturedAt: "desc" } }),
      tx.booking.findMany({
        where: { subjectEntityKey: ENTITY_ASSET, subjectEntityId: asset.id, cancelled: false },
        orderBy: { startsAt: "asc" },
        include: { resource: true },
      }),
    ]);

    return {
      asset,
      category: current?.category ?? "Draft",
      isTerminal: current?.isTerminal ?? false,
      transitions: outgoing.map((t) => byId.get(t.toStateId)!).filter(Boolean),
      canEdit,
      canCaptureEvidence,
      history,
      evidence,
      bookings,
    };
  });

  if ("denied" in data) return <PermissionDenied what="viewing this asset" />;
  if ("notFound" in data) notFound();

  return (
    <>
      <PageHeader
        title={data.asset.name}
        description={data.asset.reference ? `Reference ${data.asset.reference}` : undefined}
        actions={
          <AssetActions
            assetId={data.asset.id}
            transitions={data.transitions.map((s) => ({ key: s.key, category: s.category }))}
            canEdit={data.canEdit}
            isTerminal={data.isTerminal}
          />
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-8">
          <section>
            <SectionHeading>Identity</SectionHeading>
            <Surface className="p-5">
              <DefinitionList
                items={[
                  { term: "State", value: <StateBadge category={data.category} label={data.asset.state} /> },
                  { term: "Location", value: data.asset.location?.name ?? "Unassigned" },
                  { term: "Reference", value: data.asset.reference ?? "—" },
                  { term: "Version", value: String(data.asset.version) },
                ]}
              />
              {data.isTerminal && (
                <p className="text-[13px] text-text-tertiary mt-4 mb-0">
                  This asset is in a terminal state and is permanently read-only (INV-002).
                </p>
              )}
            </Surface>
          </section>

          <section>
            <SectionHeading>Scheduling</SectionHeading>
            <Surface className="p-1">
              {data.bookings.length === 0 ? (
                <p className="text-text-secondary px-4 py-6 m-0">No bookings reference this asset.</p>
              ) : (
                <ul className="list-none m-0 p-0">
                  {data.bookings.map((b) => (
                    <li key={b.id} className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-line last:border-b-0">
                      <span className="text-text">{b.resource.name}</span>
                      <span className="text-[13px] text-text-tertiary tabular">
                        {b.startsAt.toISOString().replace("T", " ").slice(0, 16)} → {b.endsAt.toISOString().slice(11, 16)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </section>

          <EvidencePanel
            assetId={data.asset.id}
            canCapture={data.canCaptureEvidence}
            evidence={data.evidence.map((e) => ({
              id: e.id,
              kind: e.kind,
              capturedAt: e.capturedAt.toISOString(),
              withinFence: e.withinFence,
              uri: e.uri,
            }))}
          />
        </div>

        <section>
          <SectionHeading>History</SectionHeading>
          <AuditTrail
            entries={data.history.map((h) => ({
              id: h.id, field: h.fieldChanged, from: h.oldValue, to: h.newValue,
              at: h.occurredAt.toISOString(), command: h.commandKey,
            }))}
          />
        </section>
      </div>
    </>
  );
}
