"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Panel, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const TRACKS = ["Undetermined", "Agency", "Verity", "Both"] as const;

/**
 * Lead creation flow (master-context spec §73) — required-at-creation only:
 * company, track, why relevant, owner. Everything else (contact, research
 * depth, qualification) is a follow-up edit, not a gate on saving.
 */
export function NewLeadForm({
  teams,
  members,
  defaultTeamId,
}: {
  teams: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string; teamId: string }>;
  defaultTeamId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState(defaultTeamId ?? teams[0]?.id ?? "");
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  if (teams.length === 0) return null;
  const teamMembers = members.filter((m) => m.teamId === teamId);

  if (!open) {
    return (
      <div className="mb-6">
        <Button size="sm" onClick={() => setOpen(true)}>
          + Add prospect
        </Button>
      </div>
    );
  }

  return (
    <Panel title="Add prospect" className="mb-6">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setFailure(null);
          startTransition(async () => {
            const result = await runCommand(
              "verity.outreach.create_lead",
              {
                teamId,
                companyName: String(form.get("companyName") ?? ""),
                website: String(form.get("website") ?? "") || undefined,
                industry: String(form.get("industry") ?? "") || undefined,
                track: String(form.get("track") ?? "Undetermined"),
                whyRelevant: String(form.get("whyRelevant") ?? ""),
                opportunityOwnerId: String(form.get("opportunityOwnerId") ?? ""),
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
        <Field label="Company" htmlFor="companyName" required>
          <Input id="companyName" name="companyName" required />
        </Field>
        <Field label="Website" htmlFor="website" hint="Optional at creation">
          <Input id="website" name="website" placeholder="https://…" />
        </Field>
        <Field label="Industry" htmlFor="industry">
          <Input id="industry" name="industry" />
        </Field>
        <Field label="Track" htmlFor="track">
          <Select id="track" name="track" defaultValue="Undetermined">
            {TRACKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Team" htmlFor="teamId">
          <Select id="teamId" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Owner" htmlFor="opportunityOwnerId" required>
          <Select id="opportunityOwnerId" name="opportunityOwnerId" required>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Why relevant" htmlFor="whyRelevant" required hint="1–2 sentences — a bare company name is not a qualified lead">
            <textarea
              id="whyRelevant"
              name="whyRelevant"
              required
              rows={2}
              className="glass-control w-full rounded-lg px-4 py-2.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
          </Field>
        </div>

        {failure && (
          <div className="sm:col-span-2">
            <ErrorState title="Could not create lead" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
          </div>
        )}

        <div className="flex items-center gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save prospect"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}
