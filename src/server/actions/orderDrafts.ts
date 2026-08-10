"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";

/**
 * In-progress forms, kept so a shift change does not cost the work.
 *
 * Order taking is a long form filled between interruptions — a call, a walk-in,
 * the end of a shift. A refresh emptied it, so the habit became entering orders
 * from paper in one sitting and treating the paper as the real record.
 *
 * A draft is deliberately *not* a partial SalesOrder. It has no order number,
 * passes no validation, and must never reach a list of orders or a count of
 * work; modelling it as a nullable-everything SalesOrder is how a half-typed
 * quote ends up on a production floor.
 *
 * Every export here is a public POST endpoint. Each one resolves the session
 * itself and scopes to that session's factory — no draft id, kind or factoryId
 * from the client is ever trusted to choose whose row is read or written.
 */

/**
 * Which form a draft belongs to. A closed set rather than a free string: the
 * client names the kind, and an unchecked value would let one caller read or
 * overwrite a draft belonging to a different screen.
 */
export const ORDER_DRAFT_KINDS = ["ORDER_TAKING", "PRODUCTION_STUDIO"] as const;
export type OrderDraftKind = (typeof ORDER_DRAFT_KINDS)[number];

function assertKind(kind: string): OrderDraftKind {
  if (!(ORDER_DRAFT_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unknown draft kind: ${kind}`);
  }
  return kind as OrderDraftKind;
}

/**
 * A payload big enough to be a mistake rather than a form.
 *
 * The column is JSONB with no length limit, and this is an authenticated write
 * with no other cap on it — one runaway autosave loop should not be able to
 * fill a tenant's storage. 256 KB is far past any real order form.
 */
const MAX_PAYLOAD_BYTES = 256 * 1024;

export interface OrderDraftSnapshot {
  payload: unknown;
  updatedAt: Date;
}

/** The caller's own draft for one form, or null when there is nothing saved. */
export async function loadOrderDraft(kind: string): Promise<OrderDraftSnapshot | null> {
  const user = await getOwnerUser();
  const draft = await prisma.orderDraft.findFirst({
    // userId AND factoryId: the unique key is on the user, but a user whose
    // factory changed must not resume a draft written under the old tenant.
    where: { userId: user.id, factoryId: user.factoryId, kind: assertKind(kind) },
    select: { payload: true, updatedAt: true },
  });
  return draft ? { payload: draft.payload, updatedAt: draft.updatedAt } : null;
}

/**
 * Write the caller's draft for one form.
 *
 * An upsert on (userId, kind), so a second tab resumes the same draft rather
 * than opening a rival copy that wins on whichever saves last.
 */
export async function saveOrderDraft(kind: string, payload: unknown) {
  const user = await getOwnerUser();
  const draftKind = assertKind(kind);

  const size = Buffer.byteLength(JSON.stringify(payload ?? null), "utf8");
  if (size > MAX_PAYLOAD_BYTES) {
    return { error: "That form is too large to save as a draft." as const };
  }

  // Prisma's upsert keys on (userId, kind) alone, so factoryId is written on
  // create and refreshed on update rather than being part of the match.
  const data = { payload: payload as never, factoryId: user.factoryId };
  await prisma.orderDraft.upsert({
    where: { userId_kind: { userId: user.id, kind: draftKind } },
    create: { userId: user.id, kind: draftKind, ...data },
    update: data,
  });

  // Deliberately no revalidatePath. A draft is private to the person typing it
  // and appears on no server-rendered list, so busting a route cache on every
  // keystroke-debounced save would be pure cost.
  return { ok: true as const };
}

/**
 * Drop the caller's draft for one form.
 *
 * Called when the order is actually submitted, and from the "discard" control.
 * Without it a resumed draft would outlive the order it became and be offered
 * again the next morning.
 */
export async function discardOrderDraft(kind: string) {
  const user = await getOwnerUser();
  await prisma.orderDraft.deleteMany({
    where: { userId: user.id, factoryId: user.factoryId, kind: assertKind(kind) },
  });
  return { ok: true as const };
}
