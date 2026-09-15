"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Panel } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";

type CheckIn = {
  id: string;
  partyName: string;
  summary: string;
  mostImportantDevelopment: string | null;
  needsAttention: string | null;
  currentReviewStatus: "Submitted" | "Reviewed" | "NeedsClarification";
};

/**
 * Team Leader review of today's check-ins (Task 106 Phase 5, spec §68-71).
 * Review is an append-only row (see `reviewCheckIn`'s doc comment) — this
 * never edits the Junior's own submission, only adds a review verdict.
 */
export function CheckInReviewPanel({ checkIns }: { checkIns: CheckIn[] }) {
  const router = useRouter();
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function review(checkInId: string, reviewStatus: "Reviewed" | "NeedsClarification", leaderFeedback?: string) {
    startTransition(async () => {
      const result = await runCommand("verity.outreach.review_check_in", { checkInId, reviewStatus, leaderFeedback }, "/outreach/team");
      if (result.ok) {
        setFeedbackFor(null);
        router.refresh();
      }
    });
  }

  if (checkIns.length === 0) {
    return (
      <Panel title="Today's check-ins">
        <p className="text-[13px] text-text-tertiary">No check-ins submitted yet today.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Today's check-ins">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {checkIns.map((c) => (
          <li key={c.id} className="flex flex-col gap-1.5 border-b border-line pb-3 last:border-none last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] text-text">{c.partyName}</span>
              <Badge tone={c.currentReviewStatus === "Reviewed" ? "accent" : "neutral"}>
                {c.currentReviewStatus.replace(/([A-Z])/g, " $1").trim()}
              </Badge>
            </div>
            <span className="text-[13px] text-text-secondary">{c.summary}</span>
            {c.mostImportantDevelopment && (
              <span className="text-[12px] text-text-tertiary">Most important: {c.mostImportantDevelopment}</span>
            )}
            {c.needsAttention && <span className="text-[12px] font-medium text-warning">Needs attention: {c.needsAttention}</span>}

            {c.currentReviewStatus === "Submitted" && feedbackFor !== c.id && (
              <div className="flex gap-1.5">
                <Button size="sm" disabled={pending} onClick={() => review(c.id, "Reviewed")}>
                  Mark reviewed
                </Button>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => setFeedbackFor(c.id)}>
                  Request clarification
                </Button>
              </div>
            )}

            {feedbackFor === c.id && (
              <form
                className="mt-1 flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  review(c.id, "NeedsClarification", String(form.get("feedback") ?? "") || undefined);
                }}
              >
                <textarea
                  name="feedback"
                  rows={2}
                  placeholder="What needs clarifying?"
                  className="glass-control w-full rounded-lg px-3 py-2 text-[13px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" type="submit" disabled={pending}>
                    Send
                  </Button>
                  <Button size="sm" variant="secondary" type="button" onClick={() => setFeedbackFor(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
