"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Panel } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Parameter = {
  key: string;
  /** What resolves for this tenant right now, as JSON text. */
  value: string;
  /** True when the value comes from a platform default rather than this tenant. */
  inherited: boolean;
};

/**
 * Setting a tenant's configuration.
 *
 * Every write goes through `verity.platform.set_configuration`, which is the
 * command HQ already registered and which carries authorization, audit and a
 * `ConfigurationChanged` security event without being asked. There is no second
 * write path here, deliberately — a settings screen that calls a helper directly
 * is the second place validation gets forgotten.
 *
 * An inherited value is shown with its default filled in rather than blank. The
 * difference between "the platform's 9%" and "this tenant chose 9%" matters to
 * the person reading it, so the row says which it is, and saving turns the first
 * into the second.
 *
 * Clearing is offered separately from saving an empty string. `temporal.ts`
 * treats an unset zone as UTC by decision, and an empty string would be neither
 * set nor unset — the command takes `null` for exactly that reason.
 */
export function ConfigurationEditor({ parameters }: { parameters: Parameter[] }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function write(key: string, value: string | null, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.platform.set_configuration",
        { key, value },
        "/configuration",
      );
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
            title="That setting was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setAdding((open) => !open)}>
          {adding ? "Cancel" : "Set another key"}
        </Button>
      </div>

      {adding && (
        <div className="mb-6">
          <Panel title="Set a configuration value">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                write(
                  String(formData.get("key") ?? "").trim(),
                  String(formData.get("value") ?? ""),
                  () => setAdding(false),
                )
              }
            >
              <div className="min-w-[320px] flex-1">
                <Field
                  label="Key"
                  htmlFor="config-new-key"
                  required
                  hint="The key a capability reads, e.g. verity.plywood.tax.state_code"
                >
                  <Input id="config-new-key" name="key" required autoFocus />
                </Field>
              </div>
              <div className="min-w-[200px]">
                <Field label="Value" htmlFor="config-new-value" required>
                  <Input id="config-new-value" name="value" required />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Save
              </Button>
            </form>
          </Panel>
        </div>
      )}

      <Panel title="Values">
        <div className="flex flex-col gap-3">
          {parameters.map((parameter) => (
            <form
              key={parameter.key}
              className="flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
              action={(formData) => write(parameter.key, String(formData.get("value") ?? ""))}
            >
              <div className="min-w-[300px] flex-1">
                <Field
                  label={parameter.key}
                  htmlFor={`config-${parameter.key}`}
                  hint={
                    parameter.inherited
                      ? "Platform default — saving makes it this tenant's own"
                      : "Set by this tenant"
                  }
                >
                  <Input
                    id={`config-${parameter.key}`}
                    name="value"
                    defaultValue={parameter.value}
                  />
                </Field>
              </div>
              <Button type="submit" disabled={pending}>
                Save
              </Button>
              {!parameter.inherited && (
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => write(parameter.key, null)}
                  title="Clear this tenant's value and fall back to the platform default"
                >
                  Clear
                </Button>
              )}
            </form>
          ))}
        </div>
      </Panel>
    </>
  );
}
