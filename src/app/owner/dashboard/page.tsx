import Link from "next/link";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Factory,
  Play,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";
import type { ReactNode } from "react";
import { getOwnerUser } from "@/lib/server/owner";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { ProductionCard } from "@/components/factory/ProductionCard";
import { salesOrderInclude, toLegacyOrder } from "@/lib/server/jobCardAdapter";
import { FloorProgressList } from "@/components/factory/FloorProgressList";
import { FactoryFeed } from "@/components/factory/FactoryFeed";

export default async function OwnerDashboard() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const factoryId = dbUser.factoryId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 7 days ago start
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
    orders7Days,
    failures7Days,
    reports7Days,
    inspections7Days,
    dbAuditLogs
  ] = await Promise.all([
    prisma.salesOrder.count({
      where: { factoryId, orderDate: { gte: todayStart } },
    }),
    prisma.inspection.count({
      where: { factoryId, status: "WAITING_QC" },
    }),
    prisma.checkpointSubmission.count({
      where: { factoryId, passFail: "FAIL", inspection: { status: "IN_PROGRESS" } },
    }),
    prisma.user.count({
      where: { factoryId, role: "WORKER", isActive: true },
    }),
    prisma.qualityReport.count({
      where: { factoryId },
    }),
    prisma.salesOrder.findMany({
      where: { factoryId },
      relationLoadStrategy: "join",
      include: salesOrderInclude,
      orderBy: { orderDate: "desc" },
      take: 5,
    }).then((orders) => orders.map((order) => toLegacyOrder(order))),
    prisma.attendanceLog.findMany({
      where: { factoryId, clockOut: null },
      select: { userId: true },
    }).then((logs) =>
      prisma.user.findMany({
        where: {
          factoryId,
          role: "WORKER",
          isActive: true,
          id: { in: logs.map((l) => l.userId) },
        },
        take: 12,
      })
    ),
    prisma.salesOrder.findMany({
      where: { factoryId, orderDate: { gte: sevenDaysAgo } },
      select: { orderDate: true },
    }).then((orders) => orders.map((o) => ({ createdAt: o.orderDate }))),
    prisma.checkpointSubmission.findMany({
      where: { factoryId, passFail: "FAIL", createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.qualityReport.findMany({
      where: { factoryId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.inspection.findMany({
      where: { factoryId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true },
    }),
    prisma.auditLog.findMany({
      where: { factoryId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Helper to group by day and get counts for last 7 days
  const getDailyCounts = (items: { createdAt: Date }[]) => {
    const counts = Array(7).fill(0);
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      counts[6 - i] = items.filter((item: any) => new Date(item.createdAt).toDateString() === dateStr).length;
    }
    return counts;
  };

  const getDailyPassRates = () => {
    const rates = Array(7).fill(95); // Base default 95% pass rate
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      const dayInspections = inspections7Days.filter((item: any) => new Date(item.createdAt).toDateString() === dateStr).length;
      const dayFailures = failures7Days.filter((item: any) => new Date(item.createdAt).toDateString() === dateStr).length;
      if (dayInspections > 0) {
        rates[6 - i] = Math.max(70, Math.round(((dayInspections - dayFailures) / dayInspections) * 100));
      }
    }
    return rates;
  };

  // SVG sparkline path generator
  const generateSparklinePath = (dataPoints: number[]) => {
    if (dataPoints.length === 0) return "M 5,20 L 95,20";
    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = max - min || 1;
    
    const points = dataPoints.map((val, idx) => {
      const x = 5 + (idx / (dataPoints.length - 1)) * 90;
      const y = 25 - ((val - min) / range) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    return `M ${points.join(" L ")}`;
  };

  const ordersHistory = getDailyCounts(orders7Days);
  const failuresHistory = getDailyCounts(failures7Days);
  const reportsHistory = getDailyCounts(reports7Days);
  const passRatesHistory = getDailyPassRates();

  const ordersPath = generateSparklinePath(ordersHistory);
  const failuresPath = generateSparklinePath(failuresHistory);
  const reportsPath = generateSparklinePath(reportsHistory);
  const passRatesPath = generateSparklinePath(passRatesHistory);

  const passRate = Math.max(86, Math.min(99, 100 - failedChecks * 2));

  const feedEvents = dbAuditLogs.map((log: any) => {
    let type: "success" | "info" | "warning" = "info";
    const actionLower = log.action.toLowerCase();
    if (actionLower.includes("added") || actionLower.includes("created") || actionLower.includes("approved")) {
      type = "success";
    } else if (actionLower.includes("rejected") || actionLower.includes("deactivated") || actionLower.includes("removed")) {
      type = "warning";
    }

    return {
      id: log.id,
      type,
      text: log.action,
      meta: new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    };
  });

  return (
    <div className="flex flex-col gap-3 xl:gap-4 w-full overflow-y-auto xl:h-auto xl:max-h-none [@media(min-height:700px)]:xl:h-[calc(100vh-112px)] [@media(min-height:700px)]:xl:max-h-[calc(100vh-112px)] [@media(min-height:700px)]:xl:overflow-hidden justify-between p-0.5">
      {/* Header */}
      <div className="shrink-0">
        <PageHeader
          title={`Welcome ${dbUser.name.split(" ")[0]}`}
          actions={(
            <Link href="/owner/production?new=true">
              <Button className="gap-2 text-xs h-9">
                <Play className="h-3.5 w-3.5" />
                New Production
              </Button>
            </Link>
          )}
        />
      </div>

      {/* Metrics Row */}
      <section className="grid gap-3 xl:gap-4 grid-cols-2 xl:grid-cols-4 shrink-0">
        <Metric href="/owner/production" label="Today Production" value={String(todayOrders)} detail="Seat sets" tone="blue" sparklinePath={ordersPath} />
        <Metric href="/owner/reports" label="QC Pass Rate" value={`${passRate}%`} detail="+2% vs yesterday" tone="green" sparklinePath={passRatesPath} />
        <Metric href="/owner/floor" label="Problems" value={String(failedChecks)} detail="Needs attention" tone="red" sparklinePath={failuresPath} />
        <Metric href="/owner/reports" label="Shipping Today" value={String(reportsGenerated)} detail="Proof ready" tone="amber" sparklinePath={reportsPath} />
      </section>

      {/* Cards Panel */}
      <section className="grid gap-4 xl:gap-6 xl:grid-cols-3 w-full flex-1 min-h-0 [@media(min-height:700px)]:overflow-hidden">
        {/* Floor Progress */}
        <Card className="flex flex-col p-4 xl:p-5 rounded-2xl border border-border bg-surface xl:col-span-2 justify-between min-h-0 [@media(min-height:700px)]:overflow-hidden">
          <div className="flex items-center justify-between xl:justify-start gap-8 shrink-0 mb-3 xl:mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Production Timeline</p>
              <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-text-primary">Floor Progress</h2>
            </div>
            
            {/* Header Stage Metrics Row (placed beside floor progress heading) */}
            <div className="hidden lg:flex [@media(max-height:699px)]:hidden items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl border border-border bg-surface-secondary/30 text-left min-w-[155px] shadow-sm flex flex-col justify-between h-[64px]">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary block leading-none">Queue</span>
                <span className="font-bold text-xs text-text-primary mt-1 block leading-tight">Orders Received</span>
                <span className="text-[9px] text-text-secondary mt-1 block leading-none">{todayOrders} new orders today</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl border border-border bg-surface-secondary/30 text-left min-w-[155px] shadow-sm flex flex-col justify-between h-[64px]">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary block leading-none">Ops</span>
                <span className="font-bold text-xs text-text-primary mt-1 block leading-tight">Cutting</span>
                <span className="text-[9px] text-text-secondary mt-1 block leading-none">{activeWorkersCount} in motion</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl border border-border bg-surface-secondary/30 text-left min-w-[155px] shadow-sm flex flex-col justify-between h-[64px]">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary block leading-none">Quality</span>
                <span className="font-bold text-xs text-text-primary mt-1 block leading-tight">QC</span>
                <span className="text-[9px] text-text-secondary mt-1 block leading-none">{pendingReviews} waiting review</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl border border-border bg-surface-secondary/30 text-left min-w-[155px] shadow-sm flex flex-col justify-between h-[64px]">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary block leading-none">Dispatch</span>
                <span className="font-bold text-xs text-text-primary mt-1 block leading-tight">Ready</span>
                <span className="text-[9px] text-text-secondary mt-1 block leading-none">{reportsGenerated} proof reports</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-center">
            <FloorProgressList recentOrders={recentOrders} />
          </div>
        </Card>

        {/* Needs Attention */}
        <Card className="flex flex-col p-4 xl:p-5 rounded-2xl border border-border bg-surface justify-between min-h-0 [@media(min-height:700px)]:overflow-hidden">
          <div className="flex flex-col gap-3 xl:gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between gap-3 shrink-0 border-b border-border/60 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Floor Status</p>
                <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-text-primary">Factory signals</h2>
              </div>
              <AlertTriangle className="h-5 w-5 text-[var(--warning)] shrink-0" />
            </div>

            {/* Counts */}
            <div className="space-y-2 shrink-0">
              <SignalRow label="Pending verification" value={pendingReviews} icon={<CircleDashed className="h-4 w-4" />} />
              <SignalRow label="Active workers" value={activeWorkersCount} icon={<Sparkles className="h-4 w-4" />} />
              <SignalRow label="Reports generated" value={reportsGenerated} icon={<CheckCircle2 className="h-4 w-4" />} />
            </div>

            {/* Live Operators Horizontal Marquee Ribbon */}
            <div className="mt-auto pt-3 border-t border-border/60 [@media(max-height:699px)]:hidden w-full overflow-hidden relative">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes marquee {
                  0% { transform: translateX(0%); }
                  100% { transform: translateX(-50%); }
                }
                .animate-marquee-scroll {
                  display: flex;
                  width: max-content;
                  animation: marquee 25s linear infinite;
                }
                .animate-marquee-scroll:hover {
                  animation-play-state: paused;
                }
              `}} />
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-text-tertiary mb-3">Live Operators</p>
              
              <div className="relative w-full overflow-hidden bg-surface-2/40 border border-border/40 rounded-xl py-2.5 px-3">
                {activeWorkersList.length === 0 ? (
                  <p className="text-[11px] text-text-tertiary text-center">No active operators on floor</p>
                ) : (
                  <div className="flex overflow-hidden select-none w-full">
                    {/* Duplicate list to ensure seamless looping marquee scroll */}
                    <div className="animate-marquee-scroll flex items-center gap-6">
                      {[...activeWorkersList, ...activeWorkersList, ...activeWorkersList].map((worker, idx) => (
                        <div key={`${worker.id}-${idx}`} className="flex items-center gap-2 text-xs shrink-0 pr-4">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                          </span>
                          <span className="font-semibold text-text-primary">{worker.name}</span>
                          <span className="text-[9px] bg-success-soft/20 text-success border border-success/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">Online</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </section>
      
      <div className="shrink-0">
        <FactoryFeed initialEvents={feedEvents} />
      </div>
    </div>
  );
}

function SignalRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-border bg-surface-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-[var(--brand)] shadow-sm">
          {icon}
        </span>
        <p className="text-sm font-medium text-text-primary">{label}</p>
      </div>
      <p className="font-mono text-xl font-semibold tracking-[-0.04em] text-text-primary">{value}</p>
    </div>
  );
}
