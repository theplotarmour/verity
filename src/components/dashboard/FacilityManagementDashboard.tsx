import Link from "next/link";
import { AlertTriangle, MapPin, Plus } from "lucide-react";

import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { BarRow, Nothing, Panel, StatRow, hoursLabel } from "./shared";

/**
 * Facility management — a field-service operation.
 *
 * The question is not "what is being made" but "is somebody where they should
 * be, and is anything about to breach". Both are time-relative, so everything
 * here is computed against now rather than shown as a total.
 */
export async function FacilityManagementDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const now = new Date();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  // The window that makes an SLA worth showing: breaching within the shift.
  const soon = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const [
    activeSites,
    todaysShifts,
    attendedShifts,
    onDuty,
    openTickets,
    breached,
    breachingSoon,
    slaRisk,
    ticketsBySite,
    recentInspections,
  ] = await Promise.all([
    prisma.site.count({ where: { factoryId, status: "ACTIVE" } }),
    prisma.shiftSchedule.count({ where: { factoryId, date: { gte: dayStart, lt: dayEnd } } }),
    // Counted separately rather than derived from the list below: that list is
    // capped at 8 for display, so dividing it by the full total would report a
    // 40-guard operation as 20% covered.
    prisma.shiftSchedule.count({
      where: {
        factoryId,
        date: { gte: dayStart, lt: dayEnd },
        status: { in: ["ATTENDED", "SWAPPED"] },
      },
    }),
    prisma.shiftSchedule.findMany({
      where: { factoryId, date: { gte: dayStart, lt: dayEnd } },
      select: {
        id: true,
        status: true,
        user: { select: { name: true } },
        site: { select: { name: true } },
        shift: { select: { name: true, startTime: true, endTime: true } },
      },
      orderBy: { date: "asc" },
      take: 8,
    }),
    prisma.ticket.count({ where: { factoryId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    // Already past due and still open — the ones that have failed, not the ones
    // that might.
    prisma.ticket.count({
      where: {
        factoryId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        slaDueAt: { lt: now },
      },
    }),
    prisma.ticket.count({
      where: {
        factoryId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        slaDueAt: { gte: now, lt: soon },
      },
    }),
    prisma.ticket.findMany({
      where: {
        factoryId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        slaDueAt: { not: null, lt: soon },
      },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        priority: true,
        slaDueAt: true,
        site: { select: { name: true } },
      },
      orderBy: { slaDueAt: "asc" },
      take: 6,
    }),
    prisma.ticket.groupBy({
      by: ["siteId"],
      where: { factoryId, status: { in: ["OPEN", "IN_PROGRESS"] }, siteId: { not: null } },
      _count: { siteId: true },
      orderBy: { _count: { siteId: "desc" } },
      take: 5,
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
      take: 5,
    }),
  ]);

  const siteNames = new Map<string, string>();
  if (ticketsBySite.length > 0) {
    const sites = await prisma.site.findMany({
      where: {
        factoryId,
        id: { in: ticketsBySite.map((t) => t.siteId).filter((id): id is string => !!id) },
      },
      select: { id: true, name: true },
    });
    for (const s of sites) siteNames.set(s.id, s.name);
  }

  const worstSite = ticketsBySite[0]?._count.siteId ?? 0;
  const coverage = todaysShifts === 0 ? 0 : Math.round((attendedShifts / todaysShifts) * 100);

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader
        title={`Welcome ${firstName}`}
        actions={
          <Link href="/owner/helpdesk">
            <Button className="h-9 gap-2 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New Ticket
            </Button>
          </Link>
        }
      />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <Metric href="/owner/sites" label="Active Sites" value={String(activeSites)} detail="Under contract" tone="blue" />
        <Metric href="/owner/scheduling" label="Shift Coverage" value={`${coverage}%`} detail={`${todaysShifts} scheduled today`} tone={coverage >= 90 ? "green" : "amber"} />
        <Metric href="/owner/helpdesk" label="Open Tickets" value={String(openTickets)} detail="Awaiting resolution" tone="amber" />
        <Metric href="/owner/helpdesk" label="SLA Breached" value={String(breached)} detail={`${breachingSoon} due within 4h`} tone={breached > 0 ? "red" : "green"} />
      </section>

      <section className="grid w-full flex-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <Panel
          eyebrow="Today"
          title="Live shift tracker"
          className="xl:col-span-2"
          action={
            <Link href="/owner/scheduling" className="shrink-0 text-[12px] font-semibold text-[var(--brand)]">
              Roster →
            </Link>
          }
        >
          {onDuty.length === 0 ? (
            <Nothing href="/owner/scheduling" cta="Build today's roster">
              Nobody is scheduled today. Assign guards or technicians to sites and their check-ins
              appear here.
            </Nothing>
          ) : (
            <div className="space-y-2">
              {onDuty.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface-2 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {shift.user?.name ?? "Unassigned"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-text-tertiary">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {shift.site?.name ?? "No site"} · {shift.shift?.name ?? "—"}
                      {shift.shift ? ` ${shift.shift.startTime}–${shift.shift.endTime}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      shift.status === "ATTENDED"
                        ? "border-success/20 bg-success-soft/20 text-success"
                        : shift.status === "ABSENT"
                          ? "border-[var(--brand)]/20 bg-[var(--brand)]/10 text-[var(--brand)]"
                          : "border-border bg-surface text-text-secondary"
                    }`}
                  >
                    {shift.status.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          eyebrow="Service level"
          title="SLA alerts"
          action={<AlertTriangle className={`h-5 w-5 shrink-0 ${breached > 0 ? "text-[var(--brand)]" : "text-text-tertiary"}`} />}
        >
          {slaRisk.length === 0 ? (
            <Nothing>
              Nothing is breaching in the next four hours. Tickets with a due time appear here as
              they approach it.
            </Nothing>
          ) : (
            <div className="space-y-2">
              {slaRisk.map((ticket) => {
                const due = ticket.slaDueAt!;
                const overdue = due < now;
                const delta = Math.abs(due.getTime() - now.getTime()) / 3_600_000;
                return (
                  <StatRow
                    key={ticket.id}
                    href="/owner/helpdesk"
                    label={ticket.subject}
                    detail={`${ticket.ticketNumber} · ${ticket.site?.name ?? "No site"}`}
                    value={overdue ? `+${hoursLabel(delta)}` : hoursLabel(delta)}
                    tone={overdue ? "bad" : "warn"}
                  />
                );
              })}
            </div>
          )}
        </Panel>
      </section>

      <section className="grid w-full gap-4 xl:grid-cols-2 xl:gap-6">
        <Panel eyebrow="Load" title="Sites needing attention">
          {ticketsBySite.length === 0 ? (
            <Nothing href="/owner/sites" cta="Add a site">
              No open tickets against any site.
            </Nothing>
          ) : (
            <div className="space-y-3">
              {ticketsBySite.map((row) => (
                <BarRow
                  key={row.siteId}
                  label={siteNames.get(row.siteId!) ?? "Unknown site"}
                  value={row._count.siteId}
                  max={worstSite}
                  tone="warn"
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Quality" title="Site inspections">
          {recentInspections.length === 0 ? (
            <Nothing href="/owner/qc-templates" cta="Create a checklist">
              No site inspections recorded. Attach a checklist to a work order and completed
              inspections land here.
            </Nothing>
          ) : (
            <div className="space-y-2">
              {recentInspections.map((inspection) => (
                <StatRow
                  key={inspection.id}
                  label={inspection.checklist?.name ?? "Inspection"}
                  detail={inspection.site?.name ?? "No site"}
                  value={inspection.status === "APPROVED" ? "Pass" : inspection.status === "REJECTED" ? "Fail" : "Open"}
                  tone={
                    inspection.status === "APPROVED"
                      ? "good"
                      : inspection.status === "REJECTED"
                        ? "bad"
                        : "neutral"
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
