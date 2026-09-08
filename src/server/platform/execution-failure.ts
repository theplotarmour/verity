import type { ActorContext } from "./command";
import { ForbiddenError } from "./authorization";
import { recordSecurityEvent } from "./audit";
import { withTenant } from "./tenancy";
import { captureError, increment } from "./observability";

/** Called after rollback; writing inside the refused transaction would erase it. */
export async function recordExecutionFailure(error: unknown, actor: ActorContext,
  commandKey: string, correlationId?: string) {
  if (!(error instanceof ForbiddenError)) return;
  increment("authorization_denied_total");
  try {
    await withTenant(actor.tenantId, (tx) => recordSecurityEvent(tx, {
      tenantId: actor.tenantId, actorUserId: actor.userId, eventType: "AuthorizationDenied",
      correlationId, payload: { commandKey, code: "E_FORBIDDEN" },
    }));
  } catch (auditError) { captureError(auditError, { route: "record_authorization_denied" }); }
}
