"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const textareaClass =
  "glass-control w-full rounded-lg px-4 py-2.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent";

function startOfThisWeek(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function TeamAssessmentForm({ teams }: { teams: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setFailure(null);
        startTransition(async () => {
          const result = await runCommand(
            "verity.outreach.submit_team_weekly_assessment",
            {
              teamId: String(form.get("teamId")),
              weekStart: startOfThisWeek().toISOString(),
              strongestVertical: String(form.get("strongestVertical") ?? "") || undefined,
              biggestProblem: String(form.get("biggestProblem") ?? "") || undefined,
              biggestLearning: String(form.get("biggestLearning") ?? "") || undefined,
              nextWeekPriority: String(form.get("nextWeekPriority") ?? "") || undefined,
            },
            "/outreach/reports",
          );
          if (result.ok) router.refresh();
          else setFailure(result);
        });
      }}
    >
      <Field label="Team" htmlFor="teamId">
        <Select id="teamId" name="teamId">
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Strongest vertical" htmlFor="strongestVertical">
        <Input id="strongestVertical" name="strongestVertical" />
      </Field>
      <Field label="Biggest problem" htmlFor="biggestProblem">
        <textarea id="biggestProblem" name="biggestProblem" rows={2} className={textareaClass} />
      </Field>
      <Field label="Biggest learning" htmlFor="biggestLearning">
        <textarea id="biggestLearning" name="biggestLearning" rows={2} className={textareaClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Next week's priority" htmlFor="nextWeekPriority">
          <textarea id="nextWeekPriority" name="nextWeekPriority" rows={2} className={textareaClass} />
        </Field>
      </div>
      {failure && (
        <div className="sm:col-span-2">
          <ErrorState title="Could not submit assessment" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit to Company Core"}
        </Button>
      </div>
    </form>
  );
}
