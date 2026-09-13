"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const textareaClass =
  "glass-control w-full rounded-lg px-4 py-2.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent";

export function CheckInForm() {
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
            "verity.outreach.submit_check_in",
            {
              checkInDate: new Date().toISOString(),
              summary: String(form.get("summary") ?? ""),
              learning: String(form.get("learning") ?? "") || undefined,
              blocker: String(form.get("blocker") ?? "") || undefined,
              tomorrowPlan: String(form.get("tomorrowPlan") ?? "") || undefined,
            },
            "/outreach/check-in",
          );
          if (result.ok) {
            router.refresh();
          } else {
            setFailure(result);
          }
        });
      }}
    >
      <div className="sm:col-span-2">
        <Field label="What did you accomplish?" htmlFor="summary" required>
          <textarea id="summary" name="summary" required rows={2} className={textareaClass} />
        </Field>
      </div>
      <Field label="What did you learn?" htmlFor="learning">
        <textarea id="learning" name="learning" rows={2} className={textareaClass} />
      </Field>
      <Field label="Blocker" htmlFor="blocker">
        <textarea id="blocker" name="blocker" rows={2} className={textareaClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Tomorrow's priority" htmlFor="tomorrowPlan">
          <textarea id="tomorrowPlan" name="tomorrowPlan" rows={2} className={textareaClass} />
        </Field>
      </div>
      {failure && (
        <div className="sm:col-span-2">
          <ErrorState title="Could not submit check-in" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit daily check-in"}
        </Button>
      </div>
    </form>
  );
}
