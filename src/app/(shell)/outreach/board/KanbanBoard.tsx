"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ErrorState, Field, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const REJECTION_REASONS = [
  "NoFit",
  "NoBudget",
  "NoTiming",
  "NotInterested",
  "WrongPerson",
  "RevisitLater",
  "LostToCompetitor",
  "LostOnPrice",
  "LostOnScopeTrust",
] as const;

const TERMINAL_LABEL: Record<string, string> = {
  not_a_fit: "Not a fit",
  unresponsive: "Unresponsive",
  lost: "Lost",
  deferred: "Deferred",
  disqualified: "Disqualified",
};

type Lead = { id: string; companyName: string; state: string; track: string; qualityScore: number | null };

/**
 * Native HTML5 drag-and-drop (Task 109 Phase G §1) — deliberately no new
 * dependency. Every drop calls the existing `advance_stage` command; a
 * column that is not a legal transition from the card's current state is
 * simply not a drop target (`legalMoves` mirrors the same
 * `TransitionDefinition` rows `LeadActions.tsx` reads for its own buttons).
 */
export function KanbanBoard({
  leads,
  legalMoves,
  stages,
  terminalStates,
}: {
  leads: Lead[];
  legalMoves: Record<string, string[]>;
  stages: string[];
  terminalStates: string[];
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dropOverColumn, setDropOverColumn] = useState<string | null>(null);
  const [terminalPrompt, setTerminalPrompt] = useState<{ leadId: string; options: string[] } | null>(null);
  const [reason, setReason] = useState<(typeof REJECTION_REASONS)[number]>("NoFit");
  const [terminalTarget, setTerminalTarget] = useState<string>("");

  const byId = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const columns = useMemo(() => {
    const byState = new Map<string, Lead[]>();
    for (const l of leads) {
      if (terminalStates.includes(l.state)) continue; // grouped into the single terminal bucket below
      (byState.get(l.state) ?? byState.set(l.state, []).get(l.state)!).push(l);
    }
    const terminalLeads = leads.filter((l) => terminalStates.includes(l.state));
    return { byState, terminalLeads };
  }, [leads, terminalStates]);

  const advance = (leadId: string, toState: string, rejectionReason?: string) => {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand("verity.outreach.advance_stage", { leadId, toState, rejectionReason }, "/outreach/board");
      if (result.ok) {
        setTerminalPrompt(null);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  };

  const handleDrop = (columnKey: string) => {
    setDropOverColumn(null);
    if (!dragLeadId) return;
    const lead = byId.get(dragLeadId);
    setDragLeadId(null);
    if (!lead) return;
    const legal = legalMoves[lead.state] ?? [];
    if (columnKey === "__terminal__") {
      const options = legal.filter((s) => terminalStates.includes(s));
      if (options.length === 0) return;
      setTerminalTarget(options[0]!);
      setTerminalPrompt({ leadId: lead.id, options });
      return;
    }
    if (!legal.includes(columnKey) || columnKey === lead.state) return;
    advance(lead.id, columnKey);
  };

  return (
    <div>
      {failure && (
        <div className="mb-4">
          <ErrorState title="Could not move the lead" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}

      {terminalPrompt && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
          <Field label="Terminal state" htmlFor="terminalTarget">
            <Select id="terminalTarget" value={terminalTarget} onChange={(e) => setTerminalTarget(e.target.value)}>
              {terminalPrompt.options.map((s) => (
                <option key={s} value={s}>
                  {TERMINAL_LABEL[s] ?? s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason" htmlFor="terminalReason">
            <Select id="terminalReason" value={reason} onChange={(e) => setReason(e.target.value as (typeof REJECTION_REASONS)[number])}>
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/([A-Z])/g, " $1").trim()}
                </option>
              ))}
            </Select>
          </Field>
          <Button size="sm" disabled={pending} onClick={() => advance(terminalPrompt.leadId, terminalTarget, reason)}>
            Confirm
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setTerminalPrompt(null)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stageKey) => {
          const cards = columns.byState.get(stageKey) ?? [];
          const isDropTarget = dropOverColumn === stageKey;
          return (
            <div
              key={stageKey}
              onDragOver={(e) => {
                e.preventDefault();
                setDropOverColumn(stageKey);
              }}
              onDragLeave={() => setDropOverColumn((c) => (c === stageKey ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stageKey);
              }}
              className={`flex w-[260px] shrink-0 flex-col rounded-xl border p-2 transition-colors ${
                isDropTarget ? "border-accent bg-accent/5" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <h3 className="m-0 text-[12px] font-medium capitalize text-text-secondary">{stageKey.replace(/_/g, " ")}</h3>
                <span className="tabular text-[11px] text-text-tertiary">{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragLeadId(lead.id)}
                    onDragEnd={() => setDragLeadId(null)}
                    className="cursor-grab rounded-lg border border-line bg-glass-2 p-3 text-[13px] active:cursor-grabbing"
                  >
                    <a href={`/outreach/${lead.id}`} className="font-medium text-text no-underline hover:underline">
                      {lead.companyName}
                    </a>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge tone="neutral">{lead.track}</Badge>
                      {lead.qualityScore != null && <span className="tabular text-[11px] text-text-tertiary">score {lead.qualityScore}</span>}
                    </div>
                  </div>
                ))}
                {cards.length === 0 && <p className="px-2 py-3 text-center text-[12px] text-text-tertiary">Drop here</p>}
              </div>
            </div>
          );
        })}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropOverColumn("__terminal__");
          }}
          onDragLeave={() => setDropOverColumn((c) => (c === "__terminal__" ? null : c))}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop("__terminal__");
          }}
          className={`flex w-[260px] shrink-0 flex-col rounded-xl border p-2 transition-colors ${
            dropOverColumn === "__terminal__" ? "border-danger bg-danger-subtle" : "border-danger/25 bg-surface"
          }`}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <h3 className="m-0 text-[12px] font-medium text-danger">Lost / Not a fit</h3>
            <span className="tabular text-[11px] text-text-tertiary">{columns.terminalLeads.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {columns.terminalLeads.map((lead) => (
              <div key={lead.id} className="rounded-lg border border-line bg-glass-2 p-3 text-[13px] opacity-75">
                <a href={`/outreach/${lead.id}`} className="font-medium text-text no-underline hover:underline">
                  {lead.companyName}
                </a>
                <div className="mt-1.5">
                  <span className="rounded-full border border-danger/25 bg-danger-subtle px-2 py-0.5 text-[11px] text-danger">
                    {TERMINAL_LABEL[lead.state] ?? lead.state}
                  </span>
                </div>
              </div>
            ))}
            {columns.terminalLeads.length === 0 && <p className="px-2 py-3 text-center text-[12px] text-text-tertiary">None</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
