"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, enterClient } from "@/server/platform/operator";

/**
 * HQ operator actions.
 *
 * Thin by design. Every one of these delegates to `src/server/platform/operator.ts`,
 * which performs the authorization check, the audit write and the scope
 * handling. An action that did any of that itself would be a second security
 * path, and ADR-013 exists precisely to keep there being one.
 *
 * `FormData` in, plain result out — the actor is never read from the payload
 * (PLA-TEN-006). A caller who forged a tenant id in a form field would be
 * ignored, because no function below takes an actor from its input.
 */

export type HqActionResult = { ok: true } | { ok: false; message: string };

function message(error: unknown): string {
  if (error instanceof Error) {
    // E_FORBIDDEN and E_VALIDATION are safe to surface; anything else is an
    // internal failure and its text is not the operator's business.
    if (error.message.startsWith("E_FORBIDDEN")) return "You do not have operator authority.";
    if (error.message.startsWith("E_VALIDATION")) return error.message.replace("E_VALIDATION: ", "");
  }
  return "Something went wrong. The action was not applied.";
}

export async function createClientAction(
  _prev: HqActionResult | null,
  form: FormData,
): Promise<HqActionResult> {
  try {
    await createClient({
      name: String(form.get("name") ?? ""),
      timeZone: (form.get("timeZone") as string) || null,
    });
  } catch (error) {
    return { ok: false, message: message(error) };
  }

  revalidatePath("/hq/clients");
  revalidatePath("/hq");
  return { ok: true };
}

/**
 * Enters a client and lands in that client's workspace.
 *
 * The redirect is the point: entering a client is a context change, and leaving
 * the operator on an HQ page afterwards would leave them unsure which tenant
 * their next click applies to.
 */
export async function enterClientAction(form: FormData): Promise<void> {
  const tenantId = String(form.get("tenantId") ?? "");
  if (!tenantId) return;
  await enterClient(tenantId);
  redirect("/");
}
