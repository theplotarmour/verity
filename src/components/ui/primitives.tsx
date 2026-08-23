import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

/**
 * The Verity design system primitives.
 *
 * Authority: Bible V4 §1 (UX Constitution), §5.A (status semantics), and the
 * accessibility requirements of the experience brief.
 *
 * Kept deliberately small. The brief warns against building two hundred
 * components before proving the core experience, so this is the set the shell
 * actually needs and nothing speculative.
 */

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------- surfaces -------------------------------- */

/**
 * A content region.
 *
 * Bible V4 §1.A says hierarchy comes from alignment and negative space rather
 * than borders and boxes, so the default has no border at all — only a solid
 * surface. `bordered` exists for the cases where a boundary genuinely carries
 * meaning, such as a data table.
 */
export function Surface({
  children,
  bordered = false,
  className,
}: {
  children: ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "bg-surface rounded-lg",
        bordered && "border border-line",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-8">
      <div className="min-w-0">
        {/* Light, not semibold. The board builds hierarchy from size, tracking
            and space — and only weights 200–500 are loaded, so a `font-semibold`
            here asked for a 600 the family does not ship and got a synthesized
            approximation of it. */}
        <h1 className="text-[26px] font-light tracking-[-0.02em] text-text m-0">{title}</h1>
        {description && (
          <p className="text-text-secondary mt-1 mb-0 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function SectionHeading({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.09em] text-text-tertiary m-0">
        {children}
      </h2>
      {note && <span className="text-[13px] text-text-tertiary">{note}</span>}
    </div>
  );
}

/* -------------------------------- button --------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ variant = "secondary", size = "md", className, ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors " +
    "disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap";

  // 44px minimum on touch targets; Bible V4 §2.3 requires large tap targets for
  // deskless users and WCAG asks for the same.
  const sizes = {
    sm: "h-8 px-3 text-[13px] min-h-8",
    md: "h-10 px-4 text-[14px] min-h-11 sm:min-h-10",
  };

  // `text-accent-on` rather than white: the accent is gold, and white on gold
  // measures 2.4:1 — below every WCAG threshold. The board's own contrast
  // routine picks dark ink for a light accent, which reaches 7.3:1.
  const variants = {
    primary: "bg-accent text-accent-on hover:bg-accent-hover font-medium shadow-sm",
    secondary: "bg-surface text-text border border-line-strong hover:bg-surface-sunken",
    ghost: "bg-transparent text-text-secondary hover:bg-surface-sunken hover:text-text",
    danger: "bg-danger text-white hover:opacity-90",
  };

  return <button className={cx(base, sizes[size], variants[variant], className)} {...rest} />;
}

/* --------------------------------- form ---------------------------------- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-text">
        {label}
        {required && (
          <span className="text-danger ml-1" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-[13px] text-text-tertiary m-0">
          {hint}
        </p>
      )}
      {/* role=alert so a screen reader announces a validation failure without
          the user having to hunt for it. */}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] text-danger m-0">
          {error}
        </p>
      )}
    </div>
  );
}

const controlClass =
  "w-full h-10 min-h-11 sm:min-h-10 px-3 rounded-md bg-surface text-text " +
  "border border-line-strong placeholder:text-text-tertiary " +
  "disabled:opacity-55 disabled:cursor-not-allowed";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(controlClass, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(controlClass, "pr-8", props.className)} />;
}

/* -------------------------------- status --------------------------------- */

/**
 * Renders a platform StateCategory (ADR-009).
 *
 * Two rules the brief is explicit about. The UI must not invent a second state
 * taxonomy, so this accepts only the six canonical categories. And state must
 * never be communicated by colour alone, so every badge carries a text label and
 * a distinct glyph — a red dot and a green dot are the same dot to a
 * colour-blind user, and identical in a monochrome print-out.
 */
const CATEGORY_PRESENTATION: Record<
  string,
  { label: string; glyph: string; color: string; background: string }
> = {
  Draft: { label: "Draft", glyph: "○", color: "text-[var(--color-state-draft)]", background: "bg-surface-sunken" },
  Pending: { label: "Pending", glyph: "◐", color: "text-[var(--color-state-pending)]", background: "bg-warning-subtle" },
  // Active reads on the info bed, not the accent bed. Gold now means "selected
  // or actionable" everywhere else in the shell; letting one StateCategory also
  // claim it would make a gold row ambiguous between "this is where you are"
  // and "this record is running".
  Active: { label: "Active", glyph: "◉", color: "text-[var(--color-state-active)]", background: "bg-info-subtle" },
  Blocked: { label: "Blocked", glyph: "▲", color: "text-[var(--color-state-blocked)]", background: "bg-danger-subtle" },
  Completed: { label: "Completed", glyph: "●", color: "text-[var(--color-state-completed)]", background: "bg-success-subtle" },
  Cancelled: { label: "Cancelled", glyph: "×", color: "text-[var(--color-state-cancelled)]", background: "bg-surface-sunken" },
};

export function StateBadge({ category, label }: { category: string; label?: string }) {
  const preset = CATEGORY_PRESENTATION[category] ?? {
    label: category,
    glyph: "•",
    color: "text-text-secondary",
    background: "bg-surface-sunken",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 px-2 h-6 rounded-sm text-[13px] font-medium",
        preset.background,
        preset.color,
      )}
    >
      <span aria-hidden="true">{preset.glyph}</span>
      {/* The tenant's own label when there is one, the category otherwise. */}
      <span>{label ?? preset.label}</span>
    </span>
  );
}

/* ----------------------------- state displays ---------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <p className="text-text font-medium m-0">{title}</p>
      {description && (
        <p className="text-text-secondary mt-1 mb-0 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * An error the user can act on.
 *
 * The brief requires an error to say what happened, what the user can do, and
 * whether the action completed. `retryable` distinguishes "try again" from "this
 * will not succeed however many times you try", which is the difference between
 * a useful message and a shrug.
 */
export function ErrorState({
  title,
  message,
  issues,
  retryable,
}: {
  title: string;
  message: string;
  issues?: string[];
  retryable?: boolean;
}) {
  return (
    <div role="alert" className="rounded-md bg-danger-subtle px-4 py-3">
      <p className="font-medium text-danger m-0">{title}</p>
      <p className="text-text-secondary mt-1 mb-0">{message}</p>
      {issues && issues.length > 0 && (
        <ul className="mt-2 mb-0 pl-5 text-text-secondary">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-text-tertiary mt-2 mb-0">
        {retryable
          ? "The change was not applied. Retrying is safe."
          : "The change was not applied. Retrying will not help until something changes."}
      </p>
    </div>
  );
}

export function PermissionDenied({ what }: { what: string }) {
  return (
    <EmptyState
      title="You do not have access to this"
      description={`Your current role does not permit ${what}. Switching organization may change what you can see.`}
    />
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="p-4 flex flex-col gap-3">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded-sm bg-surface-sunken" />
      ))}
    </div>
  );
}

/* --------------------------------- misc ---------------------------------- */

export function DemoDataNotice() {
  return (
    <p className="text-[13px] text-text-tertiary m-0">
      Records prefixed “Demo” are development fixtures, not production data.
    </p>
  );
}

export function DefinitionList({ items }: { items: Array<{ term: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-[minmax(140px,auto)_1fr] gap-x-6 gap-y-3 m-0">
      {items.map(({ term, value }) => (
        <div key={term} className="contents">
          <dt className="text-text-tertiary text-[13px]">{term}</dt>
          <dd className="m-0 text-text break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
