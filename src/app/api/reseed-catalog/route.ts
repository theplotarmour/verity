import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMaintenanceToken } from "@/lib/server/maintenanceGuard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireMaintenanceToken(request);
  if (denied) return denied;
  try {
    console.log("Reseeding Factory Catalog from API...");

    // Find all factories in database
    const factories = await prisma.factory.findMany();
    if (factories.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No factories found in database. Please register/onboard first."
      });
    }

    const reseedDetails: any = {};

    for (const factory of factories) {
      console.log(`Processing catalog for factory: ${factory.name} (${factory.id})`);

      // 1. Delete existing vehicle models and brands
      await prisma.vehicleModel.deleteMany({ where: { factoryId: factory.id } });
      await prisma.vehicleBrand.deleteMany({ where: { factoryId: factory.id } });

      // 2. Create updated Brand & Model format
      const brandsData = [
        {
          name: "Maruti Suzuki",
          models: [
            { name: "Swift Seat Cover (DB 2 HDR)", year: "2018-2022" },
            { name: "Swift Seat Cover (SB 2 HDR)", year: "2018-2022" },
            { name: "Swift Seat Cover (DB 2 HDR)", year: "2015-2018" },
            { name: "Baleno Seat Cover (DB 2 HDR)", year: "2022-2026" },
            { name: "Ertiga Seat Cover (DB 6 HDR)", year: "2018-2026" },
          ]
        },
        {
          name: "Honda",
          models: [
            { name: "Jazz Seat Cover (DB 2 HDR)", year: "2018-2022" },
            { name: "Jazz Seat Cover (DB 2 HDR)", year: "2015-2018" },
            { name: "City Seat Cover (DB 4 HDR)", year: "2020-2026" },
            { name: "Elevate Seat Cover (DB 4 HDR)", year: "2023-2026" },
          ]
        },
        {
          name: "Toyota",
          models: [
            { name: "Innova Seat Cover (DB 4 HDR)", year: "2023-2026" },
            { name: "Innova Seat Cover (DB 4 HDR)", year: "2016-2023" },
            { name: "Fortuner Seat Cover (DB 4 HDR)", year: "2016-2026" },
          ]
        },
        {
          name: "Hyundai",
          models: [
            { name: "Creta Seat Cover (DB 4 HDR)", year: "2020-2026" },
            { name: "i20 Seat Cover (DB 2 HDR)", year: "2020-2026" },
          ]
        }
      ];

      const createdBrands = [];

      for (const b of brandsData) {
        const brand = await prisma.vehicleBrand.create({
          data: {
            factoryId: factory.id,
            name: b.name,
          }
        });

        const createdModels = [];
        for (const m of b.models) {
          const model = await prisma.vehicleModel.create({
            data: {
              factoryId: factory.id,
              brandId: brand.id,
              name: m.name,
              year: m.year,
            }
          });
          createdModels.push(`${model.name} (${model.year})`);
        }

        createdBrands.push({
          brand: brand.name,
          models: createdModels
        });
      }

      reseedDetails[factory.name] = createdBrands;
    }

    return NextResponse.json({
      success: true,
      message: "Successfully reseeded all factory catalogs in production database",
      details: reseedDetails
    });
  } catch (error: any) {
    console.error("API Reseed Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to reseed database catalog"
    }, { status: 500 });
  }
}
