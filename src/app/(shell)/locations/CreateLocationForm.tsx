"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/actions/platform";

/**
 * Creates a Location through the real command pipeline.
 *
 * There is no client-side mutation path: this calls `runCommand`, which resolves
 * the actor server-side and runs the full pipeline — validation, authorization,
 * preconditions, mutation, event, audit. A failure is rendered with the platform
 * error code so the user is told whether their change applied and whether
 * retrying is safe.
 */
export function CreateLocationForm({
  organizations,
}: {
  organizations: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        New location
      </Button>
    );
  }

  return (
    <form
      className="w-full sm:w-96 bg-surface rounded-lg p-4 flex flex-col gap-4"
      action={(formData) => {
        setFailure(null);
        startTransition(async () => {
          const result = await runCommand(
            "verity.location.create_location",
            {
              name: String(formData.get("name") ?? ""),
              organizationId: String(formData.get("organizationId") ?? ""),
            },
            "/locations",
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
      {failure && (
        <ErrorState
          title="Could not create the location"
          message={failure.message}
          issues={failure.issues}
          retryable={failure.retryable}
        />
      )}

      <Field label="Name" htmlFor="name" required>
        <Input id="name" name="name" required autoFocus />
      </Field>

      <Field label="Organization" htmlFor="organizationId" required hint="Only organizations in your scope are listed.">
        <Select id="organizationId" name="organizationId" required>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
