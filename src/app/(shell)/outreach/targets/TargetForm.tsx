"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const SCOPES = ["Company", "Team", "Individual"] as const;
const PERIODS = ["Daily", "Weekly"] as const;
const METRICS = ["QualifiedProspects", "Outreach", "FollowUps", "Responses", "Meetings", "Proposals", "Closed"] as const;

export function TargetForm({
  teams,
  members,
}: {
  teams: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("Team");
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const today = new Date();
  const inSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setFailure(null);
        startTransition(async () => {
          const result = await runCommand(
            "verity.outreach.set_target",
            {
              scope,
              teamId: scope === "Team" ? String(form.get("teamId")) : undefined,
              partyId: scope === "Individual" ? String(form.get("partyId")) : undefined,
              period: String(form.get("period")),
              metric: String(form.get("metric")),
              targetValue: Number(form.get("targetValue")),
              periodStart: new Date(String(form.get("periodStart"))).toISOString(),
              periodEnd: new Date(String(form.get("periodEnd"))).toISOString(),
            },
            "/outreach/targets",
          );
          if (result.ok) router.refresh();
          else setFailure(result);
        });
      }}
    >
      <Field label="Scope" htmlFor="scope">
        <Select id="scope" value={scope} onChange={(e) => setScope(e.target.value as (typeof SCOPES)[number])}>
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      {scope === "Team" && (
        <Field label="Team" htmlFor="teamId">
          <Select id="teamId" name="teamId">
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {scope === "Individual" && (
        <Field label="Person" htmlFor="partyId">
          <Select id="partyId" name="partyId">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Period" htmlFor="period">
        <Select id="period" name="period" defaultValue="Weekly">
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Metric" htmlFor="metric">
        <Select id="metric" name="metric" defaultValue="QualifiedProspects">
          {METRICS.map((m) => (
            <option key={m} value={m}>
              {m.replace(/([A-Z])/g, " $1").trim()}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Target value" htmlFor="targetValue">
        <Input id="targetValue" name="targetValue" type="number" min="1" required defaultValue={10} />
      </Field>
      <Field label="Period start" htmlFor="periodStart">
        <Input id="periodStart" name="periodStart" type="date" required defaultValue={today.toISOString().slice(0, 10)} />
      </Field>
      <Field label="Period end" htmlFor="periodEnd">
        <Input id="periodEnd" name="periodEnd" type="date" required defaultValue={inSevenDays.toISOString().slice(0, 10)} />
      </Field>
      {failure && (
        <div className="sm:col-span-3">
          <ErrorState title="Could not set target" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Set target"}
        </Button>
      </div>
    </form>
  );
}
