import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { hashPin } from "@/lib/server/hash";
import { requireMaintenanceToken } from "@/lib/server/maintenanceGuard";
import { DEFAULT_MODULES, provisionTenant, systemRoleId } from "@/platform/tenancy/provision";

export async function GET(request: NextRequest) {
  const denied = requireMaintenanceToken(request);
  if (denied) return denied;
  try {
    let factory = await prisma.factory.findFirst({
      where: { slug: "carxen" }
    });

    if (!factory) {
      // Carxen runs the automotive vertical pack on top of the default modules.
      const { factoryId } = await provisionTenant({
        name: "Carxen",
        slug: "carxen",
        onboardingStatus: "COMPLETED",
        modules: [...DEFAULT_MODULES, "automotive"],
      });
      factory = await prisma.factory.findUniqueOrThrow({ where: { id: factoryId } });
    }

    const pinHash = hashPin("5782", factory.id);

    let owner = await prisma.user.findUnique({
      where: { phone: "9971907190" }
    });

    if (!owner) {
      owner = await prisma.user.create({
        data: {
          factoryId: factory.id,
          name: "Carxen Owner",
          phone: "9971907190",
          role: "OWNER",
          roleId: await systemRoleId(factory.organizationId, "OWNER"),
          pinHash,
          isActive: true
        }
      });
    } else {
      // Update PIN just in case
      owner = await prisma.user.update({
        where: { id: owner.id },
        data: { pinHash }
      });
    }

    return NextResponse.json({ success: true, message: "Owner seeded successfully", owner: { id: owner.id, phone: owner.phone, role: owner.role } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
