"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormDescriptor } from "@/server/platform/experience";
import { Button, DefinitionList, ErrorState, Field, Input, Panel, Select } from "@/components/ui/primitives";
import { runCommand, type ActionFailure } from "@/server/actions/platform";

/**
 * Tenant custom fields, rendered from platform metadata (§B.5).
 *
 * The descriptor is built server-side from the tenant's own CustomFieldSchema
 * rows, so a tenant that declares a field sees it here without any component
 * changing — which is the whole point of PLA-EXT-002. Validation happens twice
 * and deliberately: the browser gets immediate feedback, and the command
 * re-validates against the same schema because a client check is a convenience,
 * never a control.
 *
 * This is not a form builder. It renders declared fields of five declared types
 * and nothing else; an unknown type degrades to read-only rather than inventing
 * a widget for it.
 */
export function CustomFieldsPanel({
  entityKey,
  entityId,
  descriptor,
  values,
  canEdit,
}: {
  entityKey: string;
  entityId: string;
  descriptor: FormDescriptor;
  values: Record<string, unknown>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const custom = descriptor.fields.filter((f) => f.secondary);

  if (custom.length === 0) {
    return (
      <Panel title="Custom fields">
        <p className="m-0 max-w-[60ch] text-[13px] leading-relaxed text-text-secondary">
          This tenant has declared no custom fields for {entityKey.split(".").pop()}. Declaring one
          makes it appear here and in the record&rsquo;s validation, with no code change.
        </p>
      </Panel>
    );
  }

  return (
    <section>
      {!editing ? (
        <Panel
          title="Custom fields"
          action={
            descriptor.readOnly ? (
              <span className="text-[12px] text-text-tertiary">Locked — terminal state</span>
            ) : canEdit ? (
              <Button size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : undefined
          }
        >
          <DefinitionList
            items={custom.map((field) => ({
              term: field.name,
              value:
                values[field.name] === undefined ||
                values[field.name] === null ||
                values[field.name] === ""
                  ? "—"
                  : String(values[field.name]),
            }))}
          />
        </Panel>
      ) : (
        <form
          className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5"
          action={(formData) => {
            setFailure(null);
            const payload: Record<string, unknown> = {};
            for (const field of custom) {
              const raw = formData.get(field.name);
              if (raw === null || raw === "") continue;
              // Coerce to the declared type; the command re-validates regardless.
              payload[field.name] =
                field.control === "number" ? Number(raw)
                : field.control === "checkbox" ? raw === "on"
                : String(raw);
            }
            // A checkbox submits nothing when unticked, so absent booleans are false.
            for (const field of custom) {
              if (field.control === "checkbox" && !(field.name in payload)) payload[field.name] = false;
            }

            startTransition(async () => {
              const result = await runCommand(
                "verity.location.set_custom_fields",
                { locationId: entityId, customFields: payload },
                `/locations/${entityId}`,
              );
              if (result.ok) {
                setEditing(false);
                router.refresh();
              } else {
                setFailure(result);
              }
            });
          }}
        >
          {failure && (
            <ErrorState
              title="Could not save the custom fields"
              message={failure.message}
              issues={failure.issues}
              retryable={failure.retryable}
            />
          )}

          {custom.map((field) => {
            const current = values[field.name];
            const id = `cf-${field.name}`;
            return (
              <Field
                key={field.name}
                label={field.name}
                htmlFor={id}
                required={field.required}
                hint={field.control === "readonly" ? "Unrecognised field type — shown read-only." : undefined}
              >
                {field.control === "select" ? (
                  <Select id={id} name={field.name} defaultValue={String(current ?? "")} required={field.required}>
                    <option value="">—</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Select>
                ) : field.control === "checkbox" ? (
                  <input id={id} name={field.name} type="checkbox" defaultChecked={Boolean(current)} />
                ) : (
                  <Input
                    id={id}
                    name={field.name}
                    type={field.control === "number" ? "number" : field.control === "date" ? "date" : "text"}
                    step={field.control === "number" ? "any" : undefined}
                    defaultValue={String(current ?? "")}
                    required={field.required}
                    readOnly={field.control === "readonly"}
                  />
                )}
              </Field>
            );
          })}

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
