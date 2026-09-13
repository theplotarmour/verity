"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const textareaClass =
  "glass-control w-full rounded-lg px-4 py-2.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent";

function startOfThisWeek(): Date {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday-start week
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function WeeklyReportForm() {
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
            "verity.outreach.submit_weekly_report",
            {
              weekStart: startOfThisWeek().toISOString(),
              whatWorked: String(form.get("whatWorked") ?? "") || undefined,
              whatDidntWork: String(form.get("whatDidntWork") ?? "") || undefined,
              biggestLearning: String(form.get("biggestLearning") ?? "") || undefined,
              nextWeekChange: String(form.get("nextWeekChange") ?? "") || undefined,
              nextWeekTargetValue: form.get("nextWeekTargetValue")
                ? Number(form.get("nextWeekTargetValue"))
                : undefined,
            },
            "/outreach/reports",
          );
          if (result.ok) router.refresh();
          else setFailure(result);
        });
      }}
    >
      <Field label="What worked?" htmlFor="whatWorked">
        <textarea id="whatWorked" name="whatWorked" rows={2} className={textareaClass} />
      </Field>
      <Field label="What didn't work?" htmlFor="whatDidntWork">
        <textarea id="whatDidntWork" name="whatDidntWork" rows={2} className={textareaClass} />
      </Field>
      <Field label="Biggest learning?" htmlFor="biggestLearning">
        <textarea id="biggestLearning" name="biggestLearning" rows={2} className={textareaClass} />
      </Field>
      <Field label="What will change next week?" htmlFor="nextWeekChange">
        <textarea id="nextWeekChange" name="nextWeekChange" rows={2} className={textareaClass} />
      </Field>
      <Field label="Next week's target" htmlFor="nextWeekTargetValue" hint="Qualified prospects, a number">
        <Input id="nextWeekTargetValue" name="nextWeekTargetValue" type="number" min="1" />
      </Field>
      {failure && (
        <div className="sm:col-span-2">
          <ErrorState title="Could not submit report" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit weekly report"}
        </Button>
      </div>
    </form>
  );
}
