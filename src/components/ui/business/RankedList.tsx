import Link from "next/link";
import { EmptyState, Panel } from "@/components/ui/primitives";

/**
 * A ranked top-N list — platform-wide, entity-agnostic. Generic enough for
 * Top Customers, Top Items, or any future capability's own leaderboard;
 * nothing here knows what a customer or a product is.
 */

export type RankedItem = {
  id: string;
  /** One or two letters for the badge — the caller decides how to derive
   *  initials for its own entity, this component just renders the string. */
  initials: string;
  label: string;
  sublabel?: string;
  value: string;
  href?: string;
};

export function RankedList({
  title,
  items,
  period,
}: {
  title: string;
  items: RankedItem[];
  /** e.g. "This month" — shown next to the title, not a live control. */
  period?: string;
}) {
  return (
    <Panel
      title={title}
      action={period ? <span className="text-[12px] text-text-tertiary">{period}</span> : undefined}
    >
      {items.length === 0 ? (
        <EmptyState compact title="Nothing yet this period" />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {items.map((item) => {
            const row = (
              <>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-subtle text-[12px] font-medium text-accent-ink">
                  {item.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-text">{item.label}</span>
                  {item.sublabel && (
                    <span className="block text-[12px] text-text-tertiary">{item.sublabel}</span>
                  )}
                </span>
                <span className="tabular shrink-0 text-[13px] text-text">{item.value}</span>
              </>
            );
            return (
              <li key={item.id} className="flex items-center gap-3">
                {item.href ? (
                  <Link href={item.href} className="flex flex-1 items-center gap-3 no-underline text-text">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
