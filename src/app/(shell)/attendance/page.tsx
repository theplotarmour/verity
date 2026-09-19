import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { ATTENDANCE_CAPABILITY } from "@/server/capabilities/attendance";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { runQuery } from "@/server/actions/platform";
import { PageHeader, Stat, StatRow, ErrorState } from "@/components/ui/primitives";
import { AttendanceBoard } from "./AttendanceBoard";
import { PayrollAndShifts } from "./PayrollAndShifts";

export const dynamic = "force-dynamic";

type Dashboard = { present: number; absent: number; late: number; onLeave: number };
type ShiftRow = { id: string; employeeId: string; date: string; label: string; startTime: string; endTime: string };

/** §39-40, 42 — today's check-ins, who to mark, payroll inputs, and shifts. */
async function AttendancePage() {
  const actor = await requireActor();
  const today = new Date().toISOString().slice(0, 10);

  const [dashboardResult, shiftsResult, employees, locations] = await Promise.all([
    runQuery<Dashboard>("verity.attendance.get_dashboard", { date: today }),
    runQuery<ShiftRow[]>("verity.attendance.list_shifts", {}),
    withTenant(actor.tenantId, (tx) =>
      tx.hrEmployee.findMany({ where: { active: true }, include: { party: true } }),
    ),
    withTenant(actor.tenantId, (tx) => tx.location.findMany({ select: { id: true, name: true } })),
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
      <div className="mt-6">
        <PayrollAndShifts
          employees={employees.map((e) => ({ id: e.id, name: e.party.displayName }))}
          locations={locations}
          shifts={shiftsResult.ok ? shiftsResult.data : []}
          employeeName={(id) => employees.find((e) => e.id === id)?.party.displayName ?? "Unknown"}
        />
      </div>
    </>
  );
}

export default withCapabilityPageAccess(ATTENDANCE_CAPABILITY, AttendancePage);
