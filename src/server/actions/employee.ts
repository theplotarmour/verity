"use server";

import prisma from "@/lib/prisma";
import { phoneKey } from "@/lib/phone";
import { getOwnerUser } from "@/lib/server/owner";
import { SystemRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { randomInt } from "crypto";

function generateRandomPin() {
  const pin = randomInt(1000, 10000).toString();
  return pin;
}

import { hashPin } from "@/lib/server/hash";

export async function createEmployee(data: { name: string; role: SystemRole; phone: string; pin?: string }) {
  const owner = await getOwnerUser();
  if (!owner || owner.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  // Canonical — see the note in team.ts. A stored number that login cannot
  // reproduce is an account nobody can use.
  const cleanPhone = phoneKey(data.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return { error: "Please enter a valid phone number" };
  }

  // Old team UI does not collect a PIN; generate one when absent.
  const pin = data.pin ?? String(Math.floor(1000 + Math.random() * 9000));
  if (pin.length !== 4) {
    return { error: "PIN must be exactly 4 digits" };
  }

  // Check if phone already exists
  const existingUser = await prisma.user.findUnique({ where: { phone: cleanPhone } });
  if (existingUser) {
    return { error: "Phone number is already in use" };
  }

  const hashedPin = hashPin(pin, owner.factoryId);
  const language = "en"; // Workers/Inspectors default to English; owner can change per user

  try {
    const newUser = await prisma.user.create({
      data: {
        factoryId: owner.factoryId,
        name: data.name,
        role: data.role,
        phone: cleanPhone,
        pinHash: hashedPin,
        language,
      },
    });

    revalidatePath("/owner/team");
    return { 
      success: true, 
      phone: cleanPhone, 
      pin 
    };
  } catch (error) {
    return { error: "Failed to create employee" };
  }
}

export async function resetEmployeePin(userId: string) {
  const owner = await getOwnerUser();
  if (!owner || owner.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  const generatedPin = generateRandomPin();
  const hashedPin = hashPin(generatedPin, owner.factoryId);

  try {
    await prisma.user.update({
      where: { id: userId, factoryId: owner.factoryId },
      data: {
        pinHash: hashedPin
      }
    });
    return { success: true, pin: generatedPin };
  } catch (e) {
    return { error: "Failed to reset PIN" };
  }
}

export async function removeEmployee(userId: string, ownerPin: string) {
  const owner = await getOwnerUser();
  if (!owner || owner.role !== "OWNER") {
    return { error: "Unauthorized" };
  }

  // Verify owner PIN
  const hashedOwnerPin = hashPin(ownerPin, owner.factoryId);
  if (hashedOwnerPin !== owner.pinHash) {
    return { error: "Incorrect owner PIN" };
  }

  try {
    // Delete user
    await prisma.user.delete({
      where: { id: userId, factoryId: owner.factoryId },
    });
    
    revalidatePath("/owner/users");
    return { success: true };
  } catch (e: any) {
    console.error(e);
    // If there are foreign key constraints, maybe just set isActive to false
    if (e.code === 'P2003') {
      await prisma.user.update({
        where: { id: userId, factoryId: owner.factoryId },
        data: { isActive: false }
      });
      revalidatePath("/owner/users");
      return { success: true, warning: "User has attached data. They were deactivated instead of deleted." };
    }
    return { error: "Failed to remove employee" };
  }
}
