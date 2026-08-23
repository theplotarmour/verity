"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ForbiddenError } from "@/server/platform/authorization";
import { CapabilityError } from "@/server/platform/capability";
import { ValidationError, executeCommand, getCommand } from "@/server/platform/command";
import { ConflictError, CustomFieldValidationError } from "@/server/platform/entity";
import { executeQuery, getQuery } from "@/server/platform/query";
import {
  createSupabaseServerClient,
  listMemberships,
  requireActor,
  resolveActor,
  setActiveMembership,
} from "@/server/platform/auth";
import { recordSecurityEvent } from "@/server/platform/audit";
import { withTenant } from "@/server/platform/tenancy";
import { installCapabilities } from "@/server/capabilities/registry";

/**
 * The bridge between the interface and the platform.
 *
 * Authority: MET-ACT-001→004 (an Action is the exclusive mechanism for
 * mutation), implementation/13-conformance (no direct database mutation outside
 * a command).
 *
 * Everything the interface does passes through here. Components never touch
 * Prisma, never construct an ActorContext, and never name a tenant — the actor
 * is resolved server-side from the verified session on every call, so a client
 * cannot widen its own scope by asking.
 *
 * Errors are translated into a serialisable shape rather than thrown across the
 * boundary. A thrown error would reach the client as an opaque digest in
 * production, which tells the user nothing about whether their action completed
 * or whether retrying is safe.
 */

export type ActionFailure = {
  ok: false;
  code: "E_FORBIDDEN" | "E_VALIDATION" | "E_CONFLICT" | "E_CAPABILITY_INACTIVE" | "E_UNKNOWN";
  message: string;
  issues?: string[];
  /** Whether repeating the call could succeed without the user changing anything. */
  retryable: boolean;
};

export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

function toFailure(error: unknown): ActionFailure {
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
  if (error instanceof ConflictError) {
    // Someone else changed the record; reloading and retrying can succeed.
    return { ok: false, code: "E_CONFLICT", message: error.message, retryable: true };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, code: "E_UNKNOWN", message, retryable: false };
}

/** Runs a registered command as the authenticated actor. */
export async function runCommand<T = unknown>(
  key: string,
  input: unknown,
  revalidate?: string,
): Promise<ActionResult<T>> {
  installCapabilities();
  try {
    const definition = getCommand(key);
    if (!definition) throw new Error(`Unknown command: ${key}`);

    const actor = await requireActor();
    const data = (await executeCommand(actor, definition, input)) as T;

    if (revalidate) revalidatePath(revalidate);
    return { ok: true, data };
  } catch (error) {
    return toFailure(error);
  }
}

/** Runs a registered query as the authenticated actor. */
export async function runQuery<T = unknown>(key: string, input: unknown): Promise<ActionResult<T>> {
  installCapabilities();
  try {
    const definition = getQuery(key);
    if (!definition) throw new Error(`Unknown query: ${key}`);

    const actor = await requireActor();
    const data = (await executeQuery(actor, definition, input)) as T;
    return { ok: true, data };
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * Switches the active organization context.
 *
 * The membership is re-verified against the authenticated user before it is
 * accepted, so this cannot be used to enter a tenant the user does not belong
 * to (PLA-TEN-006, PLA-IDE-003/004).
 */
export async function switchOrganization(membershipId: string): Promise<ActionResult<null>> {
  try {
    const available = await listMemberships();
    if (!available.some((m) => m.membershipId === membershipId)) {
      return {
        ok: false,
        code: "E_FORBIDDEN",
        message: "E_FORBIDDEN: that organization is not one of your memberships",
        retryable: false,
      };
    }
    await setActiveMembership(membershipId);

    // Changing operating context changes what the actor can reach, so it
    // belongs in the security stream rather than the operational one.
    const chosen = available.find((m) => m.membershipId === membershipId)!;
    await withTenant(chosen.tenantId, (tx) =>
      recordSecurityEvent(tx, {
        tenantId: chosen.tenantId,
        eventType: "RoleAssigned",
        actorUserId: chosen.userId,
        payload: { organizationId: chosen.organizationId, role: chosen.roleName ?? null },
      }),
    );

    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (error) {
    return toFailure(error);
  }
}

export async function signInWithPassword(email: string, password: string): Promise<ActionFailure | never> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // A failed attempt is recorded where it can be: before authentication there
    // is no tenant context, so the security stream — which is tenant-scoped by
    // design — cannot hold it. Recording it against a guessed tenant would be
    // worse than not recording it, so this is deliberately left to the auth
    // provider's own log and noted as a platform gap.
    return {
      ok: false,
      code: "E_VALIDATION",
      // Deliberately not distinguishing "no such user" from "wrong password":
      // that difference is an account-enumeration oracle.
      message: "Those credentials were not accepted.",
      retryable: true,
    };
  }

  // A successful sign-in *does* have a tenant, once the actor resolves.
  await recordAuthSuccess();
  redirect("/");
}

/**
 * Records a successful authentication against the security stream (EXE-AUD-002).
 *
 * Best-effort by design: the sign-in has already succeeded, and failing to write
 * an audit row must not lock the user out of a session they legitimately hold.
 * The failure is surfaced rather than swallowed silently.
 */
async function recordAuthSuccess(): Promise<void> {
  try {
    const actor = await resolveActor();
    if (!actor) return;
    await withTenant(actor.tenantId, (tx) =>
      recordSecurityEvent(tx, {
        tenantId: actor.tenantId,
        eventType: "AuthSuccess",
        actorUserId: actor.userId,
      }),
    );
  } catch (error) {
    console.error("Failed to record AuthSuccess security event", error);
  }
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
