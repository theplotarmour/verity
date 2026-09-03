import "server-only";
import { ForbiddenError } from "./authorization";
import { CapabilityError } from "./capability";
import { ValidationError } from "./command";
import { ConflictError, CustomFieldValidationError } from "./entity";
import { GroundingError } from "./grounding";

/**
 * The serialisable shape an interface receives when a platform call fails.
 *
 * Lives here rather than beside the server actions because a "use server" module
 * may only export async functions, and both the tenant bridge and the HQ bridge
 * need this translation. One copy, so the two cannot drift into telling users
 * different things about the same error.
 *
 * A thrown error would reach the client as an opaque digest in production, which
 * tells the user nothing about whether their action completed or whether
 * retrying is safe. That is what the retryable flag is for.
 */

export type ActionFailure = {
  ok: false;
  code:
    | "E_FORBIDDEN"
    | "E_VALIDATION"
    | "E_CONFLICT"
    | "E_CAPABILITY_INACTIVE"
    | "E_UNGROUNDED"
    | "E_UNKNOWN";
  message: string;
  issues?: string[];
  /** Whether repeating the call could succeed without the user changing anything. */
  retryable: boolean;
};

export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

/**
 * Translates a thrown platform error into the serialisable failure shape.
 *
 * Exported so the HQ bridge shares one translation rather than growing a
 * second, subtly different one — the two would drift, and the first symptom
 * would be an operator told "something went wrong" for an error a tenant user
 * is told the details of.
 */
export function toActionFailure(error: unknown): ActionFailure {
  if (error instanceof ForbiddenError) {
    return { ok: false, code: "E_FORBIDDEN", message: error.message, retryable: false };
  }
  if (error instanceof CapabilityError) {
    return { ok: false, code: "E_CAPABILITY_INACTIVE", message: error.message, retryable: false };
  }
  if (error instanceof CustomFieldValidationError) {
    return { ok: false, code: "E_VALIDATION", message: error.message, issues: error.issues, retryable: false };
  }
  if (error instanceof ValidationError) {
    return { ok: false, code: "E_VALIDATION", message: error.message, issues: error.issues, retryable: false };
  }
  if (error instanceof GroundingError) {
    // Retryable: the agent can query the entity and try again in the same
    // conversation, unlike a genuine validation failure.
    return { ok: false, code: "E_UNGROUNDED", message: error.message, issues: error.fields, retryable: true };
  }
  if (error instanceof ConflictError) {
    // Someone else changed the record; reloading and retrying can succeed.
    return { ok: false, code: "E_CONFLICT", message: error.message, retryable: true };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, code: "E_UNKNOWN", message, retryable: false };
}

