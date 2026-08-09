import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { enforceRole } from "@/lib/server/auth";
import { hasModule } from "@/platform/modules/entitlements";
import { getMySchedule } from "@/server/actions/scheduling";
import { MyScheduleClient } from "./MyScheduleClient";

export const dynamic = "force-dynamic";

export default async function WorkerSchedulePage() {
  const session = await enforceRole(["WORKER", "SUPERVISOR"]);

  const factory = await prisma.factory.findUnique({
    where: { id: session.factoryId },
    select: { organizationId: true },
  });
  // Workers of a tenant without scheduling go back to their job list rather
  // than an empty calendar that implies their roster simply is not published.
  if (!factory || !(await hasModule(factory.organizationId, "scheduling"))) {
    redirect("/worker");
  }

  const [shifts, colleagues] = await Promise.all([
    getMySchedule(21),
    prisma.user.findMany({
      where: { factoryId: session.factoryId, isActive: true, id: { not: session.userId } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <MyScheduleClient shifts={shifts} colleagues={colleagues} />;
}
