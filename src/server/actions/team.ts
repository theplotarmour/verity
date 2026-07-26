"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { randomInt } from "crypto";
import { hashPin } from "@/lib/server/hash";
import { can } from "@/lib/permissions";

function generateRandomPin() {
  return randomInt(1000, 10000).toString();
}

async function logAudit(factoryId: string, actorId: string, actorName: string, action: string) {
  try {
    await prisma.auditLog.create({
      data: {
        factoryId,
        actorUserId: actorId,
        entityType: "TEAM",
        entityId: actorId,
        action,
      }
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function inviteMember(data: { name: string; role: Role; phone: string; departmentId?: string }) {
  const actor = await getOwnerUser();
  if (!actor) return { error: "Unauthorized" };

  if (!can(actor, "MANAGE_TEAM")) {
    return { error: "You do not have permission to manage the team." };
  }

  if (actor.role === "MANAGER" && (data.role === "OWNER" || data.role === "CO_OWNER")) {
    return { error: "Managers cannot assign Owner or Co-Owner roles." };
  }
  if (actor.role === "CO_OWNER" && data.role === "OWNER") {
    return { error: "Co-Owners cannot assign Owner role." };
  }
  if (data.role === "OWNER") {
    return { error: "Ownership can only be transferred, not assigned." };
  }

  const cleanPhone = data.phone.replace(/\D/g, "");
  if (!cleanPhone || cleanPhone.length < 10) {
    return { error: "Please enter a valid phone number" };
  }

  const existingUser = await prisma.user.findUnique({ where: { phone: cleanPhone } });
  if (existingUser) {
    return { error: "Phone number is already in use" };
  }

  const pin = generateRandomPin();
  const pinHash = hashPin(pin, actor.factoryId);

  // Only floor roles belong to a department, and only a real department in this
  // factory is accepted.
  let departmentId: string | null = null;
  if (data.departmentId && (data.role === "WORKER" || data.role === "SUPERVISOR")) {
    const dept = await prisma.department.findFirst({
      where: { id: data.departmentId, factoryId: actor.factoryId },
      select: { id: true },
    });
    departmentId = dept?.id ?? null;
  }

  try {
    const newUser = await prisma.user.create({
      data: {
        factoryId: actor.factoryId,
        name: data.name,
        role: data.role,
        phone: cleanPhone,
        pinHash,
        createdById: actor.id,
        departmentId,
      }
    });

    await logAudit(actor.factoryId, actor.id, actor.name, `${actor.name} added ${newUser.name} as ${newUser.role}`);
    revalidatePath("/owner/team");
    return { success: true, member: newUser, pin };
  } catch (error) {
    console.error(error);
    return { error: "Failed to invite team member." };
  }
}

export async function resetMemberPin(memberId: string) {
  const actor = await getOwnerUser();
  if (!actor) return { error: "Unauthorized" };

  if (!can(actor, "MANAGE_TEAM")) {
    return { error: "Unauthorized" };
  }

  const target = await prisma.user.findUnique({ where: { id: memberId } });
  if (!target) return { error: "User not found" };

  if (target.role === "OWNER" && actor.id !== target.id) {
    return { error: "Cannot reset owner's PIN" };
  }

  const pin = generateRandomPin();
  const pinHash = hashPin(pin, actor.factoryId);

  try {
    await prisma.user.update({
      where: { id: memberId },
      data: { pinHash, failedAttempts: 0, lockedUntil: null }
    });

    await logAudit(actor.factoryId, actor.id, actor.name, `${actor.name} reset PIN for ${target.name}`);
    revalidatePath("/owner/team");
    return { success: true, pin };
  } catch (e) {
    return { error: "Failed to reset PIN" };
  }
}

export async function setMemberPin(memberId: string, newPin: string) {
  const actor = await getOwnerUser();
  if (!actor) return { error: "Unauthorized" };

  if (!can(actor, "MANAGE_TEAM")) {
    return { error: "Unauthorized" };
  }

  const cleanPin = newPin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return { error: "PIN must be 4 to 6 digits." };
  }

  const target = await prisma.user.findUnique({ where: { id: memberId } });
  if (!target) return { error: "User not found" };

  if (target.role === "OWNER" && actor.id !== target.id) {
    return { error: "Cannot change owner's PIN" };
  }

  try {
    await prisma.user.update({
      where: { id: memberId },
      data: { pinHash: hashPin(cleanPin, actor.factoryId), failedAttempts: 0, lockedUntil: null }
    });

    await logAudit(actor.factoryId, actor.id, actor.name, `${actor.name} set custom PIN for ${target.name}`);
    revalidatePath("/owner/team");
    revalidatePath(`/owner/users/${memberId}`);
    return { success: true, pin: cleanPin };
  } catch (e) {
    return { error: "Failed to set member PIN" };
  }
}

export async function toggleMemberActivation(memberId: string, isActive: boolean) {
  const actor = await getOwnerUser();
  if (!actor) return { error: "Unauthorized" };

  if (!can(actor, "MANAGE_TEAM")) {
    return { error: "Unauthorized" };
  }

  const target = await prisma.user.findUnique({ where: { id: memberId } });
  if (!target) return { error: "User not found" };

  if (target.role === "OWNER") {
    return { error: "Cannot deactivate Owner account" };
  }

  try {
    await prisma.user.update({
      where: { id: memberId },
      data: { isActive }
    });

    await logAudit(actor.factoryId, actor.id, actor.name, `${actor.name} ${isActive ? 'activated' : 'deactivated'} ${target.name}`);
    revalidatePath("/owner/team");
    return { success: true };
  } catch (e) {
    return { error: "Failed to update member status" };
  }
}

export async function removeMember(memberId: string) {
  const actor = await getOwnerUser();
  if (!actor) return { error: "Unauthorized" };

  if (!can(actor, "MANAGE_TEAM")) {
    return { error: "Unauthorized" };
  }

  const target = await prisma.user.findUnique({ where: { id: memberId } });
  if (!target) return { error: "User not found" };

  if (target.role === "OWNER") {
    return { error: "Owner account cannot be removed" };
  }

  try {
    await prisma.user.delete({
      where: { id: memberId }
    });

    await logAudit(actor.factoryId, actor.id, actor.name, `${actor.name} removed ${target.name} from factory`);
    revalidatePath("/owner/team");
    return { success: true };
  } catch (e: any) {
    if (e.code === "P2003") {
      await prisma.user.update({
        where: { id: memberId },
        data: { isActive: false }
      });
      await logAudit(actor.factoryId, actor.id, actor.name, `${actor.name} deactivated ${target.name} (has database relations)`);
      revalidatePath("/owner/team");
      return { success: true, warning: "User has dependencies and was deactivated instead of deleted." };
    }
    return { error: "Failed to remove member" };
  }
}

export async function updateMemberRole(memberId: string, role: Role) {
  const actor = await getOwnerUser();
  if (!actor) return { error: "Unauthorized" };

  if (!can(actor, "ASSIGN_ROLES")) {
    return { error: "Unauthorized" };
  }

  const target = await prisma.user.findUnique({ where: { id: memberId } });
  if (!target) return { error: "User not found" };

  if (target.role === "OWNER" || role === "OWNER") {
    return { error: "Cannot modify Owner role from here. Use Transfer Ownership." };
  }

  try {
    await prisma.user.update({
      where: { id: memberId },
      data: { role }
    });

    await logAudit(actor.factoryId, actor.id, actor.name, `${actor.name} changed role of ${target.name} to ${role}`);
    revalidatePath("/owner/team");
    return { success: true };
  } catch (e) {
    return { error: "Failed to update member role" };
  }
}

export async function transferOwnership(targetCoOwnerId: string, ownerPin: string) {
  const actor = await getOwnerUser();
  if (!actor) return { error: "Unauthorized" };

  if (actor.role !== "OWNER") {
    return { error: "Only the active Owner can transfer ownership." };
  }

  const hashedPin = hashPin(ownerPin, actor.factoryId);
  if (hashedPin !== actor.pinHash) {
    return { error: "Incorrect PIN." };
  }

  const target = await prisma.user.findUnique({ where: { id: targetCoOwnerId } });
  if (!target || target.role !== "CO_OWNER") {
    return { error: "Ownership can only be transferred to a Co-Owner." };
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: actor.id },
        data: { role: "CO_OWNER" }
      }),
      prisma.user.update({
        where: { id: target.id },
        data: { role: "OWNER" }
      })
    ]);

    await logAudit(actor.factoryId, actor.id, actor.name, `${actor.name} transferred factory ownership to ${target.name}`);
    revalidatePath("/owner/team");
    return { success: true };
  } catch (e) {
    return { error: "Failed to transfer ownership" };
  }
}
