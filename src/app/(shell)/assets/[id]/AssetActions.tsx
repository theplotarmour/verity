"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState } from "@/components/ui/primitives";
import { runCommand, type ActionFailure } from "@/server/actions/platform";

/**
 * State transitions offered as real platform commands.
 *
 * The buttons are generated from the transitions the capability declared out of
 * the current state, so the interface cannot offer a move the state runtime
 * would refuse. Permission is checked server-side regardless — hiding a button
 * is presentation, not authorization, and the command pipeline remains the
 * thing that decides.
 */
export function AssetActions({
  assetId,
  transitions,
  canEdit,
  isTerminal,
}: {
  assetId: string;
  transitions: Array<{ key: string; category: string }>;
  canEdit: boolean;
  isTerminal: boolean;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  if (isTerminal || transitions.length === 0 || !canEdit) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((target) => (
          <Button
            key={target.key}
            size="sm"
            variant={target.category === "Cancelled" ? "danger" : "secondary"}
            disabled={pending}
            onClick={() => {
              setFailure(null);
              startTransition(async () => {
                const result = await runCommand(
                  "verity.asset.change_state",
                  { assetId, toState: target.key },
                  "/assets",
                );
                if (result.ok) router.refresh();
                else setFailure(result);
              });
            }}
          >
            {pending ? "Working…" : `Mark ${target.key.replace(/_/g, " ")}`}
          </Button>
        ))}
      </div>
      {failure && (
        <div className="w-full sm:w-96">
          <ErrorState
            title="Could not change state"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}
    </div>
  );
}
