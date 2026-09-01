"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormRow,
  Input,
  Panel,
  Row,
  RowList,
} from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";
import { Modal, ModalCancel } from "@/components/ui/Modal";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Godown = { id: string; name: string };

/**
 * The godowns a business holds stock in.
 *
 * RACKS ARE GONE, at the product owner's request. They were a shelf-level
 * layout inside each godown — a real idea, and one this business does not
 * work at: stock is counted and moved by godown, and every screen that mattered
 * already aggregated racks away. What remained was a second thing to maintain
 * before the first one was useful.
 *
 * Removing them from here also removed them from receiving and issuing, where
 * the rack picker would otherwise have become a control that could never have
 * options — the one place it appeared was the only place they could be created.
 *
 * The rows themselves are NOT deleted. A movement already recorded against a
 * rack still names it, and dropping the table would orphan that history to tidy
 * a screen. The commands stay registered and unreachable, which is the honest
 * state of a feature that has been withdrawn rather than undone.
 */
export function GodownList({
  godowns,
  organizations,
}: {
  godowns: Godown[];
  organizations: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Godown | null>(null);
  const [removing, setRemoving] = useState<Godown | null>(null);
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [pending, startTransition] = useTransition();

  function run(key: string, input: unknown, after: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/godowns");
      if (result.ok) {
        after();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const dialogs = (
    <>
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New godown"
        description="Somewhere stock is held. Every movement names one, so this is the first thing to set up."
        footer={
          <>
            <ModalCancel onClose={() => setCreating(false)} disabled={pending} />
            <Button
              variant="primary"
              disabled={pending || name.trim() === "" || organizationId === ""}
              onClick={() =>
                run(
                  "verity.location.create_location",
                  { name: name.trim(), organizationId },
                  () => {
                    setCreating(false);
                    setName("");
                  },
                )
              }
            >
              {pending ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        <FormRow columns="minmax(0,1.4fr) minmax(0,1fr)">
          <Field label="Name" htmlFor="godown-name" required>
            <Input
              id="godown-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Okhla Storage Depot"
              autoFocus
            />
          </Field>
          <Field
            label="Belongs to"
            htmlFor="godown-org"
            required
            hint="Decides who can reach what is held here"
          >
            <Combobox
              id="godown-org"
              value={organizationId}
              onChange={setOrganizationId}
              required
              placeholder="Search"
              options={organizations.map((organization) => ({
                value: organization.id,
                label: organization.name,
              }))}
            />
          </Field>
        </FormRow>
      </Modal>

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename godown"
        width="sm"
        footer={
          <>
            <ModalCancel onClose={() => setRenaming(null)} disabled={pending} />
            <Button
              variant="primary"
              disabled={pending || name.trim() === ""}
              onClick={() =>
                run(
                  "verity.location.edit_location",
                  { locationId: renaming!.id, name: name.trim() },
                  () => setRenaming(null),
                )
              }
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Name" htmlFor="godown-rename" required>
          <Input
            id="godown-rename"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </Field>
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name ?? ""}?`}
        description="A godown that has held stock is archived, not deleted — every movement and balance points at it, and a quantity whose godown vanished cannot be placed. One that has never held anything is deleted outright."
        width="sm"
        footer={
          <>
            <ModalCancel onClose={() => setRemoving(null)} disabled={pending}>
              Keep
            </ModalCancel>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                run(
                  "verity.location.remove_location",
                  { locationId: removing!.id },
                  () => setRemoving(null),
                )
              }
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="m-0 text-[13px] text-text-secondary">
          Stock history does not change either way.
        </p>
      </Modal>
    </>
  );

  if (godowns.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {failure && (
          <ErrorState
            title="That change was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        )}
        <Panel flush>
          <EmptyState
            compact
            title="No godowns yet"
            description="Everything you hold is held somewhere. Create the first one, and stock movements can name it."
            action={
              organizations.length === 0 ? undefined : (
                <Button variant="primary" onClick={() => setCreating(true)}>
                  Create a godown
                </Button>
              )
            }
          />
        </Panel>
        {dialogs}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {failure && (
        <ErrorState
          title="That change was refused"
          message={failure.message}
          issues={failure.issues}
          retryable={failure.retryable}
        />
      )}

      <Panel
        flush
        title={godowns.length === 1 ? "1 godown" : `${godowns.length} godowns`}
        action={
          organizations.length === 0 ? undefined : (
            <Button
              variant="primary"
              onClick={() => {
                setName("");
                setCreating(true);
              }}
            >
              New godown
            </Button>
          )
        }
      >
        <RowList>
          {godowns.map((godown) => (
            <Row key={godown.id}>
              <span className="min-w-0 truncate text-[14px] text-text">
                {godown.name}
              </span>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setName(godown.name);
                    setRenaming(godown);
                  }}
                >
                  Rename
                </Button>
                <Button size="sm" onClick={() => setRemoving(godown)}>
                  Remove
                </Button>
              </div>
            </Row>
          ))}
        </RowList>
      </Panel>

      {dialogs}
    </div>
  );
}
