"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
} from "@/components/ui/primitives";
import { runClientCommand } from "@/server/actions/hq";
import type { ActionFailure } from "@/server/platform/action-error";
import type { ConfigRow } from "./page";

/**
 * Tenant configuration for one client.
 *
 * A key/value editor rather than a form of named switches, and that is the
 * honest shape: `ConfigParameter` is a free key space that capabilities read
 * through `resolveConfig`, so the platform genuinely does not know the set of
 * valid keys — a capability introduces its own without asking. Inventing a
 * curated list here would either hide keys that exist or promise keys nothing
 * reads.
 *
 * Only Tenant scope is editable here. Organization and User scoped values
 * belong to the context that set them, and an operator overwriting a person's
 * own preference from HQ would be a surprise with no undo.
 */
export function SettingsAdmin({
  tenantId,
  configuration,
}: {
  tenantId: string;
  configuration: ConfigRow[];
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const tenantScoped = configuration.filter((row) => row.scope === "Tenant");
  const otherScoped = configuration.filter((row) => row.scope !== "Tenant");

  function set(key: string, value: string | null, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runClientCommand(tenantId, "verity.platform.set_configuration", {
        key,
        value,
      });
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
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

      <div className="mb-6">
        <Panel title="Set a value">
          <form
            className="flex flex-wrap items-end gap-3"
            action={(formData) => {
              const key = String(formData.get("key") ?? "").trim();
              if (!key) return;
              set(key, String(formData.get("value") ?? ""));
            }}
          >
            <div className="min-w-[240px]">
              <Field label="Key" htmlFor="config-key" required>
                <Input id="config-key" name="key" placeholder="scheduling.slot_minutes" required />
              </Field>
            </div>
            <div className="min-w-[240px] flex-1">
              <Field label="Value" htmlFor="config-value">
                <Input id="config-value" name="value" />
              </Field>
            </div>
            <Button type="submit" variant="primary" disabled={pending}>
              Save
            </Button>
          </form>
        </Panel>
      </div>

      <Panel title={`${tenantScoped.length} tenant-scoped`} flush>
        {tenantScoped.length === 0 ? (
          <EmptyState
            compact
            title="Nothing configured"
            description="Capabilities fall back to their own defaults when a key is unset, which is a decision rather than an absence."
          />
        ) : (
          <table className="w-full border-collapse">
            <caption className="sr-only">Tenant-scoped configuration</caption>
            <thead>
              <tr>
                {["Key", "Value", "Action"].map((heading) => (
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
              {tenantScoped.map((row) => (
                <tr key={row.key}>
                  <td className="border-b border-line px-3 py-3 text-[14px] text-text">{row.key}</td>
                  <td className="border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                    {JSON.stringify(row.value)}
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={pending}
                      onClick={() => set(row.key, null)}
                    >
                      Clear
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {otherScoped.length > 0 && (
        <div className="mt-6">
          <Panel title={`${otherScoped.length} set at a narrower scope`}>
            <p className="mb-3 mt-0 text-[13px] text-text-secondary">
              Read-only here. These were set for one organization or one person and override the
              tenant value for them.
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
              {otherScoped.map((row) => (
                <li key={`${row.scope}-${row.key}`} className="flex justify-between gap-3">
                  <span className="text-text">{row.key}</span>
                  <span className="text-text-tertiary">{row.scope}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
