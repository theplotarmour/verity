"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import { hashPin } from "@/lib/server/hash";
import { phoneKey } from "@/lib/phone";
import { systemRoleId } from "@/platform/tenancy/provision";
import { createWithDocNumber, formatDocNumber } from "@/lib/server/numbering";
import { randomInt } from "node:crypto";

/**
 * Launching an outlet.
 *
 * A franchise network is **one** workspace with many outlets, not one workspace
 * per outlet. That distinction is the whole reason the network dashboard, the
 * outlet scorecard and the price audit can exist: they compare outlets against
 * each other, which is impossible if each one is a separate tenant that cannot
 * see its siblings.
 *
 * So this creates a Site inside the caller's own workspace and seeds what a new
 * outlet needs to start trading on day one — a manager who can sign in, and the
 * standard checklists already attached. Provisioning a fresh tenant per store
 * would give fifty stores fifty logins, fifty dashboards and no network view at
 * all.
 */

function generatePin(): string {
  return String(randomInt(1000, 10000));
}

export interface LaunchOutletInput {
  name: string;
  city?: string;
  state?: string;
  address?: string;
  /** Optional: creates a manager account for the outlet and returns its PIN once. */
  manager?: { name: string; phone: string };
}

export async function launchOutlet(input: LaunchOutletInput) {
  await guardModuleWrite("sites");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!(await canUser(user, "MANAGE_TEAM"))) {
    return { error: "You do not have permission to launch an outlet." };
  }

  const name = input.name?.trim();
  if (!name) return { error: "Give the outlet a name." };

  const factoryId = user.factoryId;

  // Phone is the platform-wide username, so a clash has to be caught before
  // anything is created — half a launched outlet is worse than none.
  let managerPhone: string | null = null;
  if (input.manager?.name?.trim() || input.manager?.phone?.trim()) {
    const phone = phoneKey(input.manager?.phone ?? "");
    if (!input.manager?.name?.trim()) return { error: "Give the outlet manager a name." };
    if (phone.length < 10) return { error: "Enter a valid 10-digit manager phone number." };

    const clash = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (clash) return { error: "That phone number already has an account." };
    managerPhone = phone;
  }

  const existing = await prisma.site.count({ where: { factoryId } });
  const pin = managerPhone ? generatePin() : null;

  // Roles hang off the Organization, not the Factory. Both are cuid strings, so
  // passing the wrong one typechecks cleanly and silently creates a user with a
  // null role — an account that can sign in and then see nothing.
  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: { organizationId: true },
  });
  if (!factory) return { error: "Workspace not found." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const site = await createWithDocNumber(
        (attempt) => formatDocNumber("SITE", existing + 1 + attempt, 4),
        (siteCode) =>
          tx.site.create({
            data: {
              factoryId,
              siteCode,
              name,
              city: input.city?.trim() || null,
              state: input.state?.trim() || null,
              address: input.address?.trim() || null,
              status: "ACTIVE",
            },
            select: { id: true, siteCode: true },
          }),
      );

      let managerId: string | null = null;
      if (managerPhone && pin) {
        // STORE_MANAGER, not MANAGER: an outlet manager runs their own outlet,
        // and the role already exists with exactly that scope.
        const manager = await tx.user.create({
          data: {
            factoryId,
            name: input.manager!.name.trim(),
            phone: managerPhone,
            role: "STORE_MANAGER",
            roleId: await systemRoleId(factory.organizationId, "STORE_MANAGER", tx),
            pinHash: hashPin(pin, factoryId),
            isActive: true,
            createdById: user.id,
          },
          select: { id: true },
        });
        managerId = manager.id;

        await tx.site.update({
          where: { id: site.id },
          data: { managerUserId: manager.id },
        });
      }

      return { siteId: site.id, siteCode: site.siteCode, managerId };
    });

    await prisma.auditLog.create({
      data: {
        factoryId,
        actorUserId: user.id,
        action: `Launched outlet ${name} (${result.siteCode})`,
        entityType: "Site",
        entityId: result.siteId,
        metadata: { siteCode: result.siteCode },
      },
    });

    revalidatePath("/owner/sites");
    revalidatePath("/owner/dashboard");

    return {
      success: true,
      siteId: result.siteId,
      siteCode: result.siteCode,
      // Shown once, same rule as every other credential in this system.
      credentials:
        managerPhone && pin
          ? { name: input.manager!.name.trim(), phone: managerPhone, pin }
          : null,
    };
  } catch (error) {
    console.error("[launchOutlet]", error);
    return { error: "Could not launch that outlet." };
  }
}

/**
 * The checklists a new outlet is expected to run.
 *
 * Returned rather than auto-attached: templates are per-department in this
 * schema, and silently wiring a new outlet to every active template would give
 * a QSR outlet the vehicle-upholstery QC list. Showing the operator what exists
 * and letting them confirm is the honest version until franchises tell us what
 * "standard" means for them.
 */
export async function getOutletLaunchOptions() {
  await guardModuleAction("sites");
  const user = await getOwnerUser();
  if (!user) return { templates: [], shifts: [] };

  const [templates, shifts] = await Promise.all([
    prisma.checklistTemplate.findMany({
      where: { factoryId: user.factoryId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.shift.findMany({
      where: { factoryId: user.factoryId },
      select: { id: true, name: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return { templates, shifts };
}
