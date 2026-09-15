"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Panel } from "@/components/ui/primitives";
import { runQuery } from "@/server/actions/platform";

const QUEUES = [
  { key: "New", label: "New" },
  { key: "NeedsResearch", label: "Needs research" },
  { key: "Stale", label: "Stale" },
  { key: "HighPriority", label: "High priority" },
  { key: "AdvancePending", label: "Advance pending" },
] as const;

type LeadRow = { id: string; companyName: string };

/** Lead review queues (Task 106 Phase 6, spec §78) — scoped to this team. */
export function LeadQueuePanel({ teamId }: { teamId: string }) {
  const [active, setActive] = useState<(typeof QUEUES)[number]["key"] | null>(null);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [pending, startTransition] = useTransition();

  function select(queue: (typeof QUEUES)[number]["key"]) {
    if (active === queue) {
      setActive(null);
      return;
    }
    setActive(queue);
    startTransition(async () => {
      const result = await runQuery<LeadRow[]>("verity.outreach.lead_queue", { teamId, queue });
      setRows(result.ok ? result.data : []);
    });
  }

  return (
    <Panel title="Lead queues">
      <div className="flex flex-wrap gap-2">
        {QUEUES.map((q) => (
          <Button key={q.key} size="sm" variant={active === q.key ? "primary" : "secondary"} onClick={() => select(q.key)}>
            {q.label}
          </Button>
        ))}
      </div>
      {active && (
        <div className="mt-4">
          {pending ? (
            <p className="text-[13px] text-text-tertiary">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-[13px] text-text-tertiary">Nothing in this queue.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/outreach/${r.id}`} className="text-[13px] text-text no-underline hover:text-accent-ink hover:underline">
                    {r.companyName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
