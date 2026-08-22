import Link from "next/link";
import { AlertTriangle, ClipboardCheck, Plus } from "lucide-react";

import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { BarRow, Nothing, Panel, StatRow } from "./shared";

/**
 * Franchise — QSR.
 *
 * An outlet network is a fleet of near-identical operations, so the useful view
 * is comparative: not "how did we do" but "which outlet is the outlier". Every
 * panel here ranks rather than totals.
 *
 * Outlets are Sites. A franchise outlet and a serviced site are the same shape —
 * a place with a manager, a roster and a checklist — and giving the franchise
 * its own near-identical table would have been a second thing to keep in step.
 */
export async function QsrFranchiseDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [outlets, auditsToday, openIssues, inspections, recentAudits, purchaseLines] =
    await Promise.all([
      prisma.site.findMany({
        where: { factoryId, status: "ACTIVE" },
        select: { id: true, name: true, city: true },
        orderBy: { name: "asc" },
        take: 40,
      }),
      prisma.serviceInspection.count({ where: { factoryId, createdAt: { gte: dayStart } } }),
      prisma.ticket.count({ where: { factoryId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      // Every audit in the window, with its outcome, so a per-outlet score can be
      // computed. Selected narrow — this is a count exercise, not a detail view.
      prisma.serviceInspection.findMany({
        where: { factoryId, createdAt: { gte: thirtyDaysAgo } },
        select: { siteId: true, status: true },
      }),
      prisma.serviceInspection.findMany({
        where: { factoryId },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          site: { select: { name: true } },
          checklist: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      // Price audit input: what each outlet actually paid, per item.
      prisma.purchaseOrderItem.findMany({
        where: {
          purchaseOrder: { factoryId, orderDate: { gte: thirtyDaysAgo } },
          rate: { gt: 0 },
        },
        select: {
          rate: true,
          quantity: true,
          material: { select: { id: true, name: true } },
          purchaseOrder: { select: { supplier: { select: { name: true } } } },
        },
        take: 500,
      }),
    ]);

  // Compliance per outlet: approved audits over completed audits. An outlet with
  // no audits is not scored — showing it as 0% would read as a failing outlet
  // rather than an unvisited one.
  const byOutlet = new Map<string, { done: number; passed: number }>();
  for (const inspection of inspections) {
    if (!inspection.siteId) continue;
    if (inspection.status !== "APPROVED" && inspection.status !== "REJECTED") continue;
    const row = byOutlet.get(inspection.siteId) ?? { done: 0, passed: 0 };
    row.done++;
    if (inspection.status === "APPROVED") row.passed++;
    byOutlet.set(inspection.siteId, row);
  }

  const scorecard = outlets
    .map((outlet) => {
      const row = byOutlet.get(outlet.id);
      return {
        id: outlet.id,
        name: outlet.name,
        city: outlet.city,
        audited: !!row,
        score: row ? Math.round((row.passed / row.done) * 100) : null,
        audits: row?.done ?? 0,
      };
    })
    .sort((a, b) => (a.score ?? 999) - (b.score ?? 999))
    .slice(0, 6);

  const scored = scorecard.filter((o) => o.score !== null);
  const networkScore =
    scored.length > 0
      ? Math.round(scored.reduce((n, o) => n + (o.score ?? 0), 0) / scored.length)
      : null;

  /*
   * Price audit.
   *
   * The approved rate is the median of what the network paid for that item, not
   * the mean: one outlet paying ten times the going rate is exactly the case
   * this is meant to catch, and a mean would let that outlier drag the
   * benchmark up toward itself and hide it.
   */
  const ratesByItem = new Map<string, { name: string; rates: number[] }>();
  for (const line of purchaseLines) {
    if (!line.material) continue;
    const entry = ratesByItem.get(line.material.id) ?? { name: line.material.name, rates: [] };
    entry.rates.push(line.rate);
    ratesByItem.set(line.material.id, entry);
  }

  const priceAlerts: { item: string; paid: number; benchmark: number; over: number }[] = [];
  for (const [, entry] of ratesByItem) {
    // Two data points cannot establish a benchmark, only a disagreement.
    if (entry.rates.length < 3) continue;
    const sorted = [...entry.rates].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const highest = sorted[sorted.length - 1];
    if (median > 0 && highest > median * 1.15) {
      priceAlerts.push({
        item: entry.name,
        paid: highest,
        benchmark: median,
        over: Math.round(((highest - median) / median) * 100),
      });
    }
  }
  priceAlerts.sort((a, b) => b.over - a.over);

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader
        title={`Welcome ${firstName}`}
        actions={
          <Link href="/owner/sites">
            <Button className="h-9 gap-2 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New Outlet
            </Button>
          </Link>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric href="/owner/sites" label="Outlets" value={String(outlets.length)} detail="Trading" tone="blue" />
        <Metric
          href="/owner/qc-floor"
          label="Network Score"
          value={networkScore === null ? "—" : `${networkScore}%`}
          detail={networkScore === null ? "No audits yet" : "Compliance, 30 days"}
          tone={networkScore !== null && networkScore >= 85 ? "green" : "amber"}
        />
        <Metric href="/owner/qc-floor" label="Audits Today" value={String(auditsToday)} detail="Hygiene & SOP" tone="green" />
        <Metric href="/owner/helpdesk" label="Open Issues" value={String(openIssues)} detail="Across the network" tone={openIssues > 0 ? "amber" : "green"} />
      </section>

      <section className="grid w-full flex-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <Panel
          eyebrow="Last 30 days"
          title="Outlet health scorecard"
          className="xl:col-span-2"
          action={
            <Link href="/owner/sites" className="shrink-0 text-[12px] font-semibold text-[var(--brand)]">
              All outlets →
            </Link>
          }
        >
          {outlets.length === 0 ? (
            <Nothing href="/owner/sites" cta="Add your first outlet">
              No outlets yet. Add them and each one gets its own roster, checklists and score.
            </Nothing>
          ) : (
            <>
              <div className="space-y-3">
                {scorecard.map((outlet) =>
                  outlet.score === null ? (
                    <div key={outlet.id} className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-medium text-text-primary">
                        {outlet.name}
                        {outlet.city ? (
                          <span className="text-text-tertiary"> · {outlet.city}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[11px] text-text-tertiary">Not yet audited</span>
                    </div>
                  ) : (
                    <BarRow
                      key={outlet.id}
                      label={`${outlet.name}${outlet.city ? ` · ${outlet.city}` : ""}`}
                      value={outlet.score}
                      max={100}
                      suffix="%"
                      tone={outlet.score >= 85 ? "good" : outlet.score >= 70 ? "warn" : "bad"}
                    />
                  ),
                )}
              </div>
              <p className="mt-4 text-[11px] text-text-tertiary">
                Worst first. Score is passed audits over completed audits; outlets with no audit in
                the window are listed but not scored.
              </p>
            </>
          )}
        </Panel>

        <Panel
          eyebrow="Procurement"
          title="Price audit"
          action={
            <AlertTriangle
              className={`h-5 w-5 shrink-0 ${priceAlerts.length > 0 ? "text-[var(--warning)]" : "text-text-tertiary"}`}
            />
          }
        >
          {priceAlerts.length === 0 ? (
            <Nothing href="/owner/purchase" cta="Record purchases">
              No outlet is paying materially above the network rate. Alerts appear once an item has
              been bought at least three times.
            </Nothing>
          ) : (
            <div className="space-y-2">
              {priceAlerts.slice(0, 5).map((alert) => (
                <StatRow
                  key={alert.item}
                  href="/owner/purchase"
                  label={alert.item}
                  detail={`Paid ₹${alert.paid.toFixed(0)} vs ₹${alert.benchmark.toFixed(0)} network median`}
                  value={`+${alert.over}%`}
                  tone={alert.over > 40 ? "bad" : "warn"}
                />
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="grid w-full gap-4 xl:gap-6">
        <Panel
          eyebrow="Kitchen SOP"
          title="Recent audits"
          action={<ClipboardCheck className="h-5 w-5 shrink-0 text-text-tertiary" />}
        >
          {recentAudits.length === 0 ? (
            <Nothing href="/owner/qc-templates" cta="Build an SOP checklist">
              No SOP or hygiene audits recorded yet. Create a checklist and outlet managers can
              complete it from the mobile app.
            </Nothing>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {recentAudits.map((audit) => (
                <StatRow
                  key={audit.id}
                  label={audit.checklist?.name ?? "Audit"}
                  detail={audit.site?.name ?? "No outlet"}
                  value={
                    audit.status === "APPROVED" ? "Pass" : audit.status === "REJECTED" ? "Fail" : "Open"
                  }
                  tone={
                    audit.status === "APPROVED" ? "good" : audit.status === "REJECTED" ? "bad" : "neutral"
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}
