"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/server/session-user";
import { WARNINGS_QUEUE_LIMIT } from "@/lib/notifications";

/**
 * Notification read state.
 *
 * Nothing in this codebase had ever written `Notification.read`. The bell in the
 * owner shell counts unread for its badge, so that badge could only ever grow —
 * the QC and stage-hold alerts made that worse, because they are the first alerts
 * that fire on their own rather than in response to something the reader did.
 *
 * `read` is a boolean, not a status enum. The PRD called for `status: UNREAD` and
 * `READ`; the schema has had a boolean since the table was created and there is no
 * reason to migrate a working column to say the same thing.
 */

/**
 * The factory's unread notifications, newest first.
 *
 * Scoped by factory rather than by user, which is deliberate and worth being
 * explicit about: this is the owner's floor-wide warnings queue, so an alert that
 * went to a supervisor still belongs on it. The cost is that it also surfaces
 * personally-addressed messages ("your inspection was approved"), and that
 * dismissing one clears the unread flag for whoever it was addressed to. It does
 * not delete anything — the recipient's bell still lists the message, it simply
 * stops counting toward their badge.
 */
export async function listUnreadWarnings(limit = WARNINGS_QUEUE_LIMIT) {
  const session = await getActiveSessionUser();
  if (!session) return [];

  return prisma.notification.findMany({
    where: { factoryId: session.factoryId, read: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      linkUrl: true,
      createdAt: true,
    },
  });
}

/**
 * Mark one notification read.
 *
 * `updateMany` with the factory in the filter, not `update` by id: `update` would
 * throw on a foreign id, and the throw itself confirms the row exists. This
 * touches nothing and reports nothing when the id belongs to another tenant.
 */
export async function dismissNotification(notificationId: string) {
  const session = await getActiveSessionUser();
  if (!session) return { error: "Unauthorized" };

  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, factoryId: session.factoryId },
    data: { read: true },
  });
  if (count === 0) return { error: "Notification not found" };

  revalidatePath("/owner/dashboard");
  return { success: true };
}

/** Clear the whole queue. One round trip rather than ten. */
export async function dismissAllNotifications() {
  const session = await getActiveSessionUser();
  if (!session) return { error: "Unauthorized" };

  const { count } = await prisma.notification.updateMany({
    where: { factoryId: session.factoryId, read: false },
    data: { read: true },
  });

  revalidatePath("/owner/dashboard");
  return { success: true, dismissed: count };
}
