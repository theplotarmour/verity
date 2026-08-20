import { NextResponse } from "next/server";

import type { ModuleKey } from "@/platform/modules/registry";
import { getActiveSessionUser } from "@/lib/server/session-user";
import { buildAssistantContext, contextToPrompt } from "@/lib/server/assistantContext";
import { checkAssistantBudget, recordAssistantTokens } from "@/lib/server/assistantBudget";
import { groqClient, isGroqConfigured, routeModel, type TaskType } from "@/lib/server/groq";
import { assistantToolSpecs, runAssistantTool } from "@/lib/server/assistantTools";

/**
 * The assistant.
 *
 * `factoryId` comes from the session and is never read from the body — the body is
 * the one thing the caller fully controls, and a tenant id taken from it would let
 * anyone ground a prompt in another workspace's configuration.
 *
 * Order matters: configuration, then session, then budget, then the model. Every
 * refusal that can be decided without spending inference is decided first.
 */

const SYSTEM_PROMPT = [
  "You are the assistant inside Verity, a multi-tenant operations platform.",
  "Answer only from the grounding block below. If a feature is not in the installed",
  "modules, say it is not installed rather than describing how it works.",
  "Never invent a status value. Use the exact values given.",
  "You cannot change anything — describe what the user should do, and where.",
].join(" ");

export async function POST(request: Request) {
  // Before anything else: an unset key surfaces from Groq as a 401 that reads like
  // a revoked credential, and sends whoever is on call to rotate a key that was
  // never set.
  if (!isGroqConfigured()) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set. The assistant is not configured on this deployment." },
      { status: 503 }
    );
  }

  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { message?: string; route?: string; taskType?: TaskType };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const budget = await checkAssistantBudget(session.factoryId);
  if (!budget.ok) {
    // 429, not 500: the tenant is rate-limited, nothing is broken.
    return NextResponse.json({ error: budget.reason }, { status: 429 });
  }

  const context = await buildAssistantContext(session.factoryId, body.route ?? "/owner/dashboard");
  const model = routeModel(body.taskType === "analytical" ? "analytical" : "operational");

  // Only the tools this tenant is entitled to. `factoryId` is never a tool
  // parameter — the executor takes it from the session below, not from the model.
  const tools = assistantToolSpecs(context.modules.map((m) => m.key as ModuleKey));

  try {
    const client = groqClient();
    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${contextToPrompt(context)}` },
      { role: "user", content: message },
    ];

    const first = await client.chat.completions.create({
      model,
      messages: messages as never,
      ...(tools.length > 0 ? { tools, tool_choice: "auto" as const } : {}),
    });

    let tokens = first.usage?.total_tokens ?? 0;
    const firstChoice = first.choices[0]?.message;
    const toolCalls = firstChoice?.tool_calls ?? [];

    let reply = firstChoice?.content ?? "";
    const toolsUsed: string[] = [];
    // One bounded tool round: the model asks for data, we fetch it tenant-scoped,
    // it answers. A second round is deliberately not run — it is the difference
    // between an assistant and an agent, and the budget is a shared token pool.
    if (toolCalls.length > 0) {
      messages.push({ role: "assistant", content: firstChoice?.content ?? "", tool_calls: toolCalls });

      for (const call of toolCalls) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(call.function.arguments || "{}");
        } catch {
          parsed = {};
        }
        // factoryId + organizationId come from the SESSION, never the model.
        const outcome = await runAssistantTool(
          call.function.name,
          session.factoryId,
          budget.organizationId,
          parsed,
        );
        toolsUsed.push(call.function.name);

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify("error" in outcome ? { error: outcome.error } : outcome.result),
        });
      }

      const second = await client.chat.completions.create({ model, messages: messages as never });
      tokens += second.usage?.total_tokens ?? 0;
      reply = second.choices[0]?.message?.content ?? reply;
    }

    if (tokens > 0) await recordAssistantTokens(budget.organizationId, tokens);

    return NextResponse.json({ reply, model, tokens, toolsUsed });
  } catch (error) {
    console.error("Assistant call failed", error);
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
