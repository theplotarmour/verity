import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ notifications: [] });
  }

  const notifications = await prisma.notification.findMany({
    where: { factoryId: session.factoryId, userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      message: true,
      createdAt: true,
      read: true,
    },
  });

  return NextResponse.json({ notifications });
}
