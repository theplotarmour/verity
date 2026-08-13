import { CalendarCheck2, Clock, IndianRupee } from "lucide-react";

import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/design/PageHeader";
import { Metric } from "@/components/design/Metric";
import { formatMenuPrice } from "@/lib/menu";
import { bookingDayRange, LIVE_APPOINTMENT_STATUSES } from "@/lib/booking";
import { UpcomingBookingsWidget } from "./widgets/BookingWidgets";

/**
 * Lifestyle Services OS — a salon, spa or studio, live.
 *
 * The day is the appointment book, so that is what leads: how many slots today,
 * how many still unconfirmed, what the day is worth if everyone shows, and the
 * next few names through the door. Reuses the booking widget for the list rather
 * than restating the query.
 */
export async function LifestyleServicesDashboard({
  factoryId,
  firstName,
}: {
  factoryId: string;
  firstName: string;
}) {
  const { start, end } = bookingDayRange();

  const today = await prisma.appointment.findMany({
    where: { factoryId, startTime: { gte: start, lt: end } },
    select: { status: true, pricePaise: true },
  });

  const live = today.filter((a) => LIVE_APPOINTMENT_STATUSES.includes(a.status));
  const pending = today.filter((a) => a.status === "PENDING").length;
  const expected = live.reduce((n, a) => n + a.pricePaise, 0);

  return (
    <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
      <PageHeader title={`Welcome ${firstName}`} />

      <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-3 xl:gap-4">
        <Metric
          href="/owner/booking"
          label="Today's bookings"
          value={String(live.length)}
          detail={live.length === 1 ? "on the book" : "on the book"}
          hero
          icon={<CalendarCheck2 className="h-4 w-4" />}
        />
        <Metric
          href="/owner/booking"
          label="Unconfirmed"
          value={String(pending)}
          detail="Awaiting confirmation"
          tone={pending > 0 ? "amber" : "green"}
        />
        <Metric
          href="/owner/booking"
          label="Expected today"
          value={formatMenuPrice(expected)}
          detail="If everyone shows"
          tone="blue"
        />
      </section>

      <section className="grid w-full flex-1 items-stretch gap-4 xl:grid-cols-2 xl:gap-6">
        <UpcomingBookingsWidget factoryId={factoryId} />
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-6 text-text-secondary">
          <IndianRupee className="mb-3 h-6 w-6 text-text-tertiary" />
          <h2 className="font-display text-lg font-semibold text-text-primary">The day at a glance</h2>
          <p className="mt-2 text-sm">
            {live.length === 0
              ? "No appointments booked for today yet. Open the book to add one."
              : `${live.length} appointment${live.length === 1 ? "" : "s"} today, ${pending} still to confirm, worth ${formatMenuPrice(expected)} if everyone shows.`}
          </p>
          <div className="mt-auto flex items-center gap-2 pt-4 text-[12px] text-text-tertiary">
            <Clock className="h-3.5 w-3.5" /> Times shown in IST.
          </div>
        </div>
      </section>
    </div>
  );
}
