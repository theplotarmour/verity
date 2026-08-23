import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { VeritySymbol } from "@/components/brand/VerityMark";

/**
 * The Verity design system primitives.
 *
 * Authority: Bible V4 §1 (UX Constitution), §5.A (status semantics), and the
 * approved identity boards in `verity-app-ui-mockups/`.
 *
 * The composition rules these encode, so that individual screens do not each
 * re-decide them:
 *
 *   • Hierarchy comes from SIZE, SPACE and POSITION — never from weight. Only
 *     200–500 are loaded, headings are Light, and nothing is bold.
 *   • A card is a hairline and a radius. No shadow at rest, no fill, no colour.
 *     Elevation is reserved for things that genuinely float (menus, sheets).
 *   • Gold marks what is actionable, selected or live. Nothing else.
 *   • Labels are 11px caps with wide tracking; values are 13–14px regular. That
 *     pairing is the board's whole information rhythm and it repeats everywhere.
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
 * than borders and boxes — but an operational surface does need to say where one
 * record's information stops. The compromise is a hairline and nothing else:
 * bordered by default, never filled, never shadowed at rest.
 */
export function Surface({
  children,
  bordered = true,
  className,
}: {
  children: ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("rounded-lg bg-surface", bordered && "border border-line", className)}>
      {children}
    </div>
  );
}

/**
 * A titled card.
 *
 * The board's repeating unit: a quiet label row, a hairline, then content. It
 * exists so that the label/rule/body rhythm is identical on every screen instead
 * of being re-improvised per page — which is precisely how a shell starts to
 * look assembled rather than designed.
 */
