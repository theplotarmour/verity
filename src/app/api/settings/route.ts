import { NextResponse } from "next/dist/server/web/spec-extension/response";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { factoryName, ownerName, phone, themeColor, logoBase64 } = body;

    // Update User (Owner)
    if (ownerName || phone !== undefined) {
      const updateData: any = {};
      if (ownerName) updateData.name = ownerName;
      if (phone !== undefined) updateData.phone = phone;

      await prisma.user.update({
        where: { id: session.userId },
        data: updateData,
      });
    }

    // Update Factory
    if (factoryName || themeColor || logoBase64 !== undefined) {
      const factory = await prisma.factory.findUnique({
        where: { id: session.factoryId },
      });

      const currentSettings = (factory?.settings as any) || {};
      
      const factoryUpdateData: any = {};
      if (factoryName) factoryUpdateData.name = factoryName;
      if (logoBase64) factoryUpdateData.logoUrl = logoBase64;
      
      if (themeColor) {
        factoryUpdateData.settings = {
          ...currentSettings,
          themeColor,
        };
      }

      await prisma.factory.update({
        where: { id: session.factoryId },
        data: factoryUpdateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Settings Update Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
