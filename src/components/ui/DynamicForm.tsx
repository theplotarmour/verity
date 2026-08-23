import type { FieldDescriptor, FormDescriptor } from "@/server/platform/experience";

/**
 * Renders a form from a descriptor (implementation/08-experience/metadata-driven-ui.md).
 *
 * The component makes no decisions: which fields exist, whether they are
 * editable, and which are secondary are all resolved server-side by the
 * experience runtime. That is deliberate — a capability adding an entity or a
 * tenant adding a custom field must change the interface without any component
 * being edited.
 *
 * This is platform scaffolding, not product UI. It is intentionally unstyled.
 */

function Control({ field, disabled }: { field: FieldDescriptor; disabled: boolean }) {
  const locked = disabled || field.readOnly;

  switch (field.control) {
    case "checkbox":
      return <input type="checkbox" name={field.name} disabled={locked} />;
    case "number":
      return <input type="number" name={field.name} required={field.required} disabled={locked} />;
    case "date":
      return <input type="date" name={field.name} required={field.required} disabled={locked} />;
    case "select":
      return (
        <select name={field.name} required={field.required} disabled={locked}>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "readonly":
      // Unknown declared type: show it, never edit it, never crash the form.
      return <input type="text" name={field.name} readOnly disabled />;
    default:
      return <input type="text" name={field.name} required={field.required} disabled={locked} />;
  }
}

export function DynamicForm({ descriptor }: { descriptor: FormDescriptor }) {
  const primary = descriptor.fields.filter((f) => !f.secondary);
  const secondary = descriptor.fields.filter((f) => f.secondary);

  return (
    <form data-entity={descriptor.entityKey} data-readonly={descriptor.readOnly}>
      <fieldset disabled={descriptor.readOnly}>
        {primary.map((field) => (
          <label key={field.name}>
            {field.name}
            <Control field={field} disabled={descriptor.readOnly} />
          </label>
        ))}

        {/* PRN-002: secondary metadata sits behind disclosure rather than
            competing with the fields most users came for. */}
        {secondary.length > 0 && (
          <details>
            <summary>Additional fields</summary>
            {secondary.map((field) => (
              <label key={field.name}>
                {field.name}
                <Control field={field} disabled={descriptor.readOnly} />
              </label>
            ))}
          </details>
        )}
      </fieldset>
    </form>
  );
}
