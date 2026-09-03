import { executeCommand, type ActorContext, type CommandDefinition } from "./command";
import type { PolicyChannel } from "./policy";
import type { GroundingCache } from "./grounding";
import { toActionFailure } from "./action-error";

/**
 * Bulk operations & partial-failure UX — Task 91.
 *
 * Authority: `taskplans/91_bulk_operations_and_partial_failure.md`. Trigger
 * fired 2026-09-04: Task 84's agent (`agent-chat.ts`) issues multiple
 * commands in one turn, which is exactly the case this file's scope names
 * first.
 *
 * NOT a change to `executeCommand`'s one-transaction-per-command guarantee
 * (this file's own non-goal). Each item below still runs through the
 * ordinary pipeline in its own transaction; this only sequences N such calls
 * and reports what happened to EACH one, instead of collapsing N outcomes
 * into a single pass/fail for the batch. A caller building a bulk-select UI
 * or Task 87's import gets the same shape this gives the agent — one
 * "batch result," not a third bespoke reporting format.
 */

export type BatchOutcome<TResult> =
  | { status: "succeeded"; result: TResult }
  | { status: "failed"; reason: string; code: string }
  /** A destructive command (`CommandDefinition.impact === "destructive"`)
   *  that this batch declined to run without prior confirmation. Never
   *  executed — see `runCommandBatch`'s `confirmed` option. */
  | { status: "needs_approval"; reason: string };

export type BatchItemResult<TResult> = { index: number; outcome: BatchOutcome<TResult> };

export type BatchResult<TResult> = {
  total: number;
  succeeded: number;
  failed: number;
  needsApproval: number;
  items: BatchItemResult<TResult>[];
};

/**
 * Runs `def` once per entry in `inputs`, as `actor`, reporting each outcome
 * individually. Item N's failure never rolls back or blocks item N+1 — each
 * already has its own transaction via `executeCommand`.
 *
 * `confirmed` gates destructive commands: when false (the default — safe by
 * default), a destructive command is never executed and is reported
 * `needs_approval` instead. There is no confirm-then-execute round trip
 * built here; a caller that has its own confirmation UI (Task 81 rule 4/4a)
 * passes `confirmed: true` once the human has actually confirmed. The Task
 * 84 chat surface does not have that UI yet, so it always passes the
 * default and a destructive tool call is always deferred to the human
 * rather than guessed at — see `agent-chat.ts`.
 */
export async function runCommandBatch<TInput, TResult>(
  actor: ActorContext,
  def: CommandDefinition<TInput, TResult>,
  inputs: TInput[],
  options: {
    channel?: PolicyChannel;
    grounding?: GroundingCache;
    confirmed?: boolean;
  } = {},
): Promise<BatchResult<TResult>> {
  const items: BatchItemResult<TResult>[] = [];
  let succeeded = 0;
  let failed = 0;
  let needsApproval = 0;

  for (let index = 0; index < inputs.length; index++) {
    if (def.impact === "destructive" && !options.confirmed) {
      needsApproval++;
      items.push({
        index,
        outcome: {
          status: "needs_approval",
          reason: `${def.key} is destructive and this batch was not confirmed`,
        },
      });
      continue;
    }

    try {
      const result = await executeCommand(actor, def, inputs[index], options.channel, options.grounding);
      succeeded++;
      items.push({ index, outcome: { status: "succeeded", result } });
    } catch (err) {
      failed++;
      const failure = toActionFailure(err);
      items.push({ index, outcome: { status: "failed", reason: failure.message, code: failure.code } });
    }
  }

  return { total: inputs.length, succeeded, failed, needsApproval, items };
}
