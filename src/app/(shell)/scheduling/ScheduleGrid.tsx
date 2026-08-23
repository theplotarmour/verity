"use client";

import { useMemo } from "react";

/**
 * Resource-by-time grid.
 *
 * Renders a fixed 14-day window because that is what the data supports; there is
 * no infinite scroll pretending at a calendar the platform cannot paginate.
 * Bars are positioned by proportion of the window, so a booking's width carries
 * its duration — which is the whole reason not to use a table here.
 *
 * Every bar is also a list item with a text label, so the information is
 * available to a screen reader and does not depend on seeing the geometry.
 */
export function ScheduleGrid({
  resources,
  bookings,
  unavailable,
}: {
  resources: Array<{ id: string; name: string; backing: string }>;
  bookings: Array<{ id: string; resourceId: string; startsAt: string; endsAt: string; subject: string }>;
  unavailable: Array<{ id: string; resourceId: string; startsAt: string; endsAt: string }>;
}) {
  const { start, end, days } = useMemo(() => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start.getTime() + 14 * 86_400_000);
    const days = Array.from({ length: 14 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
    return { start, end, days };
  }, []);

  const span = end.getTime() - start.getTime();
  const position = (fromIso: string, toIso: string) => {
    const from = Math.max(new Date(fromIso).getTime(), start.getTime());
    const to = Math.min(new Date(toIso).getTime(), end.getTime());
    if (to <= from) return null;
    return { left: ((from - start.getTime()) / span) * 100, width: ((to - from) / span) * 100 };
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <div className="min-w-[720px]">
          {/* Day scale */}
          <div className="flex border-b border-line pl-[180px]" aria-hidden="true">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="flex-1 text-[11px] text-text-tertiary text-center py-1.5 border-l border-line first:border-l-0 tabular"
              >
                {day.getUTCDate()}
              </div>
            ))}
          </div>

          <ul className="list-none m-0 p-0">
            {resources.map((resource) => {
              const rowBookings = bookings.filter((b) => b.resourceId === resource.id);
              const rowBlocks = unavailable.filter((w) => w.resourceId === resource.id);

              return (
                <li key={resource.id} className="flex items-stretch border-b border-line last:border-b-0">
                  <div className="w-[180px] shrink-0 px-4 py-3">
                    <p className="text-text m-0 truncate">{resource.name}</p>
                    <p className="text-[13px] text-text-tertiary m-0">{resource.backing}</p>
                  </div>

                  <div className="relative flex-1 my-2 mr-3">
                    {rowBlocks.map((block) => {
                      const pos = position(block.startsAt, block.endsAt);
                      if (!pos) return null;
                      return (
                        <div
                          key={block.id}
                          className="absolute top-0 bottom-0 rounded-sm bg-surface-sunken border border-line-strong"
                          style={{ left: `${pos.left}%`, width: `${Math.max(pos.width, 0.6)}%` }}
                          title="Unavailable"
                        />
                      );
                    })}
                    {rowBookings.map((booking) => {
                      const pos = position(booking.startsAt, booking.endsAt);
                      if (!pos) return null;
                      return (
                        <div
                          key={booking.id}
                          className="absolute top-0 bottom-0 rounded-sm bg-accent-subtle border border-accent px-1.5 overflow-hidden"
                          style={{ left: `${pos.left}%`, width: `${Math.max(pos.width, 1.2)}%` }}
                          title={`${booking.subject}: ${booking.startsAt} → ${booking.endsAt}`}
                        >
                          <span className="text-[11px] text-accent-ink whitespace-nowrap">{booking.subject}</span>
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* The same information without the geometry. */}
      <details>
        <summary className="text-[13px] text-text-secondary cursor-pointer">
          Bookings as a list ({bookings.length})
        </summary>
        <ul className="mt-2 mb-0 pl-5 text-[13px] text-text-secondary">
          {bookings.map((b) => (
            <li key={b.id}>
              {resources.find((r) => r.id === b.resourceId)?.name ?? "Unknown resource"} — {b.subject}:{" "}
              {b.startsAt.replace("T", " ").slice(0, 16)} → {b.endsAt.replace("T", " ").slice(0, 16)}
            </li>
          ))}
        </ul>
      </details>

      <p className="text-[13px] text-text-tertiary m-0">
        14-day window · times shown in UTC.
      </p>
    </div>
  );
}
