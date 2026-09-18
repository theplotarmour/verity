"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ErrorState, Field, Input, Panel, Textarea } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Meeting = {
  id: string;
  scheduledAt: string;
  purpose: string | null;
  locationOrUrl: string | null;
  status: string;
  outcomeNotes: string | null;
};

/** Meeting list + create/outcome forms on a lead (Task 106 Phase 5, spec §62). */
export function MeetingPanel({ leadId, meetings, canCreate, initiallyOpen = false }: { leadId: string; meetings: Meeting[]; canCreate: boolean; initiallyOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [outcomeFor, setOutcomeFor] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Panel title="Meetings">
      {meetings.length === 0 ? (
        <p className="text-[13px] text-text-tertiary">No meetings scheduled.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {meetings.map((m) => (
            <li key={m.id} className="flex flex-col gap-1.5 border-b border-line pb-3 last:border-none last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] text-text">{m.purpose ?? "Meeting"}</span>
                <Badge tone={m.status === "Completed" ? "accent" : "neutral"}>{m.status}</Badge>
              </div>
              <span className="text-[12px] text-text-tertiary">{new Date(m.scheduledAt).toISOString().slice(0, 16).replace("T", " ")}</span>
              {m.locationOrUrl && <span className="text-[12px] text-text-secondary">{m.locationOrUrl}</span>}
              {m.outcomeNotes && <span className="text-[12px] text-text-tertiary">{m.outcomeNotes}</span>}

              {m.status === "Scheduled" && outcomeFor !== m.id && (
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => setOutcomeFor(m.id)}>
                    Record outcome
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await runCommand("verity.outreach.update_meeting_outcome", { meetingId: m.id, status: "NoShow" }, `/outreach/${leadId}`);
                        router.refresh();
                      })
                    }
                  >
                    No-show
                  </Button>
                </div>
              )}

              {outcomeFor === m.id && (
                <form
                  className="mt-1 flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    startTransition(async () => {
                      const result = await runCommand(
                        "verity.outreach.update_meeting_outcome",
                        { meetingId: m.id, status: "Completed", outcomeNotes: String(form.get("outcomeNotes") ?? "") || undefined },
                        `/outreach/${leadId}`,
                      );
                      if (result.ok) {
                        setOutcomeFor(null);
                        router.refresh();
                      }
                    });
                  }}
                >
                  <Textarea name="outcomeNotes" rows={2} placeholder="What happened?" />
                  <div className="flex gap-1.5">
                    <Button size="sm" type="submit" disabled={pending}>
                      Save outcome
                    </Button>
                    <Button size="sm" variant="secondary" type="button" onClick={() => setOutcomeFor(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {canCreate && !open && (
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            + Schedule meeting
          </Button>
        </div>
      )}

      {canCreate && open && (
        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setFailure(null);
            startTransition(async () => {
              const result = await runCommand(
                "verity.outreach.create_meeting",
                {
                  leadId,
                  scheduledAt: new Date(String(form.get("scheduledAt"))).toISOString(),
                  purpose: String(form.get("purpose") ?? "") || undefined,
                  locationOrUrl: String(form.get("locationOrUrl") ?? "") || undefined,
                },
                `/outreach/${leadId}`,
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
          <Field label="When" htmlFor="scheduledAt" required>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
          </Field>
          <Field label="Purpose" htmlFor="purpose">
            <Input id="purpose" name="purpose" placeholder="Discovery call" />
          </Field>
          <Field label="Location / link" htmlFor="locationOrUrl">
            <Input id="locationOrUrl" name="locationOrUrl" placeholder="https://meet…" />
          </Field>
          {failure && <ErrorState title="Could not schedule meeting" message={failure.message} issues={failure.issues} retryable={failure.retryable} />}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save meeting"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}
