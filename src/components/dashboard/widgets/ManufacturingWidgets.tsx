import { AlertTriangle } from "lucide-react";

import prisma from "@/lib/prisma";
import { Metric } from "@/components/design/Metric";
import { FloorProgressList } from "@/components/factory/FloorProgressList";
import { FactoryFeed } from "@/components/factory/FactoryFeed";
import { salesOrderInclude, toLegacyOrder } from "@/lib/server/jobCardAdapter";
import { JOB_CARD_DONE } from "@/lib/production-status";
import { listUnreadWarnings } from "@/server/actions/notifications";
import { BarRow, FunnelStrip, Nothing, Panel, StatRow } from "../shared";
import { WarningsQueue } from "../WarningsQueue";

/**
 * Manufacturing dashboard widgets.
 *
 * These are `AutoComponentsDashboard` decomposed into module-owned widgets, so an
 * auto-components tenant's floor renders through the same `resolveDashboardWidgets`
 * engine every other vertical uses, instead of a hardcoded page. The content is at
 * parity — the funnel, the QC Pareto, the live operators, the warnings queue — and
 * the queries are the originals, including the funnel's deliberate own-query note:
 * a floor-wide count must never be derived from the five most recent orders.
 *
 * Each widget runs its own query rather than sharing one Promise.all, because the
 * widget engine loads them independently — a handful of extra round trips for the
 * composability the platform is built on.
 *
 * The QC Pareto lives here rather than in `quality` on purpose (for now): only
 * `auto_components` carries `manufacturing`, so hosting it here keeps this whole
 * migration's blast radius to that one pack. It moves to `quality` when the
 * quality-carrying verticals get their own widget migration.
 */

export interface WidgetProps {
  factoryId: string;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function FactoryMetricsWidget({ factoryId }: WidgetProps) {
  const [todayOrders, failedChecks, reportsGenerated] = await Promise.all([
    prisma.salesOrder.count({ where: { factoryId, orderDate: { gte: startOfToday() } } }),
    prisma.checkpointSubmission.count({
      where: { factoryId, passFail: "FAIL", inspection: { status: "IN_PROGRESS" } },
    }),
    prisma.qualityReport.count({ where: { factoryId } }),
  ]);

  // The same clamp the hand-built dashboard used: a coarse signal, not a computed
  // yield, and deliberately bounded so a single failing audit never reads as a
  // collapsed line.
  const passRate = Math.max(86, Math.min(99, 100 - failedChecks * 2));

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4 w-full">
      <Metric href="/owner/production" label="Today Production" value={String(todayOrders)} detail="Seat sets" tone="blue" />
      <Metric href="/owner/reports" label="QC Pass Rate" value={`${passRate}%`} detail="Last 7 days" tone="green" />
      <Metric href="/owner/floor" label="Problems" value={String(failedChecks)} detail="Needs attention" tone="red" />
      <Metric href="/owner/reports" label="Proof Ready" value={String(reportsGenerated)} detail="Passports issued" tone="amber" />
    </section>
  );
}

export async function ProductionFunnelWidget({ factoryId }: WidgetProps) {
  const departments = await prisma.department.findMany({
    where: { factoryId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      _count: { select: { jobCards: { where: { status: { not: JOB_CARD_DONE } } } } },
    },
  });

  const stages = departments.map((d) => ({ name: d.name, count: d._count.jobCards }));
  const onFloor = stages.reduce((n, s) => n + s.count, 0);

  return (
    <Panel
      eyebrow="Active production"
      title="Where the work is"
      className="w-full h-full"
      action={<span className="shrink-0 font-mono text-[13px] text-text-tertiary">{onFloor} on floor</span>}
    >
      {stages.length === 0 ? (
        <Nothing href="/owner/departments" cta="Set up departments">
          No departments yet. Lay out the stages a job runs through and the floor shows up here.
        </Nothing>
      ) : (
        <FunnelStrip stages={stages} />
      )}
    </Panel>
  );
}

export async function FloorProgressWidget({ factoryId }: WidgetProps) {
  const recentOrders = await prisma.salesOrder
    .findMany({
      where: { factoryId },
      relationLoadStrategy: "join",
      include: salesOrderInclude,
      orderBy: { orderDate: "desc" },
      take: 5,
    })
    .then((orders) => orders.map(toLegacyOrder));

  return (
    <Panel eyebrow="Production timeline" title="Floor progress" className="w-full h-full">
      <FloorProgressList recentOrders={recentOrders} />
    </Panel>
  );
}

