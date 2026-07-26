"use server";

import { createUserSession } from "@/lib/server/auth";
import { hashPin, legacyHashPin } from "@/lib/server/hash";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";
import { getSessionHomePath } from "@/lib/server/roleHome";

function hashPassword(password: string) {
  const secretKey = process.env.JWT_SECRET || "fallback-secret-key-for-dev";
  return createHmac("sha256", secretKey).update(password).digest("hex");
}

export async function authenticateUser(phone: string, pin: string) {
  if (!phone || !pin) {
    return { error: "Phone number and PIN are required" };
  }

  // Remove any non-digit characters from the phone number
  const cleanPhone = phone.replace(/\D/g, "");

  const user = await prisma.user.findUnique({
    where: { phone: cleanPhone }
  });

  if (!user || !user.isActive) {
    // Log failed attempt for unknown user
    try {
      await prisma.auditLog.create({
        data: {
          factoryId: "UNKNOWN",
          action: "FAILED_LOGIN_ATTEMPT",
          entityType: "USER",
          entityId: "UNKNOWN",
          metadata: { message: `Failed login attempt for phone ${cleanPhone}`, timestamp: new Date().toISOString() }
        }
      });
    } catch (e) {
      // Ignore
    }
    return { error: "Invalid Phone Number or PIN" };
  }

  const inputPinHash = hashPin(pin, user.factoryId);
  const legacyMatch = user.pinHash === legacyHashPin(pin, user.factoryId);
  if (user.pinHash !== inputPinHash && !legacyMatch) {
    try {
      await prisma.auditLog.create({
        data: {
          factoryId: user.factoryId,
          action: "FAILED_LOGIN_ATTEMPT",
          entityType: "USER",
          entityId: user.id,
          metadata: { message: `Invalid PIN for ${cleanPhone}`, timestamp: new Date().toISOString() }
        }
      });
    } catch (e) {
      // Ignore
    }
    return { error: "Invalid Phone Number or PIN" };
  }

  // Success - clear error status; migrate legacy env-salted hashes to the
  // environment-independent scheme.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      ...(legacyMatch ? { pinHash: inputPinHash } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      factoryId: user.factoryId,
      action: "USER_LOGIN",
      entityType: "USER",
      entityId: user.id,
      actorUserId: user.id,
      metadata: { message: `${user.name} logged in` }
    }
  });

  // Since we replaced the Supabase auth flow for Owner with our own session logic,
  // we can use `createWorkerSession` for all users including the owner.
  // The middleware will need to check the session cookie instead of Supabase auth.
  await createUserSession({
    userId: user.id,
    factoryId: user.factoryId,
    role: user.role,
    language: user.language,
  });

  if (user.role === "WORKER") {
    return { success: true, redirectUrl: "/worker" };
  } else if (user.role === "SUPERVISOR") {
    return {
      success: true,
      redirectUrl: await getSessionHomePath({
        userId: user.id,
        factoryId: user.factoryId,
        role: user.role,
        language: user.language,
      }),
    };
  } else {
    return { success: true, redirectUrl: "/owner" };
  }
}

// Self-service PIN change for any signed-in user (worker/inspector/owner).
export async function changeOwnPin(currentPin: string, newPin: string) {
  const { getUserSession } = await import("@/lib/server/auth");
  const session = await getUserSession();
  if (!session?.userId) return { error: "Not signed in" };
  if (!/^\d{4,6}$/.test(newPin)) return { error: "PIN must be 4–6 digits" };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "User not found" };

  const currentMatch =
    user.pinHash === hashPin(currentPin, user.factoryId) ||
    user.pinHash === legacyHashPin(currentPin, user.factoryId);
  if (!currentMatch) return { error: "Current PIN is incorrect" };

  await prisma.user.update({ where: { id: user.id }, data: { pinHash: hashPin(newPin, user.factoryId) } });
  await prisma.auditLog.create({
    data: { factoryId: user.factoryId, actorUserId: user.id, action: `${user.name} changed their PIN`, entityType: "USER", entityId: user.id },
  });
  return { success: true };
}

export async function logoutUser() {
  const { cookies } = await import("next/headers");
  (await cookies()).delete("verity_session");
  redirect("/");
}
