import { NextResponse } from "next/server";
import { requireActor } from "@/server/platform/auth";
import {
  runAgentTurn,
  executeConfirmedPreview,
  AgentNotConfiguredError,
  type ChatMessage,
} from "@/server/platform/agent-chat";
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

/** Task 81 rule 8 step 3 — the structural "Confirm" click on a preview
 *  the dock rendered. Executes the EXACT inputs previously shown, never
 *  re-derived from the model. */
type ConfirmPreviewBody = {
  confirmPreview: { commandKey: string; inputs: unknown[] };
};

function isConfirmPreviewBody(value: unknown): value is ConfirmPreviewBody {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  const cp = body.confirmPreview;
  if (!cp || typeof cp !== "object") return false;
  const { commandKey, inputs } = cp as Record<string, unknown>;
  return typeof commandKey === "string" && commandKey.length > 0 && Array.isArray(inputs) && inputs.length > 0;
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

  if (isConfirmPreviewBody(body)) {
    try {
      const result = await executeConfirmedPreview(actor, body.confirmPreview.commandKey, body.confirmPreview.inputs);
      return NextResponse.json({ ok: true, data: result });
    } catch (err) {
      return NextResponse.json(toActionFailure(err), { status: 500 });
    }
  }

  if (!isChatRequestBody(body)) {
    return NextResponse.json(
      {
        ok: false,
        code: "E_VALIDATION",
        message: "E_VALIDATION: expected { message: string, history?: ChatMessage[] } or { confirmPreview }",
        retryable: false,
      },
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
