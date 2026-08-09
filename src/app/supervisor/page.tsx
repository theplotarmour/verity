import { getWorkerJobs } from "@/server/actions/worker";
import { enforceRole } from "@/lib/server/auth";
import { getDictionary } from "@/lib/i18n";
import { Calendar, ArrowRight } from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { Button } from "@/components/ui/primitives";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SupervisorHome() {
  const session = await enforceRole(["SUPERVISOR"]);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { language: true, name: true, department: { select: { name: true, isQcStage: true } } },
  });

  if (user?.department?.isQcStage) {
    const { redirect } = await import("next/navigation");
    redirect("/inspector");
  }

  // A supervisor only sees work that has been SUBMITTED for their approval — not
  // their workers' in-progress or unstarted cards. Approving one advances it to
  // the next department.
  const allDeptJobs = await getWorkerJobs();
  const jobs = allDeptJobs.filter((j: any) => j.status === "AWAITING_APPROVAL");
  const dict = getDictionary(user?.language || session.language);
  const deptName = user?.department?.name ?? null;
  const awaitingApproval = jobs.length;

  return (
    <div className="space-y-4 overflow-x-hidden">
      <Surface className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">{dict.goodMorning}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-text-primary">{user?.name || "Supervisor"}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          {deptName ? (
            <span className="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
              {deptName}
            </span>
          ) : (
            <span className="text-text-tertiary">No department assigned</span>
          )}
          <span className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">Supervisor</span>
        </p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">Awaiting approval</p>
            <p className="font-mono text-[44px] font-semibold tracking-[-0.05em] text-text-primary">{jobs.length}</p>
          </div>
          {awaitingApproval > 0 ? (
            <div className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-warning">
              {awaitingApproval} to approve
            </div>
          ) : (
            <div className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-success">
              {dict.ready}
            </div>
          )}
        </div>
      </Surface>

      {jobs.length > 0 ? (
        <div className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            {deptName ? `${deptName} - submitted for approval` : "Submitted for approval"}
          </p>
          <div className="grid gap-3">
            {jobs.map((job: any) => {
              const isBlocked = job.status === "BLOCKED";
              const isRework = job.status === "REWORK_REQUIRED";
              const stg = job.stage ?? job.department ?? null;
              const stageName = stg?.name ?? null;
              const href = stg && !stg.isQcStage ? `/supervisor/stage/${job.id}` : `/inspector`;
              return (
                <Surface key={job.id} className="p-4 overflow-hidden">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">{job.batchNumber}</p>
                        {stageName && (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                            {stageName}
                          </span>
                        )}
                        {isRework && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger">Rework</span>}
                        {isBlocked && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-tertiary">Locked</span>}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-text-primary truncate">
                        {job.order.itemName || job.order.productName || job.order.orderNumber}
                      </h3>
                      <p className="mt-1 text-sm text-text-secondary break-words">
                        {job.order.orderNumber} - {job.quantity ?? 1} units
                        {(job.order.specDetails ?? []).slice(0, 3).map((d: any) => d.value).filter(Boolean).length > 0
                          ? ` - ${(job.order.specDetails ?? []).slice(0, 3).map((d: any) => d.value).filter(Boolean).join(", ")}`
                          : ""}
                      </p>
                      {job.reworkReason ? <p className="mt-2 text-xs font-semibold text-danger">QC: {job.reworkReason}</p> : null}
                    </div>
                    {isBlocked ? (
                      <Button disabled variant="secondary" className="w-full min-w-[120px] shrink-0 sm:w-auto sm:self-center whitespace-nowrap opacity-60">
                        Locked
                      </Button>
                    ) : (
                      <Link href={href} className="shrink-0 sm:self-center w-full sm:w-auto">
                        <Button className="w-full min-w-[120px] sm:w-auto whitespace-nowrap">
                          {job.status === "AWAITING_APPROVAL" ? "Review" : dict.start}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </Surface>
              );
            })}
          </div>
        </div>
      ) : (
        <Surface className="p-8 text-center">
          <Calendar className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-base font-semibold text-text-primary">No department assignments</p>
          <p className="mt-1 text-sm text-text-secondary">Worker submissions from your department will appear here for review and approval.</p>
        </Surface>
      )}
    </div>
  );
}
