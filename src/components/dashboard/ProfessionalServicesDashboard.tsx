import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { BarRow, Nothing, Panel, StatRow, hoursLabel } from "./shared";

/**
 * Professional services — a business that sells people's time.
 *
 * The question is not throughput, it is whether the month was billable. So the
 * page leads with utilisation and the pipeline behind it: work in hand, work
 * coming, and money owed.
 */

/** The order a deal moves through. Stage is free text, so unknown ones fall to the end. */
const PIPELINE_STAGES = ["PROSPECTING", "QUALIFIED", "PROPOSAL", "WON"] as const;

export async function ProfessionalServicesDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const today = new Date();

  const [openProjects, overdueTasks, deals, pendingInvoices, timesheets] =
    await Promise.all([
      prisma.project.count({ where: { factoryId, status: { in: ["PLANNING", "ACTIVE"] } } }),
      // Overdue means past its date and not finished — a cancelled task is not a
      // problem anybody needs to see on a dashboard.
      prisma.task.count({
        where: {
          factoryId,
          dueDate: { lt: today },
          status: { notIn: ["DONE", "CANCELLED"] },
        },
      }),
      prisma.deal.groupBy({
        by: ["stage"],
        where: { factoryId, stage: { notIn: ["WON", "LOST"] } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      // Sent and overdue are money owed. A draft has not been asked for yet.
      prisma.serviceInvoice.aggregate({
        where: { factoryId, status: { in: ["SENT", "OVERDUE"] } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.timesheetEntry.groupBy({
        by: ["billable"],
        where: { factoryId, date: { gte: monthStart } },
        _sum: { hours: true },
      }),
    ]);

  const loggedHours = timesheets.reduce((n, row) => n + (row._sum.hours ?? 0), 0);
  const billableHours = timesheets
    .filter((row) => row.billable)
    .reduce((n, row) => n + (row._sum.hours ?? 0), 0);

  /*
   * Billable utilisation: hours a client pays for, over hours worked.
   *
   * Not "logged ÷ rostered". Rostered hours live on ShiftSchedule, which belongs
   * to the `scheduling` module, and this pack does not carry it — the entitlement
   * test caught the query. Adding the module to satisfy a metric would push the
   * à la carte total to ₹30,000 and drop the pack out of its discount band, which
   * is the tail wagging the dog.
   *
   * This is also the number a consultancy actually runs on: an agency with no
   * roster still knows what share of its week was billable.
   */
  const utilisation = loggedHours > 0 ? Math.round((billableHours / loggedHours) * 100) : null;

  const owed = pendingInvoices._sum.total ?? 0;

  const stageRows = deals
    .map((row) => ({
      label: row.stage,
      value: row._sum.amount ?? 0,
      count: row._count._all,
    }))
    .sort(
      (a, b) =>
        (PIPELINE_STAGES.indexOf(a.label as never) + 1 || 99) -
        (PIPELINE_STAGES.indexOf(b.label as never) + 1 || 99),
    );
  const widestStage = Math.max(1, ...stageRows.map((row) => row.value));
  const pipelineValue = stageRows.reduce((n, row) => n + row.value, 0);

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader title={`Welcome ${firstName}`} />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric href="/owner/projects" label="Open Projects" value={String(openProjects)} detail="Planning or active" tone="blue" />
        <Metric
          href="/owner/projects"
          label="Overdue Tasks"
          value={String(overdueTasks)}
          detail="Past due date"
          tone={overdueTasks > 0 ? "red" : "green"}
        />
        <Metric
          href="/owner/billing"
          label="Owed"
          value={`₹${Math.round(owed).toLocaleString("en-IN")}`}
          detail={`${pendingInvoices._count._all} unpaid`}
          tone="amber"
        />
        <Metric
          href="/owner/team"
          label="Utilisation"
          value={utilisation === null ? "—" : `${utilisation}%`}
          detail="Billable share of hours"
          tone={utilisation !== null && utilisation < 60 ? "red" : "green"}
        />
      </section>

      <section className="grid w-full flex-1 items-stretch gap-4 xl:grid-cols-3 xl:gap-6">
        <Panel
          eyebrow="Pipeline"
          title="Deals by stage"
          className="xl:col-span-2"
          action={
            pipelineValue > 0 ? (
              <span className="shrink-0 font-mono text-[13px] text-text-tertiary">
                ₹{Math.round(pipelineValue).toLocaleString("en-IN")}
              </span>
            ) : null
          }
        >
          {stageRows.length === 0 ? (
            <Nothing href="/owner/crm" cta="Add a deal">
              No open deals. Work you are chasing appears here, ranked by stage.
            </Nothing>
          ) : (
            <>
              <div className="space-y-3">
                {stageRows.map((row) => (
                  <BarRow
                    key={row.label}
                    label={`${row.label} · ${row.count}`}
                    value={Math.round(row.value)}
                    max={widestStage}
                    tone="warn"
                  />
                ))}
              </div>
              <p className="mt-4 text-[11px] text-text-tertiary">
                Won and lost deals are excluded — this is what is still in play.
              </p>
            </>
          )}
        </Panel>

        <Panel eyebrow="This month" title="Time">
          <div className="space-y-2">
            <StatRow label="Billable hours" value={hoursLabel(billableHours)} tone="good" />
            <StatRow
              label="Logged hours"
              value={hoursLabel(loggedHours)}
              detail={
                loggedHours > billableHours
                  ? `${hoursLabel(loggedHours - billableHours)} non-billable`
                  : undefined
              }
            />
          </div>
        </Panel>
      </section>
    </div>
  );
}
