"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  Select,
} from "@/components/ui/primitives";
import { runClientCommand } from "@/server/actions/hq";
import type { ActionFailure } from "@/server/platform/action-error";
import type { OrgRow } from "./page";

type TreeNode = OrgRow & { depth: number };

/**
 * The organization hierarchy for one client.
 *
 * Rendered as a flattened tree with indentation rather than nested lists,
 * because the operations here — re-parent, rename — act on one node and a
 * nested DOM makes the row you are acting on harder to keep in view than the
 * indentation it replaces.
 *
 * The hierarchy is not decoration: ADR-005 makes Organization the nesting level
 * inside a Tenant, and PLA-ORG-002/003 make it the thing Organization-scoped
 * permissions resolve against — a person sees their own node and its
 * descendants, never a sibling's. Moving a node here changes who can see what,
 * which is why the move is a command with an audit record and not a drag.
 */
export function OrganizationsAdmin({
  tenantId,
  organizations,
}: {
  tenantId: string;
  organizations: OrgRow[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const tree = useMemo(() => flatten(organizations), [organizations]);

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runClientCommand(tenantId, key, input);
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

      <div className="mb-4 flex items-center justify-end">
        <Button variant="primary" onClick={() => setCreating((open) => !open)}>
          {creating ? "Cancel" : "New organization"}
        </Button>
      </div>

      {creating && (
        <div className="mb-6">
          <Panel title="New organization">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.platform.create_organization",
                  {
                    name: String(formData.get("name") ?? ""),
                    parentId: String(formData.get("parentId") ?? "") || null,
                  },
                  () => setCreating(false),
                )
              }
            >
              <div className="min-w-[240px]">
                <Field label="Name" htmlFor="org-name" required>
                  <Input id="org-name" name="name" required autoFocus />
                </Field>
              </div>
              <div className="min-w-[220px]">
                <Field label="Parent" htmlFor="org-parent">
                  <Select id="org-parent" name="parentId" defaultValue="">
                    <option value="">No parent (top level)</option>
                    {tree.map((node) => (
                      <option key={node.id} value={node.id}>
                        {"— ".repeat(node.depth)}
                        {node.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Create
              </Button>
            </form>
          </Panel>
        </div>
      )}

      <Panel title={`${organizations.length} in the hierarchy`} flush>
        {organizations.length === 0 ? (
          <EmptyState compact title="No organizations" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <caption className="sr-only">Organization hierarchy</caption>
              <thead>
                <tr>
                  {["Organization", "People", "Parent", "Actions"].map((heading) => (
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
                {tree.map((node) => (
                  <tr key={node.id}>
                    <td className="border-b border-line px-3 py-3 text-[14px] text-text">
                      <span style={{ paddingInlineStart: node.depth * 18 }}>
                        {node.depth > 0 && (
                          <span aria-hidden="true" className="mr-2 text-text-tertiary">
                            └
                          </span>
                        )}
                        {node.name}
                      </span>
                    </td>
                    <td className="tabular border-b border-line px-3 py-3 text-[14px]">
                      {node.memberCount}
                    </td>
                    <td className="border-b border-line px-3 py-3 text-[13px] text-text-secondary">
                      {organizations.find((o) => o.id === node.parentId)?.name ?? "—"}
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <Button size="sm" onClick={() => setEditing(editing === node.id ? null : node.id)}>
                        {editing === node.id ? "Close" : "Edit"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <div className="mt-6">
          <Panel title={`Edit ${organizations.find((o) => o.id === editing)?.name ?? ""}`}>
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.platform.update_organization",
                  {
                    organizationId: editing,
                    name: String(formData.get("name") ?? ""),
                    parentId: String(formData.get("parentId") ?? "") || null,
                  },
                  () => setEditing(null),
                )
              }
            >
              <div className="min-w-[240px]">
                <Field label="Name" htmlFor="edit-org-name" required>
                  <Input
                    id="edit-org-name"
                    name="name"
                    required
                    defaultValue={organizations.find((o) => o.id === editing)?.name ?? ""}
                  />
                </Field>
              </div>
              <div className="min-w-[220px]">
                <Field
                  label="Parent"
                  htmlFor="edit-org-parent"
                  hint="Moving a node moves its subtree with it. A move into your own subtree is refused."
                >
                  <Select
                    id="edit-org-parent"
                    name="parentId"
                    defaultValue={organizations.find((o) => o.id === editing)?.parentId ?? ""}
                  >
                    <option value="">No parent (top level)</option>
                    {tree
                      .filter((node) => node.id !== editing)
                      .map((node) => (
                        <option key={node.id} value={node.id}>
                          {"— ".repeat(node.depth)}
                          {node.name}
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Save
              </Button>
            </form>
          </Panel>
        </div>
      )}
    </>
  );
}

/**
 * Depth-first flatten, parents before children.
 *
 * Anything not reachable from a root is appended at the end rather than
 * dropped: a node whose parent is missing is a real state worth seeing, and
 * silently hiding it would make the page disagree with the count beside it.
 */
function flatten(organizations: OrgRow[]): TreeNode[] {
  const byParent = new Map<string | null, OrgRow[]>();
  for (const org of organizations) {
    const siblings = byParent.get(org.parentId) ?? [];
    siblings.push(org);
    byParent.set(org.parentId, siblings);
  }

  const out: TreeNode[] = [];
  const seen = new Set<string>();

  const walk = (parentId: string | null, depth: number) => {
    for (const org of byParent.get(parentId) ?? []) {
      if (seen.has(org.id)) continue;
      seen.add(org.id);
      out.push({ ...org, depth });
      walk(org.id, depth + 1);
    }
  };

  walk(null, 0);
  for (const org of organizations) {
    if (!seen.has(org.id)) out.push({ ...org, depth: 0 });
  }
  return out;
}
