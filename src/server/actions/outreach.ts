"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/server/platform/auth";
import { executeCommand, type ActorContext } from "@/server/platform/command";
import { executeQuery } from "@/server/platform/query";
import { limitActorRequests } from "@/server/platform/request-limits";
import { readAgentProviderConfig } from "@/server/platform/config";
import { runAgentTurn, AgentNotConfiguredError } from "@/server/platform/agent-chat";
import { toActionFailure, type ActionResult } from "@/server/platform/action-error";
import { installCapabilities } from "@/server/capabilities/registry";
import {
  INSIGHT_KINDS,
  INSIGHT_PROMPT_VERSION,
  INSIGHT_TOOL_KEYS,
  insightPrompt,
  listAiInsights,
  listOutreachLeads,
  recordAiInsight,
  type InsightKind,
} from "@/server/capabilities/outreach";

/**
 * Generate one AI suggestion about a lead (Task 106 Phase 8; master-context
 * §85, §32-33).
 *
 * WHY THIS IS AN ACTION AND NOT A COMMAND. The model call is a network round
 * trip that can take seconds; a command's transaction is not the place for
 * it (`people.ts` gives the same reasoning for Supabase Auth). ORDER, and it
 * is deliberate: authorize the lead read as this actor FIRST — the same
 * `executeQuery` any screen uses, so a lead outside their team scope fails
 * here with E_FORBIDDEN before a token is spent — run the turn SECOND,
 * persist THIRD through `recordAiInsight`, which re-checks the scope.
 *
 * ADR-017 holds by construction: `runAgentTurn` executes every tool as this
 * same `ActorContext`, through `enforcePolicy()`. The RBAC filter the plan
 * demands "before context retrieval, never after" is not a filter applied
 * to a context we assembled — the model never receives anything except
 * what its own actor-scoped queries returned. `sourceReads` records exactly
 * which those were.
 */
const input = z.object({ leadId: z.string().uuid(), kind: z.enum(INSIGHT_KINDS) });

export async function generateLeadInsight(raw: { leadId: string; kind: InsightKind }): Promise<ActionResult<{ id: string }>> {
  installCapabilities();
  let actor: ActorContext;
  try {
    actor = await requireActor();
    await limitActorRequests(actor.tenantId, actor.userId, "chat");
    const { leadId, kind } = input.parse(raw);

    // 1. Authorize as the actor. Lead reads are company-wide by design
    //    (master-context §7), so existence comes from the lead list and the
    //    team-scope check from `listAiInsights`, which throws E_FORBIDDEN for
    //    a lead outside the actor's own led team — the same rule
    //    `recordAiInsight` applies at persist time.
    const lead = await executeQuery(actor, listOutreachLeads, { leadId }, "human");
    if (lead.length === 0) {
      return { ok: false, code: "E_VALIDATION", message: "E_VALIDATION: lead does not exist", retryable: false };
    }
    await executeQuery(actor, listAiInsights, { leadId }, "human");

    // 2. The turn. Its tool calls are the provenance.
    const provider = readAgentProviderConfig();
    if (!provider) throw new AgentNotConfiguredError();
    const turn = await runAgentTurn(actor, [], insightPrompt(kind, leadId), { toolKeys: INSIGHT_TOOL_KEYS });
    const sourceReads = [...new Set(turn.toolCalls.filter((c) => c.kind === "query" && c.ok).map((c) => c.key))];
    const content = turn.reply.trim();
    if (!content || sourceReads.length === 0) {
      return {
        ok: false,
        code: "E_UNKNOWN",
        message: "The assistant did not read the lead's records, so nothing was recorded. Try again.",
        retryable: true,
      };
    }

    // 3. Persist. The human is the requester of record.
    const saved = await executeCommand(
      actor,
      recordAiInsight,
      { leadId, kind, content, model: provider.model, promptVersion: INSIGHT_PROMPT_VERSION, sourceReads },
      "human",
    );
    revalidatePath(`/outreach/${leadId}`);
    return { ok: true, data: saved };
  } catch (error) {
    if (error instanceof AgentNotConfiguredError) {
      return { ok: false, code: "E_UNKNOWN", message: "AI suggestions are not configured for this deployment.", retryable: false };
    }
    return toActionFailure(error);
  }
}
