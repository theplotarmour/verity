"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const TRACKS = ["Undetermined", "Agency", "Verity", "Both"] as const;

/**
 * Posts a new company direction (master-context spec §10). APPEND-ONLY —
 * `postCompanyDirection` closes the prior Active row rather than editing it
 * (ADR-009). Founder-only, gated by the parent page's own permission check.
 */
export function DirectionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Post new direction
      </Button>
    );
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setFailure(null);
        startTransition(async () => {
          const result = await runCommand(
            "verity.outreach.post_direction",
            {
              weekLabel: String(form.get("weekLabel") ?? ""),
              priorityVertical: String(form.get("priorityVertical") ?? "") || undefined,
              primaryTrack: String(form.get("primaryTrack") ?? "Undetermined"),
              companyProspectingTarget: form.get("companyProspectingTarget")
                ? Number(form.get("companyProspectingTarget"))
                : undefined,
              strategicNote: String(form.get("strategicNote") ?? "") || undefined,
            },
            "/outreach",
          );
          if (result.ok) {
            setOpen(false);
            router.refresh();
          } else {
            setFailure(result);
          }
        });
      }}
    >
      <Field label="Week label" htmlFor="weekLabel" required hint="e.g. 21–27 September">
        <Input id="weekLabel" name="weekLabel" required />
      </Field>
      <Field label="Priority vertical" htmlFor="priorityVertical">
        <Input id="priorityVertical" name="priorityVertical" placeholder="Manufacturing + Distributors" />
      </Field>
      <Field label="Primary track" htmlFor="primaryTrack">
        <Select id="primaryTrack" name="primaryTrack" defaultValue="Undetermined">
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Prospecting target" htmlFor="companyProspectingTarget">
        <Input id="companyProspectingTarget" name="companyProspectingTarget" type="number" min="1" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Strategic note" htmlFor="strategicNote">
          <textarea
            id="strategicNote"
            name="strategicNote"
            rows={2}
            className="glass-control w-full rounded-lg px-4 py-2.5 text-[14px] text-text focus:outline-none focus:border-accent"
          />
        </Field>
      </div>
      {failure && (
        <div className="sm:col-span-2">
          <ErrorState title="Could not post direction" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post direction"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