export async function FactorySignalsWidget({ factoryId }: WidgetProps) {
  const [pendingReviews, activeWorkersCount, reportsGenerated, activeWorkersList] = await Promise.all([
    prisma.inspection.count({ where: { factoryId, status: "WAITING_QC" } }),
    prisma.user.count({ where: { factoryId, role: "WORKER", isActive: true } }),
    prisma.qualityReport.count({ where: { factoryId } }),
    prisma.attendanceLog
      .findMany({ where: { factoryId, clockOut: null }, select: { userId: true } })
      .then((logs) =>
        prisma.user.findMany({
          where: { factoryId, role: "WORKER", isActive: true, id: { in: logs.map((l) => l.userId) } },
          take: 12,
        }),
      ),
  ]);

  return (
    <Panel
      eyebrow="Floor status"
      title="Factory signals"
      className="w-full h-full"
      action={<AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />}
    >
      <div className="space-y-2">
        <StatRow label="Pending verification" value={pendingReviews} href="/owner/qc-floor" />
        <StatRow label="Active workers" value={activeWorkersCount} href="/owner/team" />
        <StatRow label="Reports generated" value={reportsGenerated} href="/owner/reports" />
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.25em] text-text-tertiary">Live operators</p>
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
  );
}

export async function QualityParetoWidget({ factoryId }: WidgetProps) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Grouped in the database — a busy floor produces tens of thousands of
  // submissions a week, and pulling them to count here would not scale.
  const defectGroups = await prisma.checkpointSubmission.groupBy({
    by: ["checkpointId"],
    where: { factoryId, passFail: "FAIL", createdAt: { gte: sevenDaysAgo } },
    _count: { checkpointId: true },
    orderBy: { _count: { checkpointId: "desc" } },
    take: 6,
  });

  const names = new Map<string, string>();
  if (defectGroups.length > 0) {
    const checkpoints = await prisma.checkpoint.findMany({
      where: { factoryId, id: { in: defectGroups.map((g) => g.checkpointId) } },
      select: { id: true, name: true },
    });
    for (const c of checkpoints) names.set(c.id, c.name);
  }

  const defects = defectGroups.map((g) => ({
    label: names.get(g.checkpointId) ?? "Unnamed checkpoint",
    count: g._count.checkpointId,
  }));
  const worst = defects[0]?.count ?? 0;
  const total = defects.reduce((n, d) => n + d.count, 0);

  return (
    <Panel
      eyebrow="Last 7 days"
      title="Where quality fails"
      className="w-full h-full"
      action={total > 0 ? <span className="shrink-0 font-mono text-[13px] text-text-tertiary">{total} failures</span> : null}
    >
      {defects.length === 0 ? (
        <Nothing href="/owner/qc-templates" cta="Set up a checklist">
          No failed checkpoints in the last seven days. Either the floor is clean, or nothing is being checked yet.
        </Nothing>
      ) : (
        <>
          <div className="space-y-3">
            {defects.map((d) => (
              <BarRow key={d.label} label={d.label} value={d.count} max={worst} />
            ))}
          </div>
          <p className="mt-4 text-[11px] text-text-tertiary">
            Ranked by frequency. The top two usually account for most of the rework.
          </p>
        </>
      )}
    </Panel>
  );
}

export async function FactoryFeedWidget({ factoryId }: WidgetProps) {
  const auditLogs = await prisma.auditLog.findMany({
    where: { factoryId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

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
      meta: new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  });

  return (
    <Panel eyebrow="Activity" title="Recent events" className="w-full h-full">
      <FactoryFeed initialEvents={feedEvents} />
    </Panel>
  );
}

export async function OperationalWarningsWidget(_: WidgetProps) {
  // The action, not a copy of its query — it derives the tenant from the session,
  // the same request this widget renders in.
  const warnings = await listUnreadWarnings();

  return (
    <Panel
      eyebrow="Needs attention"
      title="Operational warnings"
      className="w-full h-full"
      action={warnings.length > 0 ? <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" /> : null}
    >
      <WarningsQueue initial={warnings.map((w) => ({ ...w, createdAt: w.createdAt.toISOString() }))} />
    </Panel>
  );
}
