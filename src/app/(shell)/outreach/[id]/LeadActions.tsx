"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const TERMINAL_STATES = ["not_a_fit", "unresponsive", "lost", "deferred", "disqualified"];
const REJECTION_REASONS = [
  "NoFit",
  "NoBudget",
  "NoTiming",
  "NotInterested",
  "WrongPerson",
  "RevisitLater",
  "LostToCompetitor",
  "LostOnPrice",
  "LostOnScopeTrust",
] as const;

const CHANNELS = ["LinkedIn", "Email", "WhatsApp", "Call", "Referral", "Meeting", "Other"] as const;
const ACTIVITY_TYPES = [
  "FirstOutreach",
  "FollowUp",
  "Response",
  "MeetingBooked",
  "MeetingCompleted",
  "ProposalSent",
  "Other",
] as const;

/**
 * Stage transitions + activity logging, both real platform commands. Buttons
 * are generated from the transitions the state runtime actually declared
 * from here (handbook Ch. 22), so the interface cannot offer a move the
 * command pipeline would refuse.
 */
export function LeadActions({
  leadId,
  transitions,
  canEdit,
  canLog,
  isTerminal,
  advanceThresholdMinor,
  advanceReceivedMinor,
  teamMembers,
  currentOwnerId,
}: {
  leadId: string;
  transitions: Array<{ key: string; category: string }>;
  canEdit: boolean;
  canLog: boolean;
  isTerminal: boolean;
  advanceThresholdMinor: number | null;
  advanceReceivedMinor: number;
  teamMembers: Array<{ id: string; name: string }>;
  currentOwnerId: string;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingTerminal, setPendingTerminal] = useState<string | null>(null);
  const [reason, setReason] = useState<(typeof REJECTION_REASONS)[number]>("NoFit");
  const [logOpen, setLogOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const advance = (toState: string, rejectionReason?: string) => {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.outreach.advance_stage",
        { leadId, toState, rejectionReason },
        `/outreach/${leadId}`,
      );
      if (result.ok) {
        setPendingTerminal(null);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  };

  const closedWonBlocked =
    advanceThresholdMinor == null || advanceReceivedMinor < advanceThresholdMinor;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canLog && !isTerminal && (
          <Button size="sm" variant="secondary" onClick={() => setLogOpen((v) => !v)}>
            {logOpen ? "Close log form" : "Log activity"}
          </Button>
        )}
        {canEdit && !isTerminal && (
          <Button size="sm" variant="secondary" onClick={() => setReassignOpen((v) => !v)}>
            {reassignOpen ? "Close reassign form" : "Reassign owner"}
          </Button>
        )}
        {canEdit && !isTerminal && (
          <Button size="sm" variant="secondary" onClick={() => setPaymentOpen((v) => !v)}>
            {paymentOpen ? "Close payment form" : "Record payment"}
          </Button>
        )}
        {canEdit && isTerminal && (
          <Button size="sm" variant="secondary" onClick={() => setReactivateOpen((v) => !v)}>
            {reactivateOpen ? "Close reactivate form" : "Reactivate"}
          </Button>
        )}
        {canEdit &&
          !isTerminal &&
          transitions.map((t) => {
            const terminal = TERMINAL_STATES.includes(t.key);
            const blocked = t.key === "closed_won" && closedWonBlocked;
            return (
              <Button
                key={t.key}
                size="sm"
                variant="secondary"
                className={terminal ? "text-danger" : undefined}
                disabled={pending || blocked}
                title={blocked ? "Cumulative advance received has not cleared the threshold yet" : undefined}
                onClick={() => (terminal ? setPendingTerminal(t.key) : advance(t.key))}
              >
                {t.key.replace(/_/g, " ")}
              </Button>
            );
          })}
      </div>

      {pendingTerminal && (
        <div className="flex items-end gap-2 rounded-lg border border-line bg-surface p-3">
          <Field label="Reason" htmlFor="rejectionReason">
            <Select
              id="rejectionReason"
              value={reason}
              onChange={(e) => setReason(e.target.value as (typeof REJECTION_REASONS)[number])}
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/([A-Z])/g, " $1").trim()}
                </option>
              ))}
            </Select>
          </Field>
          <Button size="sm" disabled={pending} onClick={() => advance(pendingTerminal, reason)}>
            Confirm
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPendingTerminal(null)}>
            Cancel
          </Button>
        </div>
      )}

      {logOpen && <LogActivityForm leadId={leadId} onDone={() => setLogOpen(false)} />}
      {reassignOpen && (
        <ReassignOwnerForm
          leadId={leadId}
          teamMembers={teamMembers}
          currentOwnerId={currentOwnerId}
          onDone={() => setReassignOpen(false)}
        />
      )}
      {paymentOpen && <RecordPaymentForm leadId={leadId} onDone={() => setPaymentOpen(false)} />}
      {reactivateOpen && (
        <ReactivateForm leadId={leadId} teamMembers={teamMembers} onDone={() => setReactivateOpen(false)} />
      )}

      {failure && (
        <div className="w-full sm:w-96">
          <ErrorState title="Could not update the lead" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
    </div>
  );
}

function LogActivityForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:w-[420px]"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setFailure(null);
        startTransition(async () => {
          const result = await runCommand(
            "verity.outreach.log_activity",
            {
              leadId,
              channel: String(form.get("channel")),
              activityType: String(form.get("activityType")),
              message: String(form.get("message") ?? "") || undefined,
              response: String(form.get("response") ?? "") || undefined,
              nextActionNote: String(form.get("nextActionNote") ?? "") || undefined,
              nextActionAt: form.get("nextActionAt") ? new Date(String(form.get("nextActionAt"))).toISOString() : undefined,
            },
            `/outreach/${leadId}`,
          );
          if (result.ok) {
            onDone();
            router.refresh();
          } else {
            setFailure(result);
          }
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Channel" htmlFor="channel">
          <Select id="channel" name="channel" defaultValue="LinkedIn">
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type" htmlFor="activityType">
          <Select id="activityType" name="activityType" defaultValue="FirstOutreach">
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/([A-Z])/g, " $1").trim()}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Message" htmlFor="message" hint="What was sent">
        <textarea id="message" name="message" rows={2} className="glass-control w-full rounded-lg px-4 py-2.5 text-[14px] text-text focus:outline-none focus:border-accent" />
      </Field>
      <Field label="Response" htmlFor="response" hint="What they said, if anything">
        <textarea id="response" name="response" rows={2} className="glass-control w-full rounded-lg px-4 py-2.5 text-[14px] text-text focus:outline-none focus:border-accent" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Next action" htmlFor="nextActionNote">
          <input
            id="nextActionNote"
            name="nextActionNote"
            className="glass-control h-11 w-full rounded-lg px-4 text-[14px] text-text focus:outline-none focus:border-accent"
          />
        </Field>
        <Field label="Due" htmlFor="nextActionAt">
          <input
            id="nextActionAt"
            name="nextActionAt"
            type="date"
            className="glass-control h-11 w-full rounded-lg px-4 text-[14px] text-text focus:outline-none focus:border-accent"
          />
        </Field>
      </div>
      {failure && <ErrorState title="Could not log activity" message={failure.message} issues={failure.issues} retryable={failure.retryable} />}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Log activity"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Handbook Ch. 02: eligible only 14+ days after the last logged activity — the command itself is the enforcement, this just surfaces its error. */
function ReassignOwnerForm({
  leadId,
  teamMembers,
  currentOwnerId,
  onDone,
}: {
  leadId: string;
  teamMembers: Array<{ id: string; name: string }>;
  currentOwnerId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4 sm:w-auto"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setFailure(null);
        startTransition(async () => {
          const result = await runCommand(
            "verity.outreach.reassign_owner",
            { leadId, newOwnerId: String(form.get("newOwnerId")) },
            `/outreach/${leadId}`,
          );
          if (result.ok) {
            onDone();
            router.refresh();
          } else {
            setFailure(result);
          }
        });
      }}
    >
      <Field label="New owner" htmlFor="newOwnerId">
        <Select id="newOwnerId" name="newOwnerId" defaultValue={currentOwnerId}>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      {failure && (
        <div className="w-full">
          <ErrorState title="Could not reassign" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Reassign"}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

/** Handbook Ch. 02: milestone payments always ADD to the cumulative total, never replace it — see `recordAdvancePayment`. */
function RecordPaymentForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4 sm:w-auto"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setFailure(null);
        startTransition(async () => {
          const amountRupees = Number(form.get("amount"));
          const thresholdRupees = form.get("threshold") ? Number(form.get("threshold")) : undefined;
          const result = await runCommand(
            "verity.outreach.record_advance_payment",
            {
              leadId,
              amountMinor: Math.round(amountRupees * 100),
              advanceThresholdMinor: thresholdRupees != null ? Math.round(thresholdRupees * 100) : undefined,
            },
            `/outreach/${leadId}`,
          );
          if (result.ok) {
            onDone();
            router.refresh();
          } else {
            setFailure(result);
          }
        });
      }}
    >
      <Field label="Amount received" htmlFor="amount" hint="In rupees">
        <input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="glass-control h-11 w-36 rounded-lg px-4 text-[14px] text-text focus:outline-none focus:border-accent"
        />
      </Field>
      <Field label="Set threshold" htmlFor="threshold" hint="Optional — leave blank to keep the current one">
        <input
          id="threshold"
          name="threshold"
          type="number"
          min="0.01"
          step="0.01"
          className="glass-control h-11 w-36 rounded-lg px-4 text-[14px] text-text focus:outline-none focus:border-accent"
        />
      </Field>
      {failure && (
        <div className="w-full">
          <ErrorState title="Could not record payment" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Record"}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

/** INV-002: never reopens the terminal lead — spawns a new row (`reactivateLead`), carrying origination credit only within the handbook's 90-day window. */
function ReactivateForm({
  leadId,
  teamMembers,
  onDone,
}: {
  leadId: string;
  teamMembers: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:w-[420px]"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setFailure(null);
        startTransition(async () => {
          const result = await runCommand<{ id: string }>(
            "verity.outreach.reactivate_lead",
            {
              leadId,
              newOwnerId: String(form.get("newOwnerId")),
              whyRelevant: String(form.get("whyRelevant") ?? ""),
            },
            "/outreach",
          );
          if (result.ok) {
            router.push(`/outreach/${result.data.id}`);
          } else {
            setFailure(result);
          }
        });
      }}
    >
      <Field label="New owner" htmlFor="reactivateOwnerId">
        <Select id="reactivateOwnerId" name="newOwnerId" defaultValue={teamMembers[0]?.id}>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Why relevant now" htmlFor="reactivateWhy" required hint="The new trigger — spec §46: reactivation needs a genuinely new reason">
        <textarea
          id="reactivateWhy"
          name="whyRelevant"
          required
          rows={2}
          className="glass-control w-full rounded-lg px-4 py-2.5 text-[14px] text-text focus:outline-none focus:border-accent"
        />
      </Field>
      {failure && <ErrorState title="Could not reactivate" message={failure.message} issues={failure.issues} retryable={failure.retryable} />}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Create new lead from this"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
