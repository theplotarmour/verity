"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

/**
 * Turning a capability on and off.
 *
 * This screen used to be read-only, and said so: "activation has real dependency
 * consequences enforced by the database, and a one-click toggle here would
 * invite an administrator to discover them by accident."
 *
 * The concern was right; the conclusion was not. A tenant could not be set up
 * without SQL, which is the thing D20 exists to prevent. What the screen owes an
 * administrator is not the absence of a control — it is the consequences, in
 * front of them, before they click.
 *
 * So: dependencies are listed on the row, dependants are listed on the row, and
 * the button says which of the two things it is about to do. When the database
 * refuses — "missing active dependencies …", or a dependant still needs this —
 * that message is shown verbatim rather than translated into something vaguer.
 * Two clicks with the reason visible beats one click and a surprise.
 */
export function CapabilityControls({
  capabilityId,
  name,
  active,
  missingDependencies,
  activeDependants,
}: {
  capabilityId: string;
  name: string;
  active: boolean;
  /** Dependencies this tenant has NOT activated. Activation will be refused. */
  missingDependencies: string[];
  /** Active capabilities that depend on this one. Deactivation will be refused. */
  activeDependants: string[];
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function setState(enabled: boolean) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.platform.set_capability_state",
        { capabilityId, enabled },
        "/capabilities",
      );
      if (result.ok) router.refresh();
      else setFailure(result);
    });
  }

  const blockedFromActivating = !active && missingDependencies.length > 0;
  const blockedFromDeactivating = active && activeDependants.length > 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        size="sm"
        variant={active ? "secondary" : "primary"}
        disabled={pending || blockedFromActivating || blockedFromDeactivating}
        onClick={() => setState(!active)}
      >
        {active ? "Deactivate" : "Activate"}
      </Button>

      {/* Said before the click, not after it. The database refuses either of
          these anyway; the point is that nobody has to find out that way. */}
      {blockedFromActivating && (
        <p className="m-0 max-w-[32ch] text-right text-[12px] text-text-tertiary">
          Activate {missingDependencies.join(" and ")} first — {name} depends on{" "}
          {missingDependencies.length === 1 ? "it" : "them"}.
        </p>
      )}
      {blockedFromDeactivating && (
        <p className="m-0 max-w-[32ch] text-right text-[12px] text-text-tertiary">
          {activeDependants.join(" and ")} still {activeDependants.length === 1 ? "depends" : "depend"}{" "}
          on this. Deactivate {activeDependants.length === 1 ? "it" : "them"} first.
        </p>
      )}

      {failure && (
        <div className="w-full max-w-[420px]">
          <ErrorState
            title="That change was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}
    </div>
  );
}
