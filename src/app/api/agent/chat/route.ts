import { installCapabilities } from "@/server/capabilities/registry";
import { installAdministration } from "@/server/platform/administration";
import { limitActorRequests, RateLimitError, readBoundedJson } from "@/server/platform/request-limits";
import { z } from "zod";
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

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }).strict()).max(20).optional(),
}).strict();

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  return chatRequestSchema.safeParse(value).success;
}

/** Task 81 rule 8 step 3 — the structural "Confirm" click on a preview
 *  the dock rendered. Executes the EXACT inputs previously shown, never
 *  re-derived from the model. */
type ConfirmPreviewBody = {
  confirmPreview: { commandKey: string; inputs: unknown[] };
};

const confirmPreviewSchema = z.object({
  confirmPreview: z.object({ commandKey: z.string().min(1).max(200), inputs: z.array(z.unknown()).min(1).max(50) }).strict(),
}).strict();

function isConfirmPreviewBody(value: unknown): value is ConfirmPreviewBody {
  return confirmPreviewSchema.safeParse(value).success;
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
  installCapabilities();
  installAdministration();
  const body = await readBoundedJson(request, 96 * 1024).catch(() => null);

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
