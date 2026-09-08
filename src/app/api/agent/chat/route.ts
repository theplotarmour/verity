import { limitActorRequests, RateLimitError, readBoundedJson } from "@/server/platform/request-limits";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireActor } from "@/server/platform/auth";
import { runAgentTurn, AgentNotConfiguredError, type ChatMessage } from "@/server/platform/agent-chat";
import { toActionFailure } from "@/server/platform/action-error";

export const dynamic = "force-dynamic";

/**
 * Chat surface server route — Task 84 area 6.
 *
 * Requires an authenticated session exactly like any other route (`requireActor`
 * throws `E_UNAUTHENTICATED`, translated to 401 below); there is no separate
 * agent credential. The actor `runAgentTurn` resolves here is the same
 * `ActorContext` every tool call in the turn executes as (ADR-017).
 */

type ChatRequestBody = {
  message: string;
  history?: ChatMessage[];
};

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }).strict()).max(20).optional(),
}).strict();

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  return chatRequestSchema.safeParse(value).success;
}

export async function POST(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireActor();
  } catch {
    return NextResponse.json(
      { ok: false, code: "E_FORBIDDEN", message: "Sign in to use the assistant.", retryable: false },
      { status: 401 },
    );
  }

  try { await limitActorRequests(actor.tenantId, actor.userId, "chat"); }
  catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json(toActionFailure(error), {
      status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) },
    });
    throw error;
  }
  const body = await readBoundedJson(request, 96 * 1024).catch(() => null);
  if (!isChatRequestBody(body)) {
    return NextResponse.json(
      { ok: false, code: "E_VALIDATION", message: "E_VALIDATION: expected { message: string, history?: ChatMessage[] }", retryable: false },
      { status: 400 },
    );
  }

  try {
    const result = await runAgentTurn(actor, body.history ?? [], body.message);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    if (err instanceof AgentNotConfiguredError) {
      return NextResponse.json(
        { ok: false, code: "E_UNKNOWN", message: err.message, retryable: false },
        { status: 503 },
      );
    }
    return NextResponse.json(toActionFailure(err), { status: 500 });
  }
}
