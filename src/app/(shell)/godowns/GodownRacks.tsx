"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, EmptyState, ErrorState, Field, Input, Panel } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Godown = {
  id: string;
  name: string;
  racks: Array<{ id: string; rackLabel: string; active: boolean }>;
};

/**
 * Rack layout, one panel per godown.
 *
 * Racks are shown as a wrapped row of labels rather than a table. A rack has
 * exactly one fact — its label — and a table of one column is a table pretending
 * to be one; the wrapped row also matches how the layout is read aloud on the
 * floor, as a run of positions rather than a list of records.
 *
 * A retired rack stays visible and dimmed. It is where stock once sat, and a
 * movement from last year still points at it.
 */
export function GodownRacks({ godowns }: { godowns: Godown[] }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/godowns");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  if (godowns.length === 0) {
    return (
      <Panel flush>
        <EmptyState
          compact
          title="No godowns yet"
          description="A godown is a Location. Create one there first, then lay out its racks here."
          action={
            <Link href="/locations">
              <Button variant="primary">Go to Locations</Button>
            </Link>
          }
        />
      </Panel>
    );
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

      <div className="flex flex-col gap-4">
        {godowns.map((godown) => {
          const live = godown.racks.filter((rack) => rack.active).length;
          return (
            <Panel
              key={godown.id}
              title={godown.name}
              action={
                <div className="flex items-center gap-3">
                  <span className="tabular text-[12px] text-text-tertiary">
                    {live === 0 ? "No racks" : live === 1 ? "1 rack" : `${live} racks`}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setAddingTo(addingTo === godown.id ? null : godown.id)}
                  >
                    {addingTo === godown.id ? "Close" : "Add rack"}
                  </Button>
                </div>
              }
            >
              {addingTo === godown.id && (
                <form
                  className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
                  action={(formData) =>
                    run(
                      "verity.plywood.define_godown_rack",
                      {
                        locationId: godown.id,
                        rackLabel: String(formData.get("label") ?? ""),
                      },
                      // Left open on purpose: racks are laid out in a run, and
                      // closing the form after each one would make entering
                      // twelve of them twelve round trips through a button.
                      undefined,
                    )
                  }
                >
                  <div className="min-w-[200px]">
                    <Field
                      label="Rack label"
                      htmlFor={`rack-${godown.id}`}
                      required
                      hint="As it is painted on the rack"
                    >
                      <Input
                        id={`rack-${godown.id}`}
                        name="label"
                        required
                        autoFocus
                        placeholder="A-01"
                      />
                    </Field>
                  </div>
                  <Button type="submit" variant="primary" disabled={pending}>
                    Add
                  </Button>
                </form>
              )}

              {godown.racks.length === 0 ? (
                <p className="m-0 text-[13px] text-text-secondary">
                  No racks laid out in this godown yet.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {godown.racks.map((rack) => (
                    <li key={rack.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run("verity.plywood.set_godown_rack_active", {
                            rackId: rack.id,
                            active: !rack.active,
                          })
                        }
                        title={rack.active ? "Retire this rack" : "Bring this rack back"}
                        className={
                          "tabular rounded-lg border px-3 py-1.5 text-[13px] " +
                          "transition-[border-color,color,background-color] duration-200 " +
                          "focus:outline-none focus-visible:border-accent " +
                          "focus-visible:shadow-[0_0_0_3px_var(--color-accent-subtle)] " +
                          "disabled:cursor-not-allowed disabled:opacity-55 " +
                          (rack.active
                            ? "border-line bg-glass-2 text-text hover:border-line-strong"
                            : "border-dashed border-line text-text-tertiary line-through hover:border-line-strong")
                        }
                      >
                        {rack.rackLabel}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
