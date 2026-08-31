"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  Row,
  RowList,
  Select,
} from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Person = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string | null;
  state: string;
  organizationId: string;
  organizationName: string;
  roleId: string | null;
  roleName: string | null;
};

export function PeopleDesk({
  people,
  roles,
  organizations,
}: {
  people: Person[];
  roles: Array<{ id: string; name: string }>;
  organizations: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [inviting, setInviting] = useState(false);
  const [pending, startTransition] = useTransition();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [roleId, setRoleId] = useState("");

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/people");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  // Someone with a membership and no role can sign in and do nothing at all.
  // That fails closed, which is right, and it is also invisible unless the
  // screen says so — so it says so.
  const unassigned = useMemo(() => people.filter((person) => person.roleId === null), [people]);

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

      {unassigned.length > 0 && (
        <div className="rounded-lg border border-warning/25 bg-warning-subtle px-5 py-4">
          <p className="m-0 text-[14px] text-text">
            {unassigned.length === 1
              ? "One person has no role"
              : `${unassigned.length} people have no role`}
            , so they can sign in and do nothing. Give them a role below.
          </p>
        </div>
      )}

      {inviting ? (
        <Panel title="Invite someone">
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="invite-name" required>
              <Input
                id="invite-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </Field>
            <Field
              label="Email"
              htmlFor="invite-email"
              hint="How they will sign in. Can be added later."
            >
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field
              label="Works at"
              htmlFor="invite-org"
              required
              hint="Decides which godowns and records they can reach"
            >
              <Select
                id="invite-org"
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
              >
                <option value="">Choose…</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Role" htmlFor="invite-role" hint="What they are allowed to do">
              <Select id="invite-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">No role yet</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={pending || displayName.trim().length === 0 || organizationId === ""}
                onClick={() =>
                  run(
                    "verity.platform.invite_person",
                    {
                      displayName: displayName.trim(),
                      organizationId,
                      ...(email.trim() ? { email: email.trim() } : {}),
                      ...(roleId ? { roleId } : {}),
                    },
                    () => {
                      setInviting(false);
                      setDisplayName("");
                      setEmail("");
                      setRoleId("");
                    },
                  )
                }
              >
                {pending ? "Inviting…" : "Invite"}
              </Button>
              <Button disabled={pending} onClick={() => setInviting(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <div>
          <Button variant="primary" onClick={() => setInviting(true)}>
            Invite someone
          </Button>
        </div>
      )}

      <Panel
        flush
        title="Everyone"
        action={
          <Link href="/roles" className="text-[13px] text-accent-ink no-underline hover:underline">
            What roles allow →
          </Link>
        }
      >
        {people.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState compact title="Nobody has been invited yet" />
          </div>
        ) : (
          <RowList>
            {people.map((person) => (
              <Row key={person.membershipId}>
                <div className="min-w-0">
                  <p className="m-0 flex items-center gap-2 text-[14px] text-text">
                    {person.displayName}
                    {person.state !== "Active" && <Badge>{person.state}</Badge>}
                  </p>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    {person.email ?? "No email"} · {person.organizationName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Select
                    aria-label={`Role for ${person.displayName}`}
                    value={person.roleId ?? ""}
                    disabled={pending}
                    onChange={(event) =>
                      run("verity.platform.assign_role", {
                        membershipId: person.membershipId,
                        roleId: event.target.value === "" ? null : event.target.value,
                      })
                    }
                  >
                    <option value="">No role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </Row>
            ))}
          </RowList>
        )}
      </Panel>
    </div>
  );
}