export function Panel({
  title,
  action,
  children,
  flush = false,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Content sits edge to edge — for tables and row lists that own their padding. */
  flush?: boolean;
  className?: string;
}) {
  return (
    <Surface className={cx("overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 className="m-0 text-[11px] font-medium uppercase tracking-[0.09em] text-text-tertiary">
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </Surface>
  );
}

/**
 * The page's masthead.
 *
 * `eyebrow` carries operating context — which capability, which parent record —
 * so the title itself never has to be padded out with it. The description is
 * held to a measure rather than the full column, because a line of body copy
 * running the width of a 1440px screen is unreadable regardless of how good the
 * typography is.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  // One block of text, actions beside it. Two earlier arrangements were wrong in
  // different ways: aligning actions to the bottom settled them against the last
  // line of the description, and putting them on their own row with the title
  // pushed them BETWEEN the title and the description on mobile, where the row
  // collapses. Centring against the whole text block reads as deliberate at every
  // width and keeps the reading order intact when it stacks.
  return (
    <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        {eyebrow && (
          <p className="m-0 mb-2 text-[11px] font-medium uppercase tracking-[0.09em] text-text-tertiary">
            {eyebrow}
          </p>
        )}
        <h1 className="m-0 text-[28px] font-light leading-[1.15] tracking-[-0.02em] text-text">
          {title}
        </h1>
        {description && (
          <p className="mb-0 mt-2.5 max-w-[62ch] text-[14px] leading-relaxed text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A quiet label above a block of content. Pairs with `Panel`'s title row. */
export function SectionHeading({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="m-0 text-[11px] font-medium uppercase tracking-[0.09em] text-text-tertiary">
        {children}
      </h2>
      {note && <span className="text-[12px] text-text-tertiary">{note}</span>}
    </div>
  );
}

/**
 * A single real number with its label.
 *
 * Takes a `value` the caller has actually counted. There is no placeholder, no
 * trend arrow and no sparkline, because the platform has nothing to compare
 * against yet and inventing the comparison is exactly the fake metric §18
 * forbids. Zero is displayed as zero and reads as a fact.
 */
export function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  // The label reserves two lines. In a row of cards one label wraps and its
  // neighbours do not, and without a reserved box the numbers sit at different
  // heights — which reads as a broken grid rather than as a long label.
  const body = (
    <>
      <span className="min-h-[2.2em] text-[11px] font-medium uppercase leading-[1.1] tracking-[0.09em] text-text-tertiary">
        {label}
      </span>
      <span className="tabular mt-1 text-[30px] font-light leading-none tracking-[-0.02em] text-text">
        {value}
      </span>
      {hint && <span className="mt-auto pt-3 text-[12px] text-text-tertiary">{hint}</span>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="flex flex-col rounded-lg border border-line bg-surface p-5 no-underline transition-colors hover:border-line-strong"
      >
        {body}
      </a>
    );
  }
  return <div className="flex flex-col rounded-lg border border-line bg-surface p-5">{body}</div>;
}

/* -------------------------------- button --------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ variant = "secondary", size = "md", className, ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors " +
    "disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap";

  // 44px minimum on touch targets; Bible V4 §2.3 requires large tap targets for
  // deskless users and WCAG asks for the same. On desktop they tighten to the
  // board's compact controls.
  const sizes = {
    sm: "h-11 sm:h-8 px-3 text-[13px]",
    md: "h-11 sm:h-[38px] px-4 text-[13px]",
  };

  // `text-accent-on` rather than white: the accent is gold, and white on gold
  // measures 2.4:1 — below every WCAG threshold. The board's own contrast
  // routine picks dark ink for a light accent, which reaches 7.3:1.
  const variants = {
    primary: "bg-accent text-accent-on hover:bg-accent-hover",
    secondary: "border border-line-strong bg-surface text-text hover:bg-surface-sunken",
    ghost: "bg-transparent text-text-secondary hover:bg-surface-sunken hover:text-text",
    danger: "bg-danger text-white hover:opacity-90",
  };

  return <button className={cx(base, sizes[size], variants[variant], className)} {...rest} />;
}

/* --------------------------------- form ---------------------------------- */

/**
 * A labelled control.
 *
 * The label is 12px medium rather than caps: a form is read in sequence, and
 * tracked-out capitals slow that down even though they suit a standing column
 * header. Hint and error occupy the same slot so the layout does not jump when
 * validation appears.
 */
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
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-text">
        {label}
        {required && (
          <span className="ml-1 text-text-tertiary" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="m-0 text-[12px] text-text-tertiary">
          {hint}
        </p>
      )}
      {/* role=alert so a screen reader announces a validation failure without
          the user having to hunt for it. */}
      {error && (
        <p id={errorId} role="alert" className="m-0 text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Control chrome.
 *
 * A hairline at rest and a gold ring on focus. The ring is drawn with
 * `box-shadow` rather than `outline` so it follows the border radius exactly —
 * a square outline around a 9px-rounded input is the kind of detail that reads
 * as unfinished without anyone being able to say why.
 */
const controlClass =
  "w-full h-11 sm:h-[38px] px-3 rounded-md bg-surface text-text text-[14px] " +
  "border border-line-strong placeholder:text-text-tertiary transition-colors " +
  "hover:border-text-tertiary " +
  "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-subtle)] " +
  "disabled:cursor-not-allowed disabled:opacity-55";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(controlClass, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(controlClass, "cursor-pointer pr-8", props.className)} />;
}

/**
 * A group of fields under one heading, separated from the next by a hairline.
 *
 * Long forms need visible grouping or every field looks equally important. This
 * is the form equivalent of `Panel` and keeps that rhythm consistent.
 */
export function FieldSet({
  legend,
  description,
  children,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1 p-0 text-[11px] font-medium uppercase tracking-[0.09em] text-text-tertiary">
        {legend}
      </legend>
      {description && (
        <p className="mb-4 mt-0 max-w-[52ch] text-[12px] text-text-tertiary">{description}</p>
      )}
      <div className={cx("flex flex-col gap-4", !description && "mt-4")}>{children}</div>
    </fieldset>
  );
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
  // Active reads on the info bed, not the accent bed. Gold means "selected or
  // actionable" everywhere else in the shell; letting one StateCategory also
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
        "inline-flex h-[22px] items-center gap-1.5 rounded-sm px-2 text-[12px] font-medium",
        preset.background,
        preset.color,
      )}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">
        {preset.glyph}
      </span>
      {/* The tenant's own label when there is one, the category otherwise. */}
      <span>{label ?? preset.label}</span>
    </span>
  );
}

