import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { VeritySymbol } from "@/components/brand/VerityMark";

/**
 * The Verity design system primitives.
 *
 * Authority: the approved brand identity board (`public/image.png`) and Bible
 * V4 §1 (UX Constitution) / §5.A (status semantics).
 *
 * The composition rules the board sets, encoded here once so that individual
 * screens do not each re-decide them:
 *
 *   • The page is Sand 100 and surfaces are pure white. A card is a hairline, a
 *     14px radius and white — it needs no shadow to read as raised, because the
 *     ground beneath it is warm and the card is not.
 *   • Hierarchy comes from SIZE, SPACE and POSITION. Headings are Light (300).
 *     Semibold appears exactly twice in the whole system: Heading 3, and the
 *     primary button label.
 *   • Labels are sentence case at 12–13px. The board's application screens use
 *     no tracked-out capitals anywhere; that treatment belongs to the printed
 *     identity sheet, not to the product.
 *   • Gold marks what is actionable, selected or live. Nothing else.
 *   • Status is a coloured dot beside a label, never a coloured pill. Six
 *     competing beds on one screen is noise; a dot and a word is a status.
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
 * record's information stops. The board's answer is a hairline, a radius and
 * white; that is all this is.
 */
export function Surface({
  children,
  bordered = true,
  solid = false,
  className,
}: {
  children: ReactNode;
  bordered?: boolean;
  /**
   * Level 5 — an opaque surface.
   *
   * ADR-011 keeps dense tables, long-form text, high-density forms, semantic
   * status and destructive confirmation off the glass, because translucency
   * costs contrast exactly where legibility matters most. This is how a caller
   * says so, rather than every screen re-deciding.
   */
  solid?: boolean;
  className?: string;
}) {
  if (solid) {
    return (
      <div
        className={cx(
          "rounded-xl bg-surface shadow-sm",
          bordered && "border border-line",
          className,
        )}
      >
        {children}
      </div>
    );
  }
  return <div className={cx("glass-card", className)}>{children}</div>;
}

