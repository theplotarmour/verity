import Link from "next/link";
import { Camera, PackageSearch, Plus } from "lucide-react";

import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { BarRow, Nothing, Panel, StatRow } from "./shared";

/**
 * Franchise — Retail.
 *
 * Same network shape as QSR, different question. A retail store network lives or
 * dies on stock being in the right place and the shop floor looking the way the
 * brand says it should, so this pairs sales against compliance rather than
 * showing either alone: a store selling well while failing its standards audit
 * is a different problem from one doing neither, and a single number hides that.
 *
 * Stores are Sites, for the same reason outlets are.
 */
export async function RetailFranchiseDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [stores, salesByStore, audits, stockLevels, onHold, recentAudits, salesToday] =
    await Promise.all([
      prisma.site.findMany({
        where: { factoryId, status: "ACTIVE" },
        select: { id: true, name: true, city: true, createdAt: true },
        orderBy: { name: "asc" },
        take: 40,
      }),
      // Orders are the sales signal a store network already produces.
      prisma.salesOrder.groupBy({
        by: ["customerId"],
        where: { factoryId, orderDate: { gte: thirtyDaysAgo } },
        _count: { id: true },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 6,
      }),
      prisma.serviceInspection.findMany({
        where: { factoryId, createdAt: { gte: thirtyDaysAgo } },
        select: { siteId: true, status: true },
      }),
      // Stock on hand is a ledger, not a column — the level is the sum of every
      // movement. Grouped in the database; the reorder comparison happens below,
      // because the threshold lives on a different table.
      prisma.stockLedgerEntry.groupBy({
        by: ["itemId"],
        where: { factoryId },
        _sum: { quantityChange: true },
      }),
      prisma.site.count({ where: { factoryId, status: "ON_HOLD" } }),
      prisma.serviceInspection.findMany({
        where: { factoryId },
        select: {
          id: true,
          status: true,
          site: { select: { name: true } },
          checklist: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.salesOrder.count({ where: { factoryId, orderDate: { gte: dayStart } } }),
    ]);

  /*
   * Reorder alerts.
   *
   * An item is below threshold when its ledger balance is at or under its own
   * `minStockLevel`. A flat "under 10" would flag every low-volume item and
   * miss a fast mover running out at 200 — the threshold is per item because
   * the right number is per item.
   *
   * Items with a threshold of zero are excluded: that is the default for
   * everything nobody has configured, and treating it as "alert at zero" would
   * bury the real alerts under the whole catalogue.
   */
  const balances = new Map(
    stockLevels.map((row) => [row.itemId, row._sum.quantityChange ?? 0]),
  );
  const trackedItems =
    balances.size > 0
      ? await prisma.itemMaster.findMany({
          where: {
            factoryId,
            id: { in: [...balances.keys()] },
            minStockLevel: { gt: 0 },
          },
          select: { id: true, name: true, defaultUOM: true, minStockLevel: true },
        })
      : [];

  const lowStock = trackedItems
    .map((item) => ({
      id: item.id,
      name: item.name,
      uom: item.defaultUOM,
      onHand: balances.get(item.id) ?? 0,
      threshold: item.minStockLevel,
    }))
    .filter((item) => item.onHand <= item.threshold)
    .sort((a, b) => a.onHand - b.onHand)
    .slice(0, 6);

  const customerNames = new Map<string, string>();
  if (salesByStore.length > 0) {
    const customers = await prisma.customer.findMany({
      where: { factoryId, id: { in: salesByStore.map((s) => s.customerId) } },
      select: { id: true, name: true },
    });
    for (const c of customers) customerNames.set(c.id, c.name);
  }

  const byStore = new Map<string, { done: number; passed: number }>();
  for (const audit of audits) {
    if (!audit.siteId) continue;
    if (audit.status !== "APPROVED" && audit.status !== "REJECTED") continue;
    const row = byStore.get(audit.siteId) ?? { done: 0, passed: 0 };
    row.done++;
    if (audit.status === "APPROVED") row.passed++;
    byStore.set(audit.siteId, row);
  }

  const compliance = stores
    .map((store) => {
      const row = byStore.get(store.id);
      return {
        id: store.id,
        name: store.name,
        city: store.city,
        score: row ? Math.round((row.passed / row.done) * 100) : null,
      };
    })
    .sort((a, b) => (a.score ?? 999) - (b.score ?? 999))
    .slice(0, 6);

  const scored = compliance.filter((s) => s.score !== null);
  const networkCompliance =
    scored.length > 0
      ? Math.round(scored.reduce((n, s) => n + (s.score ?? 0), 0) / scored.length)
      : null;

  const topSales = salesByStore[0]?._sum.totalAmount ?? 0;
  const revenue30d = salesByStore.reduce((n, s) => n + (s._sum.totalAmount ?? 0), 0);

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader
        title={`Welcome ${firstName}`}
        actions={
          <Link href="/owner/sites">
            <Button className="h-9 gap-2 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New Store
            </Button>
          </Link>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric
          href="/owner/sites"
          label="Stores"
          value={String(stores.length)}
          detail={onHold > 0 ? `${onHold} on hold` : "Trading"}
          tone="blue"
        />
        <Metric href="/owner/production" label="Orders Today" value={String(salesToday)} detail="Across the network" tone="green" />
        <Metric
          href="/owner/qc-floor"
          label="Visual Standards"
          value={networkCompliance === null ? "—" : `${networkCompliance}%`}
          detail={networkCompliance === null ? "No audits yet" : "Compliance, 30 days"}
          tone={networkCompliance !== null && networkCompliance >= 85 ? "green" : "amber"}
        />
        <Metric
          href="/owner/inventory"
          label="Reorder Alerts"
          value={String(lowStock.length)}
          detail="Below threshold"
          tone={lowStock.length > 0 ? "red" : "green"}
        />
      </section>

      <section className="grid w-full flex-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <Panel
          eyebrow="Last 30 days"
          title="Sales against standards"
          className="xl:col-span-2"
          action={
            revenue30d > 0 ? (
              <span className="shrink-0 font-mono text-[13px] text-text-tertiary">
                ₹{Math.round(revenue30d).toLocaleString("en-IN")}
              </span>
            ) : null
          }
        >
          {salesByStore.length === 0 && compliance.length === 0 ? (
            <Nothing href="/owner/sites" cta="Add your first store">
              No stores or sales recorded yet.
            </Nothing>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
                  Revenue
                </p>
                {salesByStore.length === 0 ? (
                  <p className="text-[12px] text-text-tertiary">No orders in the window.</p>
                ) : (
                  <div className="space-y-3">
                    {salesByStore.map((row) => (
                      <BarRow
                        key={row.customerId}
                        label={customerNames.get(row.customerId) ?? "Unknown"}
                        value={Math.round(row._sum.totalAmount ?? 0)}
                        max={Math.round(topSales) || 1}
                        tone="good"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
                  Compliance
                </p>
                {compliance.length === 0 ? (
                  <p className="text-[12px] text-text-tertiary">No stores yet.</p>
                ) : (
                  <div className="space-y-3">
                    {compliance.map((store) =>
                      store.score === null ? (
                        <div key={store.id} className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[13px] font-medium text-text-primary">
                            {store.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-text-tertiary">Not audited</span>
                        </div>
                      ) : (
                        <BarRow
                          key={store.id}
                          label={store.name}
                          value={store.score}
                          max={100}
                          suffix="%"
                          tone={store.score >= 85 ? "good" : store.score >= 70 ? "warn" : "bad"}
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>

        <Panel
          eyebrow="Distribution"
          title="Reorder triggers"
          action={<PackageSearch className="h-5 w-5 shrink-0 text-text-tertiary" />}
        >
          {lowStock.length === 0 ? (
            <Nothing href="/owner/inventory" cta="Open inventory">
              Nothing is below its reorder threshold.
            </Nothing>
          ) : (
            <div className="space-y-2">
              {lowStock.map((row) => (
                <StatRow
                  key={row.id}
                  href="/owner/inventory"
                  label={row.name}
                  detail={`Reorder at ${row.threshold} ${row.uom ?? ""}`.trim()}
                  value={`${row.onHand} ${row.uom ?? ""}`.trim()}
                  tone={row.onHand <= 0 ? "bad" : "warn"}
                />
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="grid w-full gap-4 xl:gap-6">
        <Panel
          eyebrow="Visual merchandising"
          title="Recent store audits"
          action={<Camera className="h-5 w-5 shrink-0 text-text-tertiary" />}
        >
          {recentAudits.length === 0 ? (
            <Nothing href="/owner/qc-templates" cta="Build a standards checklist">
              No store audits yet. Build a visual-standards checklist with photo checkpoints and
              area managers can complete it on their phone.
            </Nothing>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {recentAudits.map((audit) => (
                <StatRow
                  key={audit.id}
                  label={audit.checklist?.name ?? "Audit"}
                  detail={audit.site?.name ?? "No store"}
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
