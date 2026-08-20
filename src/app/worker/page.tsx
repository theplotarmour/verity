import { enforceRole } from "@/lib/server/auth";
import { getDictionary } from "@/lib/i18n";
import { CalendarDays, ArrowRight, ChevronRight, MapPin, User as UserIcon } from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { Button } from "@/components/ui/primitives";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { hasModule } from "@/platform/modules/entitlements";
import { getMySchedule } from "@/server/actions/scheduling";
import { getMyServiceJobs } from "@/server/actions/helpdesk";

export const dynamic = "force-dynamic";

const IST = "Asia/Kolkata";
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  hour: "numeric",
  minute: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  weekday: "long",
  day: "numeric",
  month: "short",
});
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: IST });

const PRIORITY_STYLE: Record<string, string> = {
  URGENT: "bg-danger-soft text-danger",
  HIGH: "bg-warning-soft text-warning",
  MEDIUM: "bg-surface-2 text-text-secondary",
  LOW: "bg-surface-2 text-text-tertiary",
};

/**
 * My Day — the Employee shell's landing screen.
 *
 * This used to be a job-card queue: the department's stage cards, each linking
 * into `/worker/stage/[id]` or the QC inspection flow. Those cards belonged to
 * the manufacturing module and went with it — and they were the wrong screen
 * for every surviving vertical anyway. A cafe cook and a site cleaner were both
 * being shown cutting and stitching stages.
 *
 * What replaces them is what a deskless worker actually needs before a shift:
 * where they are rostered, and what is assigned to them. Both blocks are
 * entitlement-gated and *absent* rather than empty when a tenant does not run
 * that module — a shift card reading "nothing rostered" in a shop with no
 * roster implies their manager forgot to publish one.
 *
 * No analytics, no settings, no filters. Everything is a full-width tap target
 * because this is read one-handed, standing up, on a phone.
 */
export default async function WorkerHome() {
  const session = await enforceRole(["WORKER", "SUPERVISOR"]);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      language: true,
      name: true,
      role: true,
      department: { select: { name: true } },
      factory: { select: { organizationId: true } },
    },
  });

  const dict = getDictionary(user?.language || session.language);
  const displayName = user?.name || "Worker";
  const isSupervisor = user?.role === "SUPERVISOR";
  const deptName = user?.department?.name ?? null;

  const organizationId = user?.factory?.organizationId;
  const rostered = organizationId ? await hasModule(organizationId, "scheduling") : false;

  // Both reads are cheap and independent; the shell should not wait on one to
  // start the other.
  const [shifts, jobs] = await Promise.all([
    rostered ? getMySchedule(14) : Promise.resolve([]),
    getMyServiceJobs(),
  ]);

  const todayKey = dayKeyFmt.format(new Date());
  const todayShift = shifts.find((s) => dayKeyFmt.format(new Date(s.date)) === todayKey) ?? null;
  // Falls back to the next rostered day, so somebody checking the night before
  // still sees when they are due in.
  const nextShift = todayShift ?? shifts[0] ?? null;

  return (
    <div className="space-y-4 overflow-x-hidden">
      <Surface className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
          {dict.goodMorning}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-text-primary">
          {displayName}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          {deptName ? (
            <span className="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">
              {deptName}
            </span>
          ) : (
            <span className="text-text-tertiary">No department assigned</span>
          )}
          <span className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
            {isSupervisor ? "Supervisor" : "Worker"}
          </span>
        </p>
      </Surface>

      {rostered && (
        <Surface className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            {todayShift ? "Today" : "Next shift"}
          </p>
          {nextShift ? (
            <>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-text-primary">
                {nextShift.shiftName} · {nextShift.shiftTime}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-text-secondary">
                <span>{dayFmt.format(new Date(nextShift.date))}</span>
                {nextShift.siteName && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {nextShift.siteName}
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">
              Nothing rostered in the next two weeks.
            </p>
          )}
          <Link href="/worker/schedule" className="mt-4 block">
            <Button className="w-full">
              <CalendarDays className="mr-2 h-4 w-4" />
              My schedule
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
          </Link>
        </Surface>
      )}

      {jobs.length > 0 && (
        <section className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            My jobs · {jobs.length}
          </p>
          {jobs.map((job) => (
            <Link key={job.id} href={`/worker/jobs/${job.id}`} className="block">
              <Surface className="flex min-h-16 items-center gap-3 p-4 transition active:scale-[0.99]">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                      {job.woNumber}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        PRIORITY_STYLE[job.priority] ?? PRIORITY_STYLE.MEDIUM
                      }`}
                    >
                      {job.priority}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-base font-semibold text-text-primary">
                    {job.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    {job.siteName ?? "No site"}
                    {job.scheduledAt ? ` · ${timeFmt.format(new Date(job.scheduledAt))}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-text-tertiary" />
              </Surface>
            </Link>
          ))}
        </section>
      )}

      <Surface className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
          {dict.profile || "Profile"}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Your details, language and sign-out.
        </p>
        <Link href="/worker/profile" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            <UserIcon className="mr-2 h-4 w-4" />
            Open profile
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </Link>
      </Surface>
    </div>
  );
}
