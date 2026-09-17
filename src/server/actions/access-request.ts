"use server";

import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasTenantPermission } from "@/server/platform/authorization";
import { ENTITY_TENANT } from "@/server/platform/administration";
import { notify } from "@/server/platform/notification";
import { toActionFailure, type ActionResult } from "@/server/platform/action-error";

/**
 * "Request access" — Task 114 P1.5 item 9. A self-service action in the same
 * spirit as `changeOwnPassword` (`src/server/actions/account.ts`): it acts on
 * behalf of its own caller and needs no entity/verb grant of its own, so it
 * sits outside the platform Command registry rather than inventing a new
 * `verity.platform.access_request` entity and the permission grant that
 * would have to be seeded onto every role for a person who, by definition,
 * lacks grants to reach this action in the first place.
 *
 * Recipients are every tenant member whose role holds `Edit` on the tenant —
 * the exact set `/settings`'s "Advanced configuration" link and the sidebar's
 * Configuration nav entry already gate on. No new "admin" concept, no new
 * table: this reuses the existing notification substrate (`notification.ts`)
 * and writes nothing new to the database — a request is a notification, not
 * a stored, actionable ticket. Building the latter (approve/deny, an
 * audit trail of who asked for what) is real scope beyond "tell an admin
 * someone got denied," left for whoever picks up a fuller version.
 */
export async function requestAccess(path: string, reason: string): Promise<ActionResult<{ notified: number }>> {
  try {
    const actor = await requireActor();

    const notified = await withTenant(actor.tenantId, async (tx) => {
      const memberships = await tx.tenantMembership.findMany({
        where: { tenantId: actor.tenantId, roleId: { not: null } },
        select: { userId: true, roleId: true },
      });

      const roleIds = [...new Set(memberships.map((m) => m.roleId!))];
      const permittedRoleIds = new Set<string>();
      for (const roleId of roleIds) {
        if (await hasTenantPermission(tx, roleId, "Edit", ENTITY_TENANT)) permittedRoleIds.add(roleId);
      }

      const recipientIds = [
        ...new Set(
          memberships
            .filter((m) => permittedRoleIds.has(m.roleId!) && m.userId !== actor.userId)
            .map((m) => m.userId),
        ),
      ];
      if (recipientIds.length === 0) return 0;

      const requester = await tx.user.findUniqueOrThrow({
        where: { id: actor.userId },
        include: { party: true },
      });

      const { created } = await notify(tx, {
        tenantId: actor.tenantId,
        recipientIds,
        key: "verity.platform.access_requested",
        variables: {
          requester: requester.party.displayName,
          path,
          reason: reason.trim() || "No reason given",
        },
        fallback: {
          subject: `${requester.party.displayName} requested access`,
          body: `${requester.party.displayName} was denied access to ${path}. Reason: ${reason.trim() || "No reason given"}`,
        },
      });
      return created;
    });

    return { ok: true, data: { notified } };
  } catch (error) {
    return toActionFailure(error);
  }
}
