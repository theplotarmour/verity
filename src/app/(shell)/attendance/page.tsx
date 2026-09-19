import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { ATTENDANCE_CAPABILITY } from "@/server/capabilities/attendance";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { runQuery } from "@/server/actions/platform";
import { PageHeader, Stat, StatRow, ErrorState } from "@/components/ui/primitives";
import { AttendanceBoard } from "./AttendanceBoard";

export const dynamic = "force-dynamic";

type Dashboard = { present: number; absent: number; late: number; onLeave: number };

/** §39-40, 42 — today's check-ins, and who to mark. */
async function AttendancePage() {
  const actor = await requireActor();
  const today = new Date().toISOString().slice(0, 10);

  const [dashboardResult, employees] = await Promise.all([
    runQuery<Dashboard>("verity.attendance.get_dashboard", { date: today }),
    withTenant(actor.tenantId, (tx) =>
      tx.hrEmployee.findMany({ where: { active: true }, include: { party: true } }),
    ),
  ]);

  if (!dashboardResult.ok) return <ErrorState title="Could not load attendance" message={dashboardResult.message} issues={dashboardResult.issues} retryable={dashboardResult.retryable} />;
  const dashboard = dashboardResult.data;

  return (
    <>
      <PageHeader title="Attendance" description={`Today, ${new Date(today).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}.`} />
      <StatRow cols={4} className="mb-6">
        <Stat label="Present" value={dashboard.present} />
        <Stat label="Late" value={dashboard.late} />
        <Stat label="Absent" value={dashboard.absent} />
        <Stat label="On leave" value={dashboard.onLeave} />
      </StatRow>
      <AttendanceBoard
        today={today}
        employees={employees.map((e) => ({ id: e.id, name: e.party.displayName }))}
      />
    </>
  );
}

export default withCapabilityPageAccess(ATTENDANCE_CAPABILITY, AttendancePage);
