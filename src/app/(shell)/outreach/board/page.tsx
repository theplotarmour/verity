import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { ForbiddenError } from "@/server/platform/authorization";
import { executeQuery } from "@/server/platform/query";
import { installCapabilities } from "@/server/capabilities/registry";
import {
  OUTREACH_CAPABILITY,
  ENTITY_LEAD,
  LINEAR_STAGES,
  TERMINAL_STATES,
  assertTeamScopeAllowed,
  listOutreachLeads,
} from "@/server/capabilities/outreach";
import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { KanbanBoard } from "./KanbanBoard";

export const dynamic = "force-dynamic";

/**
 * Pipeline Kanban board — Task 109 Phase G §1 (master prompt §72-74). Native
 * HTML5 drag-and-drop calling the existing `advanceLeadStage` command; no new
 * backend. Legal drop targets are computed from the same `TransitionDefinition`
 * rows `LeadActions.tsx` already reads, so the board cannot offer a move the
 * command pipeline would refuse.
 */
async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const filters = await searchParams;

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_LEAD))) return null;
    try {
      await assertTeamScopeAllowed(tx, actor.userId, filters.team);
    } catch (error) {
      if (error instanceof ForbiddenError) return "forbidden" as const;
      throw error;
    }

    const [leads, states, transitions] = await Promise.all([
      executeQuery(actor, listOutreachLeads, { teamId: filters.team }),
      tx.stateDefinition.findMany({ where: { entityKey: ENTITY_LEAD } }),
      tx.transitionDefinition.findMany({ where: { entityKey: ENTITY_LEAD } }),
    ]);
    const stateById = new Map(states.map((s) => [s.id, s.key]));
    const legalMoves: Record<string, string[]> = {};
    for (const t of transitions) {
      const fromKey = stateById.get(t.fromStateId);
      const toKey = stateById.get(t.toStateId);
      if (!fromKey || !toKey) continue;
      (legalMoves[fromKey] ??= []).push(toKey);
    }
    return {
      leads: leads.map((l) => ({
        id: l.id as string,
        companyName: l.companyName as string,
        state: l.state as string,
        track: l.track as string,
        qualityScore: (l.qualityScore as number | null) ?? null,
      })),
      legalMoves,
    };
  });

  if (data === null) return <PermissionDenied what="reading the pipeline board" />;
  if (data === "forbidden") return <PermissionDenied what="viewing another team's pipeline" />;

  return (
    <>
      <PageHeader
        title="Pipeline board"
        description="Drag a card to a legal next stage — the same transitions the lead's own page offers. Lost/Not-a-fit is one bucket regardless of which terminal reason applies."
      />
      <KanbanBoard leads={data.leads} legalMoves={data.legalMoves} stages={[...LINEAR_STAGES]} terminalStates={[...TERMINAL_STATES]} />
    </>
  );
}

export default withCapabilityPageAccess(OUTREACH_CAPABILITY, BoardPage);
