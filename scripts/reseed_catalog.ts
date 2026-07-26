import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Reseeding Factory Catalog...");

  // Find all factories in database
  const factories = await prisma.factory.findMany();
  if (factories.length === 0) {
    console.log("No factories found. Please register first.");
    return;
  }

  for (const factory of factories) {
    console.log(`Processing catalog for factory: ${factory.name} (${factory.id})`);

    // 1. Delete existing vehicle models and brands
    // Clean up dependencies first (Orders depend on models/brands, but we already deleted orders earlier)
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

    for (const b of brandsData) {
      const brand = await prisma.vehicleBrand.create({
        data: {
          factoryId: factory.id,
          name: b.name,
        }
      });
      console.log(`Created brand: ${brand.name}`);

      for (const m of b.models) {
        await prisma.vehicleModel.create({
          data: {
            factoryId: factory.id,
            brandId: brand.id,
            name: m.name,
            year: m.year,
          }
        });
      }
    }
  }

  console.log("Reseed completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
