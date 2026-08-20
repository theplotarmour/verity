import { enforceRole } from "@/lib/server/auth";
import { getDictionary } from "@/lib/i18n";
import { CalendarDays, ArrowRight, User as UserIcon } from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { Button } from "@/components/ui/primitives";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { hasModule } from "@/platform/modules/entitlements";
import { getMySchedule } from "@/server/actions/scheduling";

export const dynamic = "force-dynamic";

/**
 * The Employee shell's landing screen.
 *
 * This used to be a job-card queue: the department's stage cards, each linking
 * into `/worker/stage/[id]` or the QC inspection flow. Those cards belonged to
 * the manufacturing module and went with it — and they were the wrong screen
 * for three of the four verticals anyway. A cafe cook and a site cleaner were
 * both being shown cutting and stitching stages.
 *
 * What is left is what every vertical shares: who you are, where you are
 * rostered, and the two places you can go. The roster block only appears for a
 * tenant that publishes one, so a factory without `scheduling` sees a shift
 * card that is absent rather than empty.
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

  const rostered = user?.factory
    ? await hasModule(user.factory.organizationId, "scheduling")
    : false;
  // Two weeks is what the Schedule tab shows; the next entry is today's shift
  // when there is one, and otherwise the soonest upcoming one.
  const shifts = rostered ? await getMySchedule(14) : [];
  const nextShift = shifts[0] ?? null;

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
            Next shift
          </p>
          {nextShift ? (
            <>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-text-primary">
                {nextShift.shiftName}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {new Date(nextShift.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}{" "}
                · {nextShift.shiftTime}
                {nextShift.siteName ? ` · ${nextShift.siteName}` : ""}
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
