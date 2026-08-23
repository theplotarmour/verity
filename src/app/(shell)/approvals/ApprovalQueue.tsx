"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, ErrorState, Field, Input, StateBadge, Surface } from "@/components/ui/primitives";
import { runCommand, type ActionFailure } from "@/server/actions/platform";

type Request = {
  id: string;
  subject: string;
  subjectId: string;
  createdAt: string;
  currentStepSequence: number | null;
  steps: Array<{ sequence: number; role: string; decision: string; comment: string | null }>;
};

/**
 * The actionable part of the queue.
 *
 * Approve and reject are the same command with a different argument, which is
 * how the platform models it — so the interface does not invent two operations
 * where the domain has one decision.
 */
export function ApprovalQueue({
  requests,
  canDecide,
}: {
  requests: Request[];
  canDecide: boolean;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Nothing awaiting your decision"
        description="Chains appear here when their current step names a role you hold."
      />
    );
  }

  function submit(requestId: string, approve: boolean, comment: string) {
    setFailure(null);
    setBusy(requestId);
    startTransition(async () => {
      const result = await runCommand(
        "verity.approval.decide",
        { requestId, approve, comment: comment || undefined },
        "/approvals",
      );
      setBusy(null);
      if (result.ok) router.refresh();
      else setFailure(result);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {failure && (
        <ErrorState
          title="Could not record the decision"
          message={failure.message}
          issues={failure.issues}
          retryable={failure.retryable}
        />
      )}

      {requests.map((request) => (
        <Surface key={request.id} className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-text font-medium m-0">
                  {request.subject}
                  <span className="text-text-tertiary font-normal"> · step {(request.currentStepSequence ?? 0) + 1} of {request.steps.length}</span>
                </p>
                <p className="text-[13px] text-text-tertiary m-0">
                  Raised {request.createdAt.replace("T", " ").slice(0, 16)}
                </p>
              </div>
              <StateBadge category="Pending" label="Awaiting you" />
            </div>

            <ol className="list-none m-0 p-0 flex flex-wrap gap-x-4 gap-y-1">
              {request.steps.map((step) => (
                <li key={step.sequence} className="text-[13px] text-text-secondary">
                  {step.sequence + 1}. {step.role}
                  <span className="text-text-tertiary"> — {step.decision}</span>
                </li>
              ))}
            </ol>

            {canDecide ? (
              <form
                className="flex flex-col gap-3"
                action={(formData) =>
                  submit(
                    request.id,
                    formData.get("intent") === "approve",
                    String(formData.get("comment") ?? ""),
                  )
                }
              >
                <Field label="Comment" htmlFor={`comment-${request.id}`} hint="Recorded against the step.">
                  <Input id={`comment-${request.id}`} name="comment" />
                </Field>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    name="intent"
                    value="approve"
                    variant="primary"
                    disabled={pending && busy === request.id}
                  >
                    Approve
                  </Button>
                  <Button
                    type="submit"
                    name="intent"
                    value="reject"
                    variant="danger"
                    disabled={pending && busy === request.id}
                  >
                    Reject
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-[13px] text-text-tertiary m-0">
                Your role can see this chain but not decide it.
              </p>
            )}
          </div>
        </Surface>
      ))}
    </div>
  );
}
