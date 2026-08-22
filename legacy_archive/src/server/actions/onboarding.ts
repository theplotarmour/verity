"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardWrite } from "@/platform/modules/guard";
import { enableModules } from "@/platform/modules/entitlements";
import { VERTICAL_PACKS, modulesForPack, type VerticalPackKey } from "@/platform/tenancy/packs";

/**
 * Adopt a vertical pack for the owner's own workspace (R5 apply).
 *
 * This is the write the onboarding wizard's "Use this pack" triggers. It enables
 * the pack's modules for the tenant, stamps the pack on the factory so the right
 * dashboard mounts, and marks onboarding done — after which the owner-layout guard
 * stops sending them back here.
 *
 * Guarded and owner-only: setting up your own workspace is legitimate, but it is a
 * real entitlement change, so it goes through `guardWrite` (subscription check) and
 * refuses a store manager or line manager. The pack key is validated against the
 * live registry — never a retired or invented key — so this can only ever enable a
 * real bundle.
 */
export async function adoptPack(packKey: string): Promise<{ success: true } | { error: string }> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  // Owner or co-owner only. getOwnerUser also admits managers and store managers,
  // who may reach the shell but must not reshape the whole workspace.
  if (user.role !== "OWNER" && user.role !== "CO_OWNER") {
    return { error: "Only an owner can choose the workspace pack." };
  }

  await guardWrite();

  if (!(packKey in VERTICAL_PACKS)) {
    return { error: "That is not a pack we offer." };
  }

  const modules = modulesForPack(packKey as VerticalPackKey);
  await enableModules(user.factory.organizationId, modules);

  await prisma.factory.update({
    where: { id: user.factoryId },
    data: { industry: packKey, onboardingStatus: "LIVE" },
  });

  revalidatePath("/owner/dashboard");
  return { success: true };
}
