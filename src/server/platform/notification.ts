import "server-only";
import type { NotificationChannel } from "@prisma/client";
import type { TenantScopedClient } from "./tenancy";

/**
 * Notification substrate.
 *
 * Authority: PLA-CFG-002 (NotificationTemplate as a declarative template),
 * MET-EVE-001→002 (events drive notifications).
 *
 * A capability raises a notification; the platform decides whether and how it
 * reaches someone. Channels, templates and preferences are platform concerns
 * because every capability needs them and none should grow its own.
 *
 * Records are written inside the raising command's transaction, for the same
 * reason events are: a notification about work that rolled back is a lie.
 * Delivery happens afterwards, so a failing mail server cannot roll back the
 * business change that prompted it.
 */

export type NotificationRequest = {
  tenantId: string;
  recipientIds: string[];
  /** Stable key, e.g. `verity.approval.awaiting`. Matches a template. */
  key: string;
  channels?: NotificationChannel[];
  /** Substituted into the template's `{placeholders}`. */
  variables?: Record<string, string>;
  entityKey?: string;
  entityId?: string;
  /** Used when no template exists for the key and channel. */
  fallback?: { subject: string; body: string };
};

/**
 * Literal `{name}` substitution.
 *
 * Deliberately not an expression language. A stored template that can evaluate
 * expressions is a stored program, and tenant-authored programs are a step the
 * specification never asks for and does not weigh the risk of.
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? variables[name]! : whole,
  );
}

/**
 * Whether a recipient wants this notification on this channel.
 *
 * Absence of a preference means yes: a capability that starts notifying should
 * reach people, and requiring opt-in per key would mean nobody hears about
 * anything new. A specific key preference beats the `*` wildcard.
 */
export async function isEnabled(
  tx: TenantScopedClient,
  args: { userId: string; key: string; channel: NotificationChannel },
): Promise<boolean> {
  const preferences = await tx.notificationPreference.findMany({
    where: { userId: args.userId, channel: args.channel, key: { in: [args.key, "*"] } },
  });
  const specific = preferences.find((p) => p.key === args.key);
  if (specific) return specific.enabled;
  const wildcard = preferences.find((p) => p.key === "*");
  return wildcard ? wildcard.enabled : true;
}

/**
 * Raises a notification for each recipient and channel.
 *
 * Suppressed notifications are recorded as Suppressed rather than dropped, so
 * "why was nobody told" is an answerable question instead of an absence.
 */
export async function notify(
  tx: TenantScopedClient,
  request: NotificationRequest,
): Promise<{ created: number; suppressed: number }> {
  const channels = request.channels ?? ["InApp"];
  const variables = request.variables ?? {};

  let created = 0;
  let suppressed = 0;

  for (const channel of channels) {
    const template = await tx.notificationTemplate.findFirst({
      where: { key: request.key, channel },
    });

    const subject = template
      ? renderTemplate(template.subject, variables)
      : (request.fallback?.subject ?? request.key);
    const body = template
      ? renderTemplate(template.body, variables)
      : (request.fallback?.body ?? "");

    for (const recipientId of request.recipientIds) {
      const wanted = await isEnabled(tx, { userId: recipientId, key: request.key, channel });

      await tx.notification.create({
        data: {
          tenantId: request.tenantId,
          recipientId,
          key: request.key,
          channel,
          subject,
          body,
          entityKey: request.entityKey ?? null,
          entityId: request.entityId ?? null,
          status: wanted ? "Pending" : "Suppressed",
        },
      });

      if (wanted) created++;
      else suppressed++;
    }
  }

  return { created, suppressed };
}

/** Unread in-app notifications for the current actor. */
export async function unreadFor(tx: TenantScopedClient, userId: string) {
  return tx.notification.findMany({
    where: { recipientId: userId, channel: "InApp", readAt: null, status: { not: "Suppressed" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markRead(
  tx: TenantScopedClient,
  args: { userId: string; notificationId?: string },
): Promise<number> {
  const { count } = await tx.notification.updateMany({
    // Scoped to the actor: RLS keeps other tenants out, this keeps colleagues out.
    where: {
      recipientId: args.userId,
      readAt: null,
      // Suppressed notifications were never shown, so they cannot be "read".
      // unreadFor already excludes them; marking them here would make the two
      // disagree and inflate the count.
      status: { not: "Suppressed" },
      ...(args.notificationId ? { id: args.notificationId } : {}),
    },
    data: { readAt: new Date() },
  });
  return count;
}

/**
 * Marks pending notifications as sent for a channel.
 *
 * The dispatcher is deliberately not implemented here: actually sending mail or
 * push needs a provider binding that does not exist yet, and a fake sender that
 * marked everything Sent would be worse than an honest Pending queue. This is
 * the seam a real dispatcher plugs into.
 */
export async function markSent(
  tx: TenantScopedClient,
  ids: string[],
  failure?: string,
): Promise<number> {
  const { count } = await tx.notification.updateMany({
    where: { id: { in: ids }, status: "Pending" },
    data: failure
      ? { status: "Failed", failure }
      : { status: "Sent", sentAt: new Date() },
  });
  return count;
}
