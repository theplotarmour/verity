import Link from "next/link";
import { EmptyState, Panel } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";

/**
 * A "needs a human" list — platform-wide, entity-agnostic.
 *
 * NOT Task 90's platform-wide Attention contribution point (that stays
 * gated behind its own ADR — see `taskplans/90_attention_platform_concept.md`).
 * This is the reusable RENDERING pattern only: any capability's own page
 * can compose its own local list of `{ severity, label, sublabel, href }`
 * items — plywood's Overview does that today, querying its own signals
 * directly (`needsAttention` in `finance.ts`) — without a shared
 * cross-capability query or registry existing yet.
 */

export type AttentionSeverity = "high" | "medium";

export type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  label: string;
  sublabel?: string;
  href: string;
};

export function AttentionList({
  items,
  viewAllHref,
}: {
  items: AttentionItem[];
  viewAllHref?: string;
}) {
  return (
    <Panel
      title="Needs Attention"
      action={
        items.length > 0 ? (
          <span className="rounded-full bg-danger-subtle px-2 py-0.5 text-[12px] font-medium text-danger">
            {items.length}
          </span>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState compact title="Nothing needs you right now" />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-2.5 no-underline text-text hover:text-text"
              >
                <span
                  className={
                    "mt-1.5 size-1.5 shrink-0 rounded-full " +
                    (item.severity === "high" ? "bg-danger" : "bg-warning")
                  }
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-text">{item.label}</span>
                  {item.sublabel && (
                    <span className="block text-[12px] text-text-tertiary">{item.sublabel}</span>
                  )}
                </span>
                <Icon name="chevronRight" size={14} className="mt-1 shrink-0 text-text-tertiary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {viewAllHref && items.length > 0 && (
        <Link
          href={viewAllHref}
          className="mt-4 flex items-center gap-1 text-[12px] text-accent-ink no-underline hover:underline"
        >
          View all <Icon name="chevronRight" size={12} />
        </Link>
      )}
    </Panel>
  );
}
