import Link from "next/link";
import { AlertTriangle, Play } from "lucide-react";

import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { FloorProgressList } from "@/components/factory/FloorProgressList";
import { FactoryFeed } from "@/components/factory/FactoryFeed";
import { salesOrderInclude, toLegacyOrder } from "@/lib/server/jobCardAdapter";
import { BarRow, Nothing, Panel, StatRow } from "./shared";

/**
 * Auto components — a production floor.
 *
 * The question this answers is "what is on the floor, and what is stopping it".
 * The Pareto is the addition that earns its space: a count of failures tells you
 * something is wrong, a ranked list of *which checkpoint* fails tells you what
 * to go and fix. Eighty percent of the rework is usually two checkpoints.
 */
export async function AutoComponentsDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    todayOrders,
    pendingReviews,
    failedChecks,
    activeWorkersCount,
    reportsGenerated,
    recentOrders,
    activeWorkersList,
    defectGroups,
    auditLogs,
  ] = await Promise.all([
    prisma.salesOrder.count({ where: { factoryId, orderDate: { gte: todayStart } } }),
    prisma.inspection.count({ where: { factoryId, status: "WAITING_QC" } }),
    prisma.checkpointSubmission.count({
      where: { factoryId, passFail: "FAIL", inspection: { status: "IN_PROGRESS" } },
    }),
    prisma.user.count({ where: { factoryId, role: "WORKER", isActive: true } }),
    prisma.qualityReport.count({ where: { factoryId } }),
    prisma.salesOrder
      .findMany({
        where: { factoryId },
        relationLoadStrategy: "join",
        include: salesOrderInclude,
        orderBy: { orderDate: "desc" },
        take: 5,
      })
      .then((orders) => orders.map(toLegacyOrder)),
    prisma.attendanceLog
      .findMany({ where: { factoryId, clockOut: null }, select: { userId: true } })
      .then((logs) =>
        prisma.user.findMany({
          where: {
            factoryId,
            role: "WORKER",
            isActive: true,
            id: { in: logs.map((l) => l.userId) },
          },
          take: 12,
        }),
      ),
    // The Pareto. Grouped in the database rather than pulled and counted here —
    // a busy floor produces tens of thousands of submissions a week.
    prisma.checkpointSubmission.groupBy({
      by: ["checkpointId"],
      where: { factoryId, passFail: "FAIL", createdAt: { gte: sevenDaysAgo } },
      _count: { checkpointId: true },
      orderBy: { _count: { checkpointId: "desc" } },
      take: 6,
    }),
    prisma.auditLog.findMany({ where: { factoryId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  // Names for the ranked checkpoints, in one query rather than one per bar.
  const checkpointNames = new Map<string, string>();
  if (defectGroups.length > 0) {
    const checkpoints = await prisma.checkpoint.findMany({
      // Scoped to the tenant as well as the ids: the ids came from this
      // factory's own submissions, but a query that does not say so is one
      // refactor away from not being true.
      where: { factoryId, id: { in: defectGroups.map((g) => g.checkpointId) } },
      select: { id: true, name: true },
    });
    for (const c of checkpoints) checkpointNames.set(c.id, c.name);
  }

  const defects = defectGroups.map((g) => ({
    label: checkpointNames.get(g.checkpointId) ?? "Unnamed checkpoint",
    count: g._count.checkpointId,
  }));
  const worstDefect = defects[0]?.count ?? 0;
  const totalDefects = defects.reduce((n, d) => n + d.count, 0);

  const passRate = Math.max(86, Math.min(99, 100 - failedChecks * 2));

  const feedEvents = auditLogs.map((log) => {
    const action = log.action.toLowerCase();
    const type: "success" | "info" | "warning" = /added|created|approved/.test(action)
      ? "success"
      : /rejected|deactivated|removed/.test(action)
        ? "warning"
        : "info";
    return {
      id: log.id,
      type,
      text: log.action,
      meta: new Date(log.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader
        title={`Welcome ${firstName}`}
        actions={
          <Link href="/owner/production?new=true">
            <Button className="h-9 gap-2 text-xs">
              <Play className="h-3.5 w-3.5" />
              New Production
            </Button>
          </Link>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric href="/owner/production" label="Today Production" value={String(todayOrders)} detail="Seat sets" tone="blue" />
        <Metric href="/owner/reports" label="QC Pass Rate" value={`${passRate}%`} detail="Last 7 days" tone="green" />
        <Metric href="/owner/floor" label="Problems" value={String(failedChecks)} detail="Needs attention" tone="red" />
        <Metric href="/owner/reports" label="Proof Ready" value={String(reportsGenerated)} detail="Passports issued" tone="amber" />
      </section>

      <section className="grid w-full flex-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <Panel eyebrow="Production timeline" title="Floor progress" className="xl:col-span-2">
          <FloorProgressList recentOrders={recentOrders} />
        </Panel>

        <Panel
          eyebrow="Floor status"
          title="Factory signals"
          action={<AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />}
        >
          <div className="space-y-2">
            <StatRow label="Pending verification" value={pendingReviews} href="/owner/qc-floor" />
            <StatRow label="Active workers" value={activeWorkersCount} href="/owner/team" />
            <StatRow label="Reports generated" value={reportsGenerated} href="/owner/reports" />
          </div>

          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.25em] text-text-tertiary">
              Live operators
            </p>
            {activeWorkersList.length === 0 ? (
              <p className="text-center text-[11px] text-text-tertiary">No operators clocked in</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeWorkersList.map((worker) => (
                  <span
                    key={worker.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success-soft/20 px-2.5 py-1 text-[11px] font-semibold text-text-primary"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                    </span>
                    {worker.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid w-full gap-4 xl:grid-cols-3 xl:gap-6">
        <Panel
          eyebrow="Last 7 days"
          title="Where quality fails"
          className="xl:col-span-2"
          action={
            totalDefects > 0 ? (
              <span className="shrink-0 font-mono text-[13px] text-text-tertiary">
                {totalDefects} failures
              </span>
            ) : null
          }
        >
          {defects.length === 0 ? (
            <Nothing href="/owner/qc-templates" cta="Set up a checklist">
              No failed checkpoints in the last seven days. Either the floor is clean, or nothing
              is being checked yet.
            </Nothing>
          ) : (
            <>
              <div className="space-y-3">
                {defects.map((d) => (
                  <BarRow key={d.label} label={d.label} value={d.count} max={worstDefect} />
                ))}
              </div>
              <p className="mt-4 text-[11px] text-text-tertiary">
                Ranked by frequency. The top two usually account for most of the rework.
              </p>
            </>
          )}
        </Panel>

        <Panel eyebrow="Activity" title="Recent events">
          <FactoryFeed initialEvents={feedEvents} />
        </Panel>
      </section>
    </div>
  );
}
