import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHmac } from "node:crypto";
import { requireMaintenanceToken } from "@/lib/server/maintenanceGuard";
import { DEFAULT_MODULES, provisionTenant } from "@/platform/tenancy/provision";

function hashPassword(password: string) {
  const secretKey = process.env.JWT_SECRET || "fallback-secret-key-for-dev";
  return createHmac("sha256", secretKey).update(password).digest("hex");
}

export async function GET(request: NextRequest) {
  const denied = requireMaintenanceToken(request);
  if (denied) return denied;
  try {
    const pinHash = hashPassword("1234");
    
    const factoryId = "fac_default";

    // Upsert Factory First
    const existing = await prisma.factory.findUnique({ where: { id: factoryId } });
    if (!existing) {
      await provisionTenant({
        factoryId,
        name: "Verity Demo Factory",
        slug: "demo-factory",
        modules: DEFAULT_MODULES,
      });
    }

    // Upsert Owner
    await prisma.user.upsert({
      where: { phone: "9999999999" },
      update: {
        pinHash: pinHash,
      },
      create: {
        factoryId,
        name: "Factory Owner",
        phone: "9999999999",
        role: "OWNER",
        pinHash: pinHash,
        status: "active",
      },
    });

    // Upsert Worker
    await prisma.user.upsert({
      where: { phone: "8888888888" },
      update: {
        pinHash: pinHash,
      },
      create: {
        factoryId,
        name: "Line Worker",
        phone: "8888888888",
        role: "WORKER",
        pinHash: pinHash,
        status: "active",
      },
    });

    // Upsert Inspector
    await prisma.user.upsert({
      where: { phone: "7777777777" },
      update: {
        pinHash: pinHash,
      },
      create: {
        factoryId,
        name: "Quality Checker",
        phone: "7777777777",
        role: "SUPERVISOR",
        pinHash: pinHash,
        status: "active",
      },
    });

    const extraWorkers = [
      ["6666666661", "Ravi", "Line Worker"],
      ["6666666662", "Neha", "Trim & Finish"],
      ["6666666663", "Imran", "Packing Lead"],
      ["6666666664", "Sita", "QC Assistant"],
    ];
    for (const [phone, name, title] of extraWorkers) {
      await prisma.user.upsert({
        where: { phone },
        update: { pinHash },
        create: {
          factoryId,
          name,
          phone,
          role: "WORKER",
          pinHash,
          status: "active",
        },
      });
    }

    const extraInspectors = [
      ["5555555551", "Karan", "Senior Inspector"],
      ["5555555552", "Pooja", "Shift Inspector"],
    ];
    for (const [phone, name, title] of extraInspectors) {
      await prisma.user.upsert({
        where: { phone },
        update: { pinHash },
        create: {
          factoryId,
          name,
          phone,
          role: "SUPERVISOR",
          pinHash,
          status: "active",
        },
      });
    }

    const customerNames = [
      "Honda Dealership New Delhi",
      "Maruti Fleet Desk",
      "Tata Corporate Supply",
      "Mahindra Aftermarket",
      "Kia Service Hub",
      "Toyota Genuine Parts",
    ];
    for (const customerName of customerNames) {
      await prisma.customer.upsert({
        where: {
          id: `${factoryId}-${customerName.replace(/\s+/g, "-").toLowerCase()}`,
        },
        update: {},
        create: {
          id: `${factoryId}-${customerName.replace(/\s+/g, "-").toLowerCase()}`,
          factoryId,
          name: customerName,
          email: `contact+${customerName.replace(/\s+/g, "").toLowerCase()}@example.com`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Database backfilled with default phone numbers and PINs for Owner, Worker, and Inspector. You can now login with 9999999999 and 1234."
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
