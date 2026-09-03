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

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (typeof body.message !== "string" || body.message.trim().length === 0) return false;
  if (body.history !== undefined && !Array.isArray(body.history)) return false;
  return true;
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

  const body: unknown = await request.json().catch(() => null);
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
