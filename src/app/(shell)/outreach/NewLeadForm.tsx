"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Panel, Select } from "@/components/ui/primitives";
import { runCommand, runQuery } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const TRACKS = ["Undetermined", "Agency", "Verity", "Both"] as const;

/**
 * Lead creation flow (master-context spec §73, Task 114 P0.4 two-step split).
 *
 * Step 1 creates the minimal record — company, website/LinkedIn, owner,
 * team, domain, "why now" (`whyRelevant`, the only required text field
 * besides company) — matching `createOutreachLead`'s own required-at-
 * creation set. Step 2 qualifies it via `updateLeadQualification` (Task
 * 114's own new command): what they do, potential need, sales hypothesis,
 * fit score, location, industry. Step 2 is skippable — the lead already
 * exists after Step 1, so qualifying it is a follow-up, not a gate.
 */
export function NewLeadForm({
  teams,
  members,
  defaultTeamId,
  domains = [],
  revalidatePath = "/outreach",
  defaultOwnerId,
}: {
  teams: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string; teamId: string }>;
  defaultTeamId?: string;
  /** Structured taxonomy leaves; when given, the form offers a Domain picker. */
  domains?: Array<{ id: string; name: string; group: string }>;
  revalidatePath?: string;
  /** Pre-selected assignee when present in the chosen team (e.g. the actor themselves). */
  defaultOwnerId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [createdLead, setCreatedLead] = useState<{ id: string; companyName: string } | null>(null);
  const [teamId, setTeamId] = useState(defaultTeamId ?? teams[0]?.id ?? "");
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const [duplicateWarning, setDuplicateWarning] = useState<{ accessible: boolean; leadId?: string; message: string } | null>(null);

  async function checkDuplicate(companyName: string, website: string, linkedinUrl: string) {
    if (!companyName.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const result = await runQuery<{ possibleDuplicate: boolean; accessible: boolean; leadId?: string; message: string }>(
      "verity.outreach.check_duplicate_prospect",
      { companyName, website: website || undefined, linkedinUrl: linkedinUrl || undefined },
    );
    if (result.ok && result.data.possibleDuplicate) {
      setDuplicateWarning({ accessible: result.data.accessible, leadId: result.data.leadId, message: result.data.message });
    } else {
      setDuplicateWarning(null);
    }
  }

  function reset() {
    setOpen(false);
    setStep(1);
    setCreatedLead(null);
    setFailure(null);
    setDuplicateWarning(null);
  }

  function finish() {
    reset();
    router.refresh();
  }

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

  if (step === 2 && createdLead) {
    return (
      <Panel title={`Qualify ${createdLead.companyName}`} className="mb-6">
        <p className="m-0 mb-4 text-[13px] text-text-tertiary">
          Saved as a minimal prospect. Add what you know now, or skip — you can fill this in anytime from the record.
        </p>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setFailure(null);
            startTransition(async () => {
              const result = await runCommand(
                "verity.outreach.update_qualification",
                {
                  leadId: createdLead.id,
                  whatTheyDo: String(form.get("whatTheyDo") ?? "") || undefined,
                  potentialNeed: String(form.get("potentialNeed") ?? "") || undefined,
                  salesHypothesis: String(form.get("salesHypothesis") ?? "") || undefined,
                  industry: String(form.get("industry") ?? "") || undefined,
                  location: String(form.get("location") ?? "") || undefined,
                  qualityScore: form.get("qualityScore") ? Number(form.get("qualityScore")) : undefined,
                },
                revalidatePath,
              );
              if (result.ok) finish();
              else setFailure(result);
            });
          }}
        >
          <div className="sm:col-span-2">
            <Field label="What they do" htmlFor="whatTheyDo" hint="A one-line business description">
              <textarea
                id="whatTheyDo"
                name="whatTheyDo"
                rows={2}
                className="verity-solid border border-line w-full rounded-lg px-4 py-2.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
            </Field>
          </div>
          <Field label="Location" htmlFor="location" hint="City, country">
            <Input id="location" name="location" />
          </Field>
          <Field label="Industry" htmlFor="industry">
            <Input id="industry" name="industry" />
          </Field>
          <Field label="Potential need" htmlFor="potentialNeed" hint="What service/opportunity this points to">
            <Input id="potentialNeed" name="potentialNeed" />
          </Field>
          <Field label="Fit score" htmlFor="qualityScore" hint="1 weak – 10 priority">
            <Input id="qualityScore" name="qualityScore" type="number" min={1} max={10} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Sales hypothesis" htmlFor="salesHypothesis" hint="The angle to open with">
              <textarea
                id="salesHypothesis"
                name="salesHypothesis"
                rows={2}
                className="verity-solid border border-line w-full rounded-lg px-4 py-2.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
            </Field>
          </div>

          {failure && (
            <div className="sm:col-span-2">
              <ErrorState title="Could not save qualification" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
            </div>
          )}

          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save & finish"}
            </Button>
            <Button type="button" variant="secondary" onClick={finish}>
              Skip for now
            </Button>
          </div>
        </form>
      </Panel>
    );
  }

  return (
    <Panel title="Add prospect — step 1 of 2" className="mb-6">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setFailure(null);
          startTransition(async () => {
            const result = await runCommand<{ id: string }>(
              "verity.outreach.create_lead",
              {
                teamId,
                companyName: String(form.get("companyName") ?? ""),
                website: String(form.get("website") ?? "") || undefined,
                domainId: String(form.get("domainId") ?? "") || undefined,
                track: String(form.get("track") ?? "Undetermined"),
                whyRelevant: String(form.get("whyRelevant") ?? ""),
                opportunityOwnerId: String(form.get("opportunityOwnerId") ?? ""),
                linkedinUrl: String(form.get("linkedinUrl") ?? "") || undefined,
              },
              revalidatePath,
            );
            if (result.ok) {
              setCreatedLead({ id: result.data.id, companyName: String(form.get("companyName") ?? "") });
              setStep(2);
            } else {
              setFailure(result);
            }
          });
        }}
      >
        <Field label="Company" htmlFor="companyName" required>
          <Input
            id="companyName"
            name="companyName"
            required
            onBlur={(e) => {
              const form = e.currentTarget.form!;
              void checkDuplicate(
                e.currentTarget.value,
                String(new FormData(form).get("website") ?? ""),
                String(new FormData(form).get("linkedinUrl") ?? ""),
              );
            }}
          />
        </Field>
        <Field label="Website" htmlFor="website" hint="Optional at creation">
          <Input
            id="website"
            name="website"
            placeholder="https://…"
            onBlur={(e) => {
              const form = e.currentTarget.form!;
              void checkDuplicate(
                String(new FormData(form).get("companyName") ?? ""),
                e.currentTarget.value,
                String(new FormData(form).get("linkedinUrl") ?? ""),
              );
            }}
          />
        </Field>
        {duplicateWarning && (
          <div className="sm:col-span-2">
            <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-subtle)] px-4 py-3 text-[13px] text-text">
              {duplicateWarning.accessible && duplicateWarning.leadId ? (
                <a href={`/outreach/${duplicateWarning.leadId}`} className="text-accent-ink no-underline hover:underline">
                  {duplicateWarning.message}
                </a>
              ) : (
                duplicateWarning.message
              )}
            </div>
          </div>
        )}
        {domains.length > 0 && (
          <Field label="Domain" htmlFor="domainId">
            <Select id="domainId" name="domainId" defaultValue="">
              <option value="">Unspecified</option>
              {[...new Set(domains.map((d) => d.group))].map((group) => (
                <optgroup key={group} label={group}>
                  {domains
                    .filter((d) => d.group === group)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Decision maker's LinkedIn" htmlFor="linkedinUrl">
          <Input id="linkedinUrl" name="linkedinUrl" placeholder="https://linkedin.com/in/…" />
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
        <Field label="Assign to" htmlFor="opportunityOwnerId" required>
          <Select
            key={teamId}
            id="opportunityOwnerId"
            name="opportunityOwnerId"
            required
            defaultValue={teamMembers.some((m) => m.id === defaultOwnerId) ? defaultOwnerId : undefined}
          >
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Why now" htmlFor="whyRelevant" required hint="1–2 sentences — a bare company name is not a qualified lead">
            <textarea
              id="whyRelevant"
              name="whyRelevant"
              required
              rows={2}
              className="verity-solid border border-line w-full rounded-lg px-4 py-2.5 text-[14px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent"
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
            {pending ? "Saving…" : "Next: qualify"}
          </Button>
          <Button type="button" variant="secondary" onClick={reset}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}
