"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, ErrorState, Panel } from "@/components/ui/primitives";
import { runClientCommand } from "@/server/actions/hq";
import type { ActionFailure } from "@/server/platform/action-error";
import type { ModuleRow } from "@/server/platform/administration";

/**
 * Capability activation for one client.
 *
 * Three states, not two. "Not enabled" is a capability this client has never
 * had; "Suspended" is one it had and no longer runs — its data is still there,
 * and re-enabling brings it back. Collapsing them into a checkbox would make
 * those two situations indistinguishable at exactly the moment an operator most
 * needs to tell them apart.
 *
 * Disabling can be refused: a database trigger blocks suspending a capability
 * another active one depends on. That refusal is shown rather than swallowed,
 * because "Scheduling still needs this" is the useful outcome.
 */
export function ModulesAdmin({ tenantId, modules }: { tenantId: string; modules: ModuleRow[] }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function setState(capabilityId: string, enabled: boolean) {
    setFailure(null);
    startTransition(async () => {
      const result = await runClientCommand(tenantId, "verity.platform.set_capability_state", {
        capabilityId,
        enabled,
      });
      if (result.ok) router.refresh();
      else setFailure(result);
    });
  }

  return (
    <>
      {failure && (
        <div className="mb-4">
          <ErrorState
            title="That change was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}

      <Panel title={`${modules.length} available`} flush>
        {modules.length === 0 ? (
          <EmptyState compact title="No capabilities are installed on this platform" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <caption className="sr-only">Capabilities available to this client</caption>
              <thead>
                <tr>
                  {["Module", "Version", "Depends on", "Status", "Action"].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-line px-3 py-3 text-left text-[12px] font-normal text-text-tertiary"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((module) => {
                  const active = module.status === "Active";
                  return (
                    <tr key={module.capabilityId}>
                      <td className="border-b border-line px-3 py-3 text-[14px]">
                        <span className="block text-text">{module.name}</span>
                        <span className="block text-[12px] text-text-tertiary">
                          {module.capabilityId}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                        {module.version}
                        {module.pinnedVersion && module.pinnedVersion !== module.version && (
                          <span className="ml-2 text-text-tertiary">
                            pinned {module.pinnedVersion}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                        {module.dependencies.length === 0 ? "—" : module.dependencies.join(", ")}
                      </td>
                      <td className="border-b border-line px-3 py-3 text-[13px]">
                        <span
                          className={
                            active
                              ? "text-success"
                              : module.status === "Suspended"
                                ? "text-warning"
                                : "text-text-tertiary"
                          }
                        >
                          {module.status}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        <Button
                          size="sm"
                          variant={active ? "secondary" : "primary"}
                          disabled={pending}
                          // Named per module, not just "Enable". A screen-reader
                          // user hearing eleven identical buttons has no way to
                          // tell which capability they are about to turn on.
                          aria-label={`${active ? "Disable" : "Enable"} ${module.name}`}
                          onClick={() => setState(module.capabilityId, !active)}
                        >
                          {active ? "Disable" : "Enable"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
