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
  setActiveMembership,
} from "@/server/platform/auth";
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
    return {
      ok: false,
      code: "E_VALIDATION",
      // Deliberately not distinguishing "no such user" from "wrong password":
      // that difference is an account-enumeration oracle.
      message: "Those credentials were not accepted.",
      retryable: true,
    };
  }
  redirect("/");
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
