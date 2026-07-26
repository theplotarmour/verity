"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Play, Clock, PauseCircle, ShieldCheck, Users, ArrowRight, Search, Factory, Package,
} from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { cn } from "@/lib/utils";

// The Floor: one card per department showing its live workload (what's running,
// who's on it, which orders) — each card opens the department's full live page.

type Job = {
  id: string;
  status: string;
  worker: { id: string; name: string; role: string } | null;
  order: { soNumber: string; customer: string | null; brand: string | null; model: string | null; product: string | null };
};
type Dept = {
  id: string;
  name: string;
  isQcStage: boolean;
  members: Array<{ id: string; name: string; role: string }>;
  activeCount: number;
  inProgressCount: number;
  waitingCount: number;
  blockedCount: number;
  jobs: Job[];
};

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg", tone)}>{icon}</span>
      <div className="leading-tight">
        <p className="text-sm font-bold text-text-primary">{value}</p>
        <p className="text-[9px] uppercase tracking-wide text-text-tertiary">{label}</p>
      </div>
    </div>
  );
}

function orderLine(o: Job["order"]) {
  const veh = [o.brand, o.model].filter(Boolean).join(" ");
  return [veh || null, o.product].filter(Boolean).join(" · ") || o.soNumber;
}

export function FloorClient({ departments }: { departments: Dept[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = departments.filter((d) => !query || d.name.toLowerCase().includes(query));

  return (
    <div className="space-y-5">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search department…"
          className="h-9 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>

      {shown.length === 0 ? (
        <Surface className="p-10 text-center text-sm text-text-tertiary">No departments yet.</Surface>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((d) => (
            <Link key={d.id} href={`/owner/floor/${d.id}`} className="group block">
              <Surface className="h-full p-5 transition-all hover:border-[var(--brand)]/40 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl",
                      d.isQcStage ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "bg-surface-2 text-text-secondary")}>
                      {d.isQcStage ? <ShieldCheck className="h-5 w-5" /> : <Factory className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">{d.name}</h3>
                      <p className="text-[11px] text-text-tertiary">{d.members.length} staff · {d.activeCount} active</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" />
                </div>

                <div className="mb-4 flex items-center gap-4 rounded-xl border border-border/60 bg-surface-2/40 px-3 py-2">
                  <Stat icon={<Play className="h-3.5 w-3.5" />} value={d.inProgressCount} label="Running" tone="bg-[var(--brand)]/10 text-[var(--brand)]" />
                  <Stat icon={<Clock className="h-3.5 w-3.5" />} value={d.waitingCount} label="Waiting" tone="bg-warning/10 text-warning" />
                  <Stat icon={<PauseCircle className="h-3.5 w-3.5" />} value={d.blockedCount} label="Blocked" tone="bg-danger/10 text-danger" />
                </div>

                {d.jobs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-[11px] text-text-tertiary">
                    Nothing on this department right now.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {d.jobs.map((j) => (
                      <li key={j.id} className="flex items-center gap-2 rounded-lg bg-surface-2/40 px-2.5 py-1.5">
                        <Package className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-text-primary">{orderLine(j.order)}</span>
                        <span className="shrink-0 text-[10px] text-text-tertiary">{j.worker?.name?.split(" ")[0] ?? "—"}</span>
                      </li>
                    ))}
                    {d.activeCount > d.jobs.length && (
                      <li className="px-2.5 text-[10px] font-medium text-[var(--brand)]">+{d.activeCount - d.jobs.length} more</li>
                    )}
                  </ul>
                )}

                {d.members.length > 0 && (
                  <div className="mt-4 flex items-center gap-1.5 border-t border-border/50 pt-3">
                    <Users className="h-3.5 w-3.5 text-text-tertiary" />
                    <p className="truncate text-[11px] text-text-tertiary">{d.members.map((m) => m.name.split(" ")[0]).join(", ")}</p>
                  </div>
                )}
              </Surface>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
