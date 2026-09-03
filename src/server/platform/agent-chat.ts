import "server-only";
import { withTenant } from "./tenancy";
import { buildToolManifest, type ToolDescriptor } from "./tool-manifest";
import { getCommand, type ActorContext } from "./command";
import { getQuery, executeQuery } from "./query";
import { GroundingCache } from "./grounding";
import { readAgentProviderConfig } from "./config";
import { runCommandBatch } from "./batch";

/**
 * Agent chat orchestrator — Task 84 area 6.
 *
 * Authority: `taskplans/84_verity_ai_agent_system.md` area 6, ADR-017. This
 * file is the only place that talks to an LLM provider; nothing else in
 * `src/server/platform/` knows one exists.
 *
 * THE LOOP EXECUTES EVERY TOOL AS THE CALLING HUMAN'S OWN `ActorContext`
 * (ADR-017) — `channel: "agent"` is passed to `executeCommand`/
 * `executeQuery` for audit provenance only, exactly like every other
 * channel, and is consulted by no authorization decision. `assertGrounded`
 * (Task 84 area 4) is the one place the channel changes behaviour, and that
 * is a restriction, never an added authority.
 *
 * ONE `GroundingCache` PER TURN, owned here and never reused across turns —
 * a stale grounding fact from a previous conversation must not authorize a
 * write in this one.
 *
 * PROVIDER: Groq's OpenAI-compatible chat-completions endpoint, reusing the
 * `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL` already in `.env` for a
 * different feature. No SDK dependency added — the OpenAI tool-calling
 * wire format is a handful of fields over plain `fetch`, and adding a
 * package for that would be the "single-implementation interface" the
 * project's own default engineering guidance warns against.
 */

const MAX_TOOL_ITERATIONS = 8;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ToolCallRecord = {
  key: string;
  kind: "command" | "query";
  input: unknown;
  ok: boolean;
  /** Result on success, or the failure message on error — never thrown past
   *  this module, since one failed tool call should not end the turn. */
  output: unknown;
};

export type AgentTurnResult = {
  reply: string;
  toolCalls: ToolCallRecord[];
};

export class AgentNotConfiguredError extends Error {
  readonly code = "E_AGENT_NOT_CONFIGURED" as const;
  constructor() {
    super("E_AGENT_NOT_CONFIGURED: no chat provider is configured for this deployment");
    this.name = "AgentNotConfiguredError";
  }
}

/** OpenAI tool names may not contain `.`; command/query keys always do
 *  (`verity.party.suspend`). Reversible, collision-free substitution. */
function toToolName(key: string): string {
  return key.replaceAll(".", "__");
}
function fromToolName(name: string): string {
  return name.replaceAll("__", ".");
}

function toOpenAiTool(tool: ToolDescriptor) {
  return {
    type: "function" as const,
    function: {
      name: toToolName(tool.key),
      description:
        `[${tool.kind}] ${tool.description ?? tool.key}` +
        (tool.impact === "destructive" ? " (destructive)" : ""),
      parameters: tool.inputSchema,
    },
  };
}

const SYSTEM_PROMPT = `You are Verity's operating assistant. You act with the same
permissions as the person you are helping — never more, never less. Rules:

1. Query before you claim. Before creating or updating anything, call a query
   tool to find the real ID. Never invent, guess, or reuse an ID from outside
   this conversation — the platform will reject it (E_UNGROUNDED) and you will
   have to query and retry.
2. A tool marked (destructive) will NOT run when you call it — it always
   comes back "needs_approval". That is not a bug: tell the user plainly
   what it would do and that they need to do it themselves in the app for
   now. Do not retry a destructive call expecting a different result.
3. If a tool call fails, read the error and decide whether to retry with
   corrected input or explain the failure to the user. Do not retry blindly.
4. Keep answers short and in the platform's own terminology (Work, Party,
   Organization, Resource — never "job", "client", "employee").`;

type OpenAiToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
};

async function callProvider(
  messages: OpenAiMessage[],
  tools: ReturnType<typeof toOpenAiTool>[],
): Promise<{ message: OpenAiMessage }> {
  const config = readAgentProviderConfig();
  if (!config) throw new AgentNotConfiguredError();

  const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`E_AGENT_PROVIDER: ${res.status} ${res.statusText} ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: OpenAiMessage }>;
  };
  const message = json.choices[0]?.message;
  if (!message) throw new Error("E_AGENT_PROVIDER: no choice returned");
  return { message };
}

async function runTool(
  actor: ActorContext,
  grounding: GroundingCache,
  name: string,
  rawArgs: string,
): Promise<ToolCallRecord> {
  const key = fromToolName(name);
  let input: unknown;
  try {
    input = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { key, kind: "command", input: rawArgs, ok: false, output: "E_VALIDATION: tool call arguments were not valid JSON" };
  }

  const command = getCommand(key);
  if (command) {
    // Task 91's batch runner, single-item. Not batching for its own sake —
    // reusing it here is what makes a destructive command's gate ("never
    // auto-executed, always needs_approval until a real confirm UI exists")
    // one piece of logic instead of a second copy inside the chat loop.
    const batch = await runCommandBatch(actor, command, [input], { channel: "agent", grounding });
    const outcome = batch.items[0].outcome;
    if (outcome.status === "succeeded") {
      return { key, kind: "command", input, ok: true, output: outcome.result };
    }
    return { key, kind: "command", input, ok: false, output: outcome.reason };
  }

  const query = getQuery(key);
  if (query) {
    try {
      const result = await executeQuery(actor, query, input, "agent", grounding);
      return { key, kind: "query", input, ok: true, output: result };
    } catch (err) {
      return { key, kind: "query", input, ok: false, output: err instanceof Error ? err.message : String(err) };
    }
  }

  return { key, kind: "command", input, ok: false, output: `E_UNKNOWN_TOOL: ${key} is not a registered command or query` };
}

/**
 * Runs one full agent turn: the user's message, any number of tool-call
 * round trips (capped), and the final assistant reply. Everything the model
 * touches is scoped to `actor` — the manifest, every command, every query.
 */
export async function runAgentTurn(
  actor: ActorContext,
  history: ChatMessage[],
  userMessage: string,
): Promise<AgentTurnResult> {
  const manifest = await withTenant(actor.tenantId, (tx) => buildToolManifest(tx, actor));
  const tools = manifest.map(toOpenAiTool);
  const grounding = new GroundingCache();

  const messages: OpenAiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content }) satisfies OpenAiMessage),
    { role: "user", content: userMessage },
  ];

  const toolCalls: ToolCallRecord[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const { message } = await callProvider(messages, tools);
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: message.content ?? "", toolCalls };
    }

    for (const call of message.tool_calls) {
      const record = await runTool(actor, grounding, call.function.name, call.function.arguments);
      toolCalls.push(record);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(record.ok ? record.output : { error: record.output }),
      });
    }
  }

  return {
    reply: "I reached the tool-call limit for this turn without a final answer. Please rephrase or narrow the request.",
    toolCalls,
  };
}
