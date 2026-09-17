"use client";

import { useState, type ReactNode } from "react";

export type TabDef = {
  id: string;
  label: string;
  /** Shown as a small count badge beside the label when > 0 — lets a reader
   *  see "Contacts (0)" is empty without opening the tab. */
  count?: number;
  content: ReactNode;
};

/**
 * Record-detail tab strip (Task 114 P1.5 item 3). Local state, not URL —
 * every tab's content is already fetched in one server round trip on this
 * page (the record detail query does not vary by tab), so there is nothing
 * for a URL param to preserve across a reload that server data doesn't
 * already restore identically.
 */
export function Tabs({ tabs, defaultTab }: { tabs: TabDef[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div role="tablist" className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={
              "relative -mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors " +
              (t.id === active
                ? "border-accent text-text"
                : "border-transparent text-text-tertiary hover:text-text-secondary")
            }
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular leading-none " +
                  (t.id === active ? "bg-accent-subtle text-accent-ink" : "bg-surface-sunken text-text-tertiary")
                }
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  );
}
