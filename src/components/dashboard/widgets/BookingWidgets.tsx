import Link from "next/link";

import prisma from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { LIVE_APPOINTMENT_STATUSES } from "@/lib/booking";
import { Nothing, Panel } from "../shared";

export interface WidgetProps {
  factoryId: string;
}

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * The next handful of appointments still on the book — the one thing a salon
 * owner opening the dashboard wants to see. Only live statuses, soonest first,
 * and only from now on: a completed or cancelled slot is not "upcoming".
 */
export async function UpcomingBookingsWidget({ factoryId }: WidgetProps) {
  const rows = await prisma.appointment.findMany({
    where: {
      factoryId,
      status: { in: LIVE_APPOINTMENT_STATUSES },
      startTime: { gte: new Date() },
    },
    orderBy: { startTime: "asc" },
    take: 8,
    select: {
      id: true,
      customerName: true,
      serviceName: true,
      pricePaise: true,
      startTime: true,
      staff: { select: { name: true } },
    },
  });

  return (
    <Panel eyebrow="Booking" title="Upcoming appointments" className="w-full h-full">
      {rows.length === 0 ? (
        <Nothing href="/owner/booking" cta="Open the book">
          Nothing booked yet. Add an appointment and it shows up here.
        </Nothing>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href="/owner/booking"
                className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-surface-2 px-3 py-2 transition-colors hover:border-[var(--brand)]/40"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-text-primary">
                    {row.customerName}
                  </span>
                  <span className="block truncate text-[12px] text-text-secondary">
                    {row.serviceName}
                    {row.staff?.name ? ` · ${row.staff.name}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[11px] text-text-tertiary">
                    {timeFmt.format(row.startTime)}
                  </span>
                  {row.pricePaise > 0 ? (
                    <span className="block font-mono text-[12px] font-semibold text-text-primary">
                      {formatPaise(row.pricePaise)}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
