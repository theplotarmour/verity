"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  Row,
  RowList,
  SectionHeading,
} from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Role = {
  id: string;
  name: string;
  memberCount: number;
  composedFrom: Array<{ id: string; name: string }>;
  held: string[];
  partial: string[];
  undescribedGrantCount: number;
};

type Activity = { key: string; label: string; group: string; note: string | null };

export function RolesDesk({ roles, activities }: { roles: Role[]; activities: Activity[] }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(roles[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = roles.find((role) => role.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of activities) {
      map.set(activity.group, [...(map.get(activity.group) ?? []), activity]);
    }
    return [...map.entries()];
  }, [activities]);

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/roles");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {failure && (
        <ErrorState
          title="That was refused"
          message={failure.message}
          issues={failure.issues}
          retryable={failure.retryable}
        />
      )}

      {creating ? (
        <Panel title="New role">
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="role-name" required hint="What this job is called here">
              <Input
                id="role-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Warehouse Manager"
              />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={pending || newName.trim().length === 0}
                onClick={() =>
                  run("verity.platform.create_role", { name: newName.trim() }, () => {
                    setCreating(false);
                    setNewName("");
                  })
                }
              >
                {pending ? "Creating…" : "Create role"}
              </Button>
              <Button disabled={pending} onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
            <p className="m-0 text-[12px] text-text-tertiary">
              A new role allows nothing until activities are ticked. That is deliberate — a role
              that starts permissive is one nobody remembers to narrow.
            </p>
          </div>
        </Panel>
      ) : (
        <div>
          <Button variant="primary" onClick={() => setCreating(true)}>
            New role
          </Button>
        </div>
      )}

      {roles.length === 0 ? (
        <EmptyState
          title="No roles yet"
          description="A role is a job — Salesperson, Accountant, Warehouse Operator — and the activities it is allowed."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <Panel flush title="Roles">
            <RowList>
              {roles.map((role) => (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    aria-current={role.id === selectedId ? "true" : undefined}
                    className={
                      "flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors " +
                      (role.id === selectedId ? "bg-glass-2" : "hover:bg-glass-2")
                    }
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] text-text">{role.name}</span>
                      <span className="mt-0.5 block text-[12px] text-text-tertiary">
                        {role.memberCount === 1 ? "1 person" : `${role.memberCount} people`} ·{" "}
                        {role.held.length} activities
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </RowList>
          </Panel>

          {selected && (
            <div className="flex flex-col gap-5">
              <Panel title={selected.name}>
                <p className="m-0 text-[13px] text-text-secondary">
                  {selected.memberCount === 0
                    ? "Nobody holds this role yet."
                    : `${selected.memberCount} ${selected.memberCount === 1 ? "person holds" : "people hold"} this role.`}{" "}
                  <Link href="/people" className="text-accent-ink no-underline hover:underline">
                    Assign it under People
                  </Link>
                  .
                </p>
                {selected.composedFrom.length > 0 && (
                  <p className="m-0 mt-2 text-[12px] text-text-tertiary">
                    Also inherits everything from {selected.composedFrom.map((r) => r.name).join(", ")}.
                  </p>
                )}
                {selected.undescribedGrantCount > 0 && (
                  // Not hidden. A role carrying permissions this vocabulary
                  // cannot describe is exactly what an administrator needs to
                  // be told, and omitting them would make this screen a lie.
                  <p className="m-0 mt-2 text-[12px] text-text-tertiary">
                    This role also holds {selected.undescribedGrantCount} permission(s) that are not
                    part of any activity listed here — granted directly, or by another capability.
                  </p>
                )}
              </Panel>

              {grouped.map(([group, groupActivities]) => (
                <Panel key={group}>
                  <SectionHeading>{group}</SectionHeading>
                  <div className="flex flex-col gap-3">
                    {groupActivities.map((activity) => {
                      const held = selected.held.includes(activity.key);
                      const partial = selected.partial.includes(activity.key);
                      return (
                        <div key={activity.key}>
                          <Checkbox
                            label={
                              <span className="flex items-center gap-2">
                                {activity.label}
                                {partial && !held && <Badge>Partly granted</Badge>}
                              </span>
                            }
                            checked={held}
                            disabled={pending}
                            onChange={(event) =>
                              run("verity.trading.set_role_activity", {
                                roleId: selected.id,
                                activityKey: activity.key,
                                enabled: event.target.checked,
                              })
                            }
                          />
                          {activity.note && (
                            <p className="m-0 ml-7 mt-0.5 text-[12px] text-text-tertiary">
                              {activity.note}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
