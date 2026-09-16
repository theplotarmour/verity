import type { ActorContext } from "./command";
import { ForbiddenError } from "./authorization";
import { CapabilityError } from "./capability";
import { recordSecurityEvent } from "./audit";
import { withTenant } from "./tenancy";
import { captureError, increment } from "./observability";

/** Called after rollback; writing inside the refused transaction would erase it. */
export async function recordExecutionFailure(error: unknown, actor: ActorContext,
  commandKey: string, correlationId?: string) {
  if (!(error instanceof ForbiddenError) && !(error instanceof CapabilityError)) return;
  increment("authorization_denied_total");
  try {
    await withTenant(actor.tenantId, (tx) => recordSecurityEvent(tx, {
      tenantId: actor.tenantId, actorUserId: actor.userId, eventType: "AuthorizationDenied",
      correlationId,
      payload: {
        surface: commandKey,
        code: error instanceof CapabilityError ? error.code : "E_FORBIDDEN",
      },
    }));
  } catch (auditError) { captureError(auditError, { route: "record_authorization_denied" }); }
}

/** Records a non-human capability denial such as scheduler execution. */
export async function recordCapabilityDenial(
  error: unknown,
  tenantId: string,
  surface: string,
): Promise<void> {
  if (!(error instanceof CapabilityError)) return;
  increment("authorization_denied_total");
  try {
    await withTenant(tenantId, (tx) => recordSecurityEvent(tx, {
      tenantId,
      eventType: "AuthorizationDenied",
      payload: { surface, code: error.code },
    }));
  } catch (auditError) {
    captureError(auditError, { route: "record_capability_denied" });
  }
}