/* ----------------------------- state displays ---------------------------- */

/**
 * Nothing to show — composed, not apologised for.
 *
 * The mark sits above the message at low opacity. An empty operational surface
 * is the state a new tenant spends its first week in, and a bare line of grey
 * text in the middle of a white rectangle reads as a page that failed to load.
 * The brief asks for zero data to look like an early platform, not a broken app.
 */
export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** For an empty block inside a panel, where full height would dominate the page. */
  compact?: boolean;
}) {
  return (
    <div className={cx("flex flex-col items-center px-6 text-center", compact ? "py-10" : "py-16")}>
      <VeritySymbol size={compact ? 20 : 26} className="text-text-tertiary opacity-25" />
      <p className={cx("m-0 text-text", compact ? "mt-4 text-[14px]" : "mt-5 text-[15px]")}>{title}</p>
      {description && (
        <p className="mx-auto mb-0 mt-2 max-w-[44ch] text-[13px] leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
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
 *
 * Rendered as a bordered notice rather than a saturated block: an operator meets
 * these several times a day, and a shouting red panel each time is exhausting
 * without being more informative.
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
    <div
      role="alert"
      className="rounded-lg border border-danger/25 bg-danger-subtle px-4 py-3.5"
    >
      <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-danger">
        <span aria-hidden="true" className="text-[11px] leading-none">
          ▲
        </span>
        {title}
      </p>
      <p className="mb-0 mt-1.5 text-[13px] leading-relaxed text-text">{message}</p>
      {issues && issues.length > 0 && (
        <ul className="mb-0 mt-2 list-none p-0 text-[13px] text-text-secondary">
          {issues.map((issue) => (
            <li key={issue} className="before:mr-2 before:content-['—']">
              {issue}
            </li>
          ))}
        </ul>
      )}
      <p className="mb-0 mt-2.5 text-[12px] text-text-tertiary">
        {retryable
          ? "The change was not applied. Retrying is safe."
          : "The change was not applied. Retrying will not help until something changes."}
      </p>
    </div>
  );
}

/**
 * Authorization refused.
 *
 * Deliberately says nothing about what exists behind the boundary — naming the
 * records would leak them. It does name the one thing the user can act on:
 * their operating context, which is genuinely what changes the answer.
 */
export function PermissionDenied({ what }: { what: string }) {
  return (
    <Surface className="mt-2">
      <EmptyState
        title="You do not have access to this"
        description={`Your current role does not permit ${what}. Switching organization in the sidebar may change what you can see.`}
      />
    </Surface>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3 p-5">
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
    <p className="m-0 text-[12px] text-text-tertiary">
      Records prefixed “Demo” are development fixtures, not production data.
    </p>
  );
}

/**
 * Term/value pairs for a detail record.
 *
 * Hairline-separated rows rather than a two-column grid. On a detail page the
 * eye scans down the values, and a grid with a shared column boundary makes long
 * values wrap into a ragged block that is harder to scan than it looks in a
 * mockup with short sample data.
 */
export function DefinitionList({ items }: { items: Array<{ term: string; value: ReactNode }> }) {
  return (
    <dl className="m-0">
      {items.map(({ term, value }, i) => (
        <div
          key={term}
          className={cx(
            "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5",
            i > 0 && "border-t border-line",
          )}
        >
          <dt className="text-[12px] text-text-tertiary">{term}</dt>
          <dd className="m-0 min-w-0 break-words text-right text-[14px] text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A hairline-separated list of records inside a `Panel flush`.
 *
 * Shared so that scheduling bookings, evidence captures, approval steps and
 * audit rows all sit on the same rhythm instead of each inventing a row height.
 */
export function RowList({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-none divide-y divide-line p-0">{children}</ul>;
}

export function Row({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={cx("flex items-center justify-between gap-4 px-5 py-3.5", className)}>
      {children}
    </li>
  );
}
