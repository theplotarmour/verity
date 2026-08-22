import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { cronAuthorized, cronUnauthorized } from "@/lib/server/cron-auth";
import { scanFactoryAnomalies } from "@/lib/server/anomalies";

/**
 * Anomaly surfacing cron (R6).
 *
 * Runs on a schedule, scans every tenant for spikes it can compute against that
 * tenant's own recent baseline, and drops a plain-language notification to the
 * owners when something is off. Guarded by `CRON_SECRET`, which fails closed — an
 * unset secret means nobody, not everybody, the same rule the webhook drain uses.
 *
 * Deliberately writes a notification rather than emitting into the live event bus:
 * an anomaly is a "when you next look" nudge, not a floor alarm, and the owner
 * dashboard's notification bell is exactly where a "when you next look" belongs.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return cronUnauthorized();

  const factories = await prisma.factory.findMany({ select: { id: true } });

  let anomaliesFound = 0;
  let notificationsWritten = 0;

  for (const factory of factories) {
    let anomalies;
    try {
      anomalies = await scanFactoryAnomalies(factory.id);
    } catch (error) {
      // One tenant's bad data must not stop the sweep for everyone else.
      console.error(`Anomaly scan failed for factory ${factory.id}`, error);
      continue;
    }
    if (anomalies.length === 0) continue;
    anomaliesFound += anomalies.length;

    const owners = await prisma.user.findMany({
      where: { factoryId: factory.id, isActive: true, role: { in: ["OWNER", "CO_OWNER"] } },
      select: { id: true },
    });
    if (owners.length === 0) continue;

    const rows = anomalies.flatMap((anomaly) =>
      owners.map((owner) => ({
        factoryId: factory.id,
        userId: owner.id,
        title: anomaly.headline,
        message: anomaly.detail,
        type: anomaly.severity === "warn" ? ("WARNING" as const) : ("INFO" as const),
        linkUrl: "/owner/dashboard",
      })),
    );

    // Best-effort: a duplicate ping on a re-run is noise, not a bug, and there is
    // no natural unique key for "this anomaly today" without a dedicated table.
    const result = await prisma.notification.createMany({ data: rows });
    notificationsWritten += result.count;
  }

  return NextResponse.json({
    scanned: factories.length,
    anomaliesFound,
    notificationsWritten,
  });
}
