"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Badge, Panel } from "@/components/ui/primitives";
import { runQuery } from "@/server/actions/platform";

const QUEUES = [
  { key: "Overdue", label: "Overdue" },
  { key: "DueToday", label: "Due today" },
  { key: "NoNextAction", label: "No next action" },
  // "At risk" reuses the existing Stale queue kind (staleness per
  // `deriveLeadHealth`'s own threshold) rather than inventing a second
  // score — Task 114 P0.1's own text says to reuse it.
  { key: "Stale", label: "At risk" },
] as const;

type QueueKey = (typeof QUEUES)[number]["key"];
type LeadRow = { id: string; companyName: string; nextActionAt: string | null };

/**
 * Task 114 P0.1 — the "what do I do next" queue. Unlike `LeadQueuePanel`
 * (team-leader-only, one team, the original 5 spec-§78 kinds), this is
 * viewer-scoped across every team the actor can see: `listLeadQueue` is
 * team-scoped only, so a Founder/Senior gets one call per visible team,
 * merged and re-sorted client-side (per the Task 114 handoff's own
 * recommendation — zero backend change for the common case of a handful
 * of teams).
 */
export function WorkQueuePanel({ teamIds }: { teamIds: string[] }) {
  const [active, setActive] = useState<QueueKey>("Overdue");
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (teamIds.length === 0) return;
    startTransition(async () => {
      const results = await Promise.all(
        teamIds.map((teamId) => runQuery<LeadRow[]>("verity.outreach.lead_queue", { teamId, queue: active })),
      );
      const merged = results.flatMap((r) => (r.ok ? r.data : []));
      const byId = new Map(merged.map((r) => [r.id, r]));
      const deduped = [...byId.values()].sort((a, b) => {
        if (!a.nextActionAt) return 1;
        if (!b.nextActionAt) return -1;
        return a.nextActionAt.localeCompare(b.nextActionAt);
      });
      setRows(deduped.slice(0, 25));
    });
  }, [active, teamIds.join(",")]);

  if (teamIds.length === 0) return null;

  return (
    <Panel title="Work queue">
      <div className="flex flex-wrap gap-2">
        {QUEUES.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => setActive(q.key)}
            className={
              "rounded-pill border px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
              (active === q.key
                ? "border-transparent bg-accent-subtle text-accent-ink"
                : "border-line text-text-secondary hover:bg-surface-sunken hover:text-text")
            }
          >
            {q.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {pending ? (
          <p className="text-[13px] text-text-tertiary">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Nothing in this queue.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-none last:pb-0">
                <Link href={`/outreach/${r.id}`} className="min-w-0 truncate text-[13px] text-text no-underline hover:text-accent-ink hover:underline">
                  {r.companyName}
                </Link>
                {r.nextActionAt && (
                  <Badge>{new Date(r.nextActionAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