/**
 * A titled card — the board's repeating unit.
 *
 * The title sits INSIDE the card's padding with no rule beneath it, exactly as
 * the board draws "Orders", "Stock" and "Recyclers". A hairline under every card
 * title turns a page of cards into a page of tables.
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
        <div
          className={cx(
            "flex items-center justify-between gap-4 px-6 pt-5",
            flush ? "pb-4" : "pb-1",
          )}
        >
          <h2 className="m-0">{title}</h2>
          {action}
        </div>
      )}
      <div className={flush ? "" : cx("px-6 pb-6", title ? "pt-4" : "pt-6")}>{children}</div>
    </Surface>
  );
}

/**
 * The page's masthead.
 *
 * One line, Heading 1 at the board's printed 32/40 Light. There is deliberately
 * no eyebrow: the board's screens go straight to the title, and a kicker above a
 * heading is a label doing work the heading already does. Operating context
 * lives in the shell's own context control, which is where a reader looks for
 * it, rather than being restated above every title.
 */
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
    <header className="mb-6">
      <div className="min-w-0">
        <h1 className="truncate">{title}</h1>
        {description && (
          <p className="mb-0 mt-2 max-w-[62ch] text-[14px] leading-relaxed text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {/* Page actions read as a toolbar under the masthead rather than beside
          the title. That is where the board puts an action — at the head of the
          content it acts on — and it is the only placement that cannot collide
          with the shell controls sharing the title's row. */}
      {actions && (
        <div className="mt-5 flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      )}
    </header>
  );
}

/** A quiet label above a block of content. Pairs with `Panel`'s title row. */
export function SectionHeading({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="m-0 text-[13px] font-medium leading-5 tracking-normal text-text">
        {children}
      </h2>
      {note && <span className="text-[12px] text-text-tertiary">{note}</span>}
    </div>
  );
}

/* --------------------------------- stats --------------------------------- */

/**
 * One real number with its label — value first, label beneath.
 *
 * That order is the board's, and it is the right one: the number is what the
 * reader came for and the label only qualifies it. Labels above turn a row of
 * figures into a row of captions.
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
  const body = (
    <>
      <span className="tabular text-[24px] font-normal leading-none tracking-[-0.02em] text-text">
        {value}
      </span>
      <span className="mt-2 text-[13px] leading-[1.3] text-text-tertiary">{label}</span>
      {hint && <span className="mt-auto pt-3 text-[12px] text-text-tertiary">{hint}</span>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="flex flex-col rounded-md px-5 py-4 no-underline transition-colors hover:bg-glass-2"
      >
        {body}
      </a>
    );
  }
  return <div className="flex flex-col px-5 py-4">{body}</div>;
}

/**
 * A band of stats inside ONE card, the way the board groups them.
 *
 * Four separate bordered cards for four numbers is four frames around nothing;
 * the board draws one card with the figures ranged across it. Hairlines run
 * between the columns on desktop only — on a phone they stack, and a vertical
 * rule between stacked blocks points the wrong way.
 */
export function StatRow({
  cols = 4,
  className,
  children,
}: {
  cols?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Surface
      className={cx(
        "grid grid-cols-2 divide-line [&>*]:min-w-0",
        cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4",
        "sm:divide-x",
        className,
      )}
    >
      {children}
    </Surface>
  );
}

/* -------------------------------- button --------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

/**
 * The board draws exactly three button weights: a gold fill, a white fill with
 * a hairline, and a bare glyph. This is those three plus `danger`, which the
 * board has no example of and which is drawn as the secondary shape in danger
 * ink rather than as a red fill — a destructive action should be legible, not
 * loud, on a screen an operator uses all day.
 */
export function Button({ variant = "secondary", size = "md", className, ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg transition-colors " +
    "disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap cursor-pointer";

  // 44px minimum on touch; Bible V4 §2.3 requires large tap targets for
  // deskless users and WCAG asks for the same. On a pointer device they tighten
  // to the board's 36–38px controls.
  const sizes = {
    sm: "h-10 px-3.5 text-[13px]",
    md: "h-11 px-5 text-[14px]",
  };

  // Primary fills with the accent and takes dark ink by default: #00D1B2 is a
  // LIGHT accent, where white measures 2.40:1 and #191A1C measures 7.00:1.
  // `text-accent-on` is stamped by the server after a contrast comparison, so a
  // light accent gets dark ink and a dark accent gets white — automatically, for
  // any preset or custom hex. Nothing here assumes which.
  const variants = {
    primary:
      "bg-accent text-accent-on font-medium hover:bg-accent-hover " +
      "shadow-[var(--shadow-highlight),0_8px_22px_-8px_var(--color-accent-line)]",
    secondary: "glass-control text-text font-medium hover:border-line-strong",
    ghost: "bg-transparent text-text-secondary font-medium hover:bg-glass-2 hover:text-text",
    danger: "border border-danger/40 bg-danger-subtle text-danger font-medium hover:border-danger/60",
  };

  return <button className={cx(base, sizes[size], variants[variant], className)} {...rest} />;
}

/**
 * A square control holding a single glyph.
 *
 * The board's header and toolbar are built from these: 36px, 10px radius, white,
 * hairline. `label` is required — an icon-only control with no accessible name
 * is a button only sighted mouse users can operate.
 */
export function IconButton({
  label,
  children,
  tone = "default",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  /** `accent` is the board's single gold action at the end of a toolbar. */
  tone?: "default" | "accent" | "bare";
}) {
  const tones = {
    default: "glass-control text-text-secondary hover:text-text",
    accent: "border border-transparent bg-accent text-accent-on hover:bg-accent-hover",
    bare: "border border-transparent bg-transparent text-text-secondary hover:text-text hover:bg-glass-2",
  };
  return (
    <button
      type="button"
      title={label}
      className={cx(
        "grid size-11 shrink-0 place-items-center rounded-xl transition-colors cursor-pointer",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

/**
 * The small control that sits at the top-right of a card.
 *
 * The mockup gives cards two kinds: a quiet pill with a glyph ("This month")
 * and a plain accent link ("View all"). Both are the same size and the same
 * optical weight, so a row of cards reads as one system rather than as a row of
 * differently-decorated boxes.
 */
export function CardAction({
  children,
  href,
  icon,
  variant = "pill",
}: {
  children: ReactNode;
  href?: string;
  icon?: ReactNode;
  variant?: "pill" | "link";
}) {
  const className =
    variant === "pill"
      ? "inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-sunken px-2.5 text-[12.5px] text-text-secondary no-underline transition-colors hover:text-text"
      : "inline-flex h-8 items-center text-[13px] text-accent-ink underline underline-offset-4 transition-colors hover:text-accent";

  if (href) {
    return (
      <a href={href} className={className}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <span className={className}>
      {icon}
      {children}
    </span>
  );
}

/* --------------------------------- form ---------------------------------- */

/**
 * A labelled control.
 *
 * The label is 13px medium sentence case, matching every other label in the
 * system. Hint and error occupy the same slot so the layout does not jump when
 * validation appears.
 */
/**
 * A row of fields whose labels, controls and hints line up across the row.
 *
 * Task 71 item 2. The desks laid fields out with `flex items-end`, so a field
 * carrying a hint under its control was taller than its neighbours and aligning
 * their BOTTOMS pushed its label and input upward — which is exactly the
 * staircase in the reported screenshot: Supplier's input sat a row below
 * GSTIN's, which sat below State code's, which sat below Phone's.
 *
 * A three-row subgrid fixes it structurally rather than by hand-tuning
 * padding: every field spans the same label row, control row and hint row, so
 * the three baselines are shared whether or not a given field has a hint.
 * Fields with no hint simply leave the third row empty.
 *
 * `columns` is a raw `grid-template-columns` value so a caller states the
 * intended widths once, in one place, instead of hanging a width class on a
 * wrapper div around every field.
 */
export function FormRow({
  columns = "repeat(auto-fit, minmax(200px, 1fr))",
  className,
  children,
}: {
  columns?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx("form-row grid gap-x-3 gap-y-4", className)}
      style={{
        gridTemplateColumns: columns,
        // Three explicit bands. A field that wraps to a second visual row then
        // gets its own three implicit rows rather than colliding with these.
        gridTemplateRows: "auto auto auto",
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}

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

  // `verity-field` carries the layout, from globals.css, rather than utility
  // classes here. `FormRow` needs to override the display for its children, and
  // `.form-row > .verity-field` beats `.verity-field` by specificity — which is
  // a rule the cascade guarantees, unlike two Tailwind utilities of equal
  // weight where the winner depends on stylesheet order.
  return (
    <div className="verity-field">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-text">
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
 * Control chrome — the board's input: white, a Neutral 200 hairline, 10px
 * radius, 38px tall.
 *
 * The focus ring is drawn with `box-shadow` rather than `outline` so it follows
 * the border radius exactly; a square outline around a 10px-rounded input reads
 * as unfinished without anyone being able to say why.
 */
const controlClass =
  "glass-control w-full h-11 px-4 rounded-lg text-text text-[14px] " +
  "placeholder:text-text-tertiary transition-[border-color,box-shadow] duration-200 " +
  "hover:border-line-strong " +
  "focus:outline-none focus:border-accent " +
  "focus:shadow-[var(--shadow-highlight),0_0_0_3px_var(--color-accent-subtle)] " +
  "disabled:cursor-not-allowed disabled:opacity-55";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(controlClass, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(controlClass, "cursor-pointer pr-8", props.className)} />;
}

/**
 * A labelled checkbox, styled to the same glass/accent/focus-ring language as
 * `Input`/`Select` rather than the browser default box.
 */
const CHECKBOX_TICK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 8.5l3 3 6-7'/%3E%3C/svg%3E\")";

export function Checkbox({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cx("flex cursor-pointer items-center gap-2.5 text-[13px] text-text", className)}>
      <input
        type="checkbox"
        {...rest}
        style={{
          // Only painted when actually checked — a plain CSS background-image
          // is not gated by `:checked` like the Tailwind `checked:` variant is,
          // so an unconditional one here would show the tick on every box.
          backgroundImage: rest.checked ? CHECKBOX_TICK : "none",
          backgroundSize: "12px",
          ...rest.style,
        }}
        className={cx(
          "size-[18px] shrink-0 cursor-pointer appearance-none rounded-[5px] border border-line-strong",
          "bg-surface bg-center bg-no-repeat transition-[background-color,border-color,box-shadow] duration-150",
          "checked:border-accent checked:bg-accent",
          "hover:border-line-strong focus-visible:outline-none",
          "focus-visible:shadow-[0_0_0_3px_var(--color-accent-subtle)]",
          "disabled:cursor-not-allowed disabled:opacity-55",
        )}
      />
      {label}
    </label>
  );
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
      <legend className="mb-1 p-0 text-[13px] font-medium text-text">{legend}</legend>
      {description && (
        <p className="mb-4 mt-0.5 max-w-[52ch] text-[12px] text-text-tertiary">{description}</p>
      )}
      <div className={cx("flex flex-col gap-4", !description && "mt-4")}>{children}</div>
    </fieldset>
  );
}

/* -------------------------------- status --------------------------------- */

/**
 * Renders a platform StateCategory (ADR-009).
 *
 * The board's own status vocabulary is a small coloured dot beside a plain
 * label — see its "In Stock / Border Soon / Out of Stock / Low Stock" list. That
 * is what this draws. A coloured pill per state would put up to six competing
 * beds on one table, and on a Sand page an amber pill reads as "selected"
 * rather than as "pending".
 *
 * Two rules the brief is explicit about. The UI must not invent a second state
 * taxonomy, so this accepts only the six canonical categories. And state must
 * never be communicated by colour alone, which is why the label is not optional
 * decoration here — the word carries the meaning and the dot reinforces it.
 */
const CATEGORY_PRESENTATION: Record<string, { label: string; color: string }> = {
  Draft: { label: "Draft", color: "bg-[var(--color-state-draft)]" },
  Pending: { label: "Pending", color: "bg-[var(--color-state-pending)]" },
  // Active is not gold. Gold means "selected or actionable" everywhere else in
  // the shell; letting one StateCategory also claim it would make a gold row
  // ambiguous between "this is where you are" and "this record is running".
  Active: { label: "Active", color: "bg-[var(--color-state-active)]" },
  Blocked: { label: "Blocked", color: "bg-[var(--color-state-blocked)]" },
  Completed: { label: "Completed", color: "bg-[var(--color-state-completed)]" },
  Cancelled: { label: "Cancelled", color: "bg-[var(--color-state-cancelled)]" },
};

export function StateBadge({ category, label }: { category: string; label?: string }) {
  const preset = CATEGORY_PRESENTATION[category] ?? {
    label: category,
    color: "bg-[var(--color-text-tertiary)]",
  };

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-text">
      <span aria-hidden="true" className={cx("size-[7px] shrink-0 rounded-full", preset.color)} />
      {/* The tenant's own label when there is one, the category otherwise. */}
      {label ?? preset.label}
    </span>
  );
}

/**
 * A small neutral label pill — for provenance, not for `StateCategory`.
 *
 * `StateBadge` owns the six canonical categories (Bible V4 §5.A) and must not
 * gain a second use. This is for facts like "Tenant Override" / "Platform
 * Default" that are never a business state.
 */
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tone === "accent"
          ? "bg-accent-subtle text-accent-ink"
          : "bg-glass-2 text-text-tertiary",
      )}
    >
      {children}
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
      <VeritySymbol size={compact ? 20 : 26} className="text-accent opacity-30" />
      <p className={cx("m-0 text-text", compact ? "mt-4 text-[14px]" : "mt-5 text-[15px]")}>
        {title}
      </p>
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
 * Says what happened, what the user can do, and whether the action completed.
 * `retryable` distinguishes "try again" from "this will not succeed however many
 * times you try", which is the difference between a useful message and a shrug.
 *
 * Rendered as a bordered notice rather than a saturated block: an operator meets
 * these several times a day, and a shouting red panel each time is exhausting
 * without being more informative.
 */
/**
 * Strips the platform's error code off a message bound for a person.
 *
 * Audit finding U1-6. Refusals reached the screen reading
 * `E_VALIDATION: no price for Century MR Commercial Plywood 19mm for this
 * customer, and none given`. The sentence after the colon is good writing; the
 * prefix is platform vocabulary, which a client must never be shown (§0).
 *
 * Stripped HERE, at the presentation boundary, rather than at each of the
 * fifteen call sites — and deliberately not in the errors themselves, because
 * the code is genuinely useful in a log, in the audit trail and in a support
 * ticket. It should leave the screen, not the system.
 */
function withoutErrorCode(message: string): string {
  return message.replace(/^E_[A-Z_]+:\s*/, "");
}

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
    <div role="alert" className="rounded-lg border border-danger/25 bg-danger-subtle px-4 py-3.5">
      <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-danger">
        <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-danger" />
        {title}
      </p>
      <p className="mb-0 mt-1.5 text-[13px] leading-relaxed text-text">
        {withoutErrorCode(message)}
      </p>
      {issues && issues.length > 0 && (
        <ul className="mb-0 mt-2 list-none p-0 text-[13px] text-text-secondary">
          {issues.map((issue) => (
            <li key={issue} className="before:mr-2 before:content-['—']">
              {withoutErrorCode(issue)}
            </li>
          ))}
        </ul>
      )}
      <p className="mb-0 mt-2.5 text-[12px] text-text-tertiary">
        {retryable
          ? "Nothing was changed. Trying again is safe."
          // U1-6: the old wording — "retrying will not help until something
          // changes" — is true and tells the reader nothing. The message above
          // is where the specific next step belongs, so this line stops
          // pretending to be advice and just states the outcome.
          : "Nothing was changed. Fix the point above and try again."}
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
        description={`Your current role does not permit ${what}. Switching organization in the header may change what you can see.`}
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
          <dt className="text-[13px] text-text-tertiary">{term}</dt>
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

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li className={cx("flex items-center justify-between gap-4 px-5 py-3.5", className)}>
      {children}
    </li>
  );
}
