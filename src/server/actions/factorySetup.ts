"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";

export async function createVehicleBrand(name: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const brand = await prisma.vehicleBrand.create({
      data: {
        factoryId: owner.factoryId,
        name
      }
    });
    revalidatePath("/owner/settings");
    return { success: true, brand };
  } catch (error) {
    return { error: "Failed to create brand" };
  }
}

export async function createVehicleModel(brandId: string, name: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const model = await prisma.vehicleModel.create({
      data: { brandId, name }
    });
    revalidatePath("/owner/settings");
    return { success: true, model };
  } catch (error) {
    return { error: "Failed to create model" };
  }
}

export async function createVehicleGeneration(modelId: string, name: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const gen = await prisma.vehicleGeneration.create({
      data: { modelId, name }
    });
    revalidatePath("/owner/settings");
    return { success: true, gen };
  } catch (error) {
    return { error: "Failed to create generation" };
  }
}

export async function createVehicleYear(generationId: string, year: number) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const y = await prisma.vehicleYear.create({
      data: { generationId, year }
    });
    revalidatePath("/owner/settings");
    return { success: true, year: y };
  } catch (error) {
    return { error: "Failed to create year" };
  }
}

export async function createVehicleVariant(yearId: string, name: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const variant = await prisma.vehicleVariant.create({
      data: { yearId, name }
    });
    revalidatePath("/owner/settings");
    return { success: true, variant };
  } catch (error) {
    return { error: "Failed to create variant" };
  }
}
