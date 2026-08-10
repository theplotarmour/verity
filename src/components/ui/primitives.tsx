"use client";

import * as React from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useDropdownPosition } from "./dropdown-position";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-border bg-surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-[20px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "neutral";
  children: ReactNode;
}) {
  const variants = {
    default: "bg-brand-soft text-brand-strong border border-brand/15",
    success: "bg-success-soft text-success border border-success/15",
    warning: "bg-warning-soft text-warning border border-warning/15",
    danger: "bg-danger-soft text-danger border border-danger/15",
    neutral: "bg-surface-2 text-text-secondary border border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  src,
  fallback,
  className,
}: {
  src?: string | null;
  fallback: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-text-secondary border border-border",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={fallback} className="h-full w-full rounded-full object-cover" />
      ) : (
        fallback.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

// One button system for the whole app. Sizes are a prop rather than ad-hoc
// `h-9 text-xs` overrides at the call site, which is what made buttons drift
// out of alignment across screens.
export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "success" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  const variants = {
    // Solid brand: the one obvious action on a screen.
    primary:
      "bg-[var(--brand)] text-white border-transparent hover:brightness-110 active:brightness-95 shadow-sm",
    secondary:
      "bg-surface text-text-primary border-border hover:bg-surface-2 hover:border-border",
    // The old primary look — a brand-tinted outline for secondary emphasis.
    outline:
      "bg-transparent text-[var(--brand)] border-[var(--brand)]/60 hover:border-[var(--brand)] hover:bg-[var(--brand)]/10",
    ghost:
      "bg-transparent text-text-secondary border-transparent hover:bg-surface-2 hover:text-text-primary",
    success: "bg-success text-white border-transparent hover:brightness-110 active:brightness-95",
    danger: "bg-danger text-white border-transparent hover:brightness-110 active:brightness-95",
  } as const;

  /**
   * `sm` and `icon` are 36px, which is under the 44px a finger needs. They are
   * bumped below the shell's own `md` breakpoint and restored above it: a
   * 44px-tall "sm" button on a dense desktop toolbar is not small any more, and
   * the size exists for that density. Mobile-first, so the base value is the
   * touch value.
   */
  const sizes = {
    sm: "h-11 md:h-9 gap-1.5 rounded-[10px] px-3 text-xs",
    md: "h-11 gap-2 rounded-[12px] px-4 text-sm",
    lg: "h-12 gap-2 rounded-[14px] px-5 text-[15px]",
    icon: "h-11 w-11 md:h-9 md:w-9 shrink-0 rounded-[10px] p-0",
  } as const;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const { onChange, type, error, ...rest } = props;
  return (
    <input
      {...rest}
      type={type}
      onChange={(event) => {
        if (type === "tel") {
          const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 10);
          event.currentTarget.value = digits;
        }
        onChange?.(event);
      }}
      className={cn(
        "h-[44px] w-full rounded-[12px] border bg-transparent px-3 text-sm text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:ring-0",
        error 
          ? "border-danger text-danger focus:border-danger focus:shadow-[inset_0_0_14px_-4px_rgba(239,68,68,0.25)]" 
          : "border-border focus:border-[var(--brand)]/70 focus:shadow-[inset_0_0_14px_-4px_var(--brand)]/15",
        props.className,
      )}
    />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
) {
  const { error, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={cn(
        "w-full min-h-[96px] rounded-[12px] border bg-transparent px-3 py-2 text-sm text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:ring-0",
        error 
          ? "border-danger text-danger focus:border-danger focus:shadow-[inset_0_0_14px_-4px_rgba(239,68,68,0.25)]" 
          : "border-border focus:border-[var(--brand)]/70 focus:shadow-[inset_0_0_14px_-4px_var(--brand)]/15",
        props.className,
      )}
    />
  );
}

/** One `<option>` child, flattened for the custom list. */
type SelectChoice = { value: string; label: string; disabled: boolean };

function readChoices(children: React.ReactNode): SelectChoice[] {
  const out: SelectChoice[] = [];
  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;
      // <optgroup> is flattened; the app does not use its grouping semantics.
      if (child.type === "optgroup") return walk((child.props as { children?: React.ReactNode }).children);
      if (child.type !== "option") return;
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement> & {
        children?: React.ReactNode;
      };
      const label =
        typeof props.children === "string"
          ? props.children
          : Array.isArray(props.children)
            ? props.children.filter((c) => typeof c === "string").join("")
            : String(props.value ?? "");
      out.push({
        value: String(props.value ?? label),
        label,
        disabled: Boolean(props.disabled),
      });
    });
  };
  walk(children);
  return out;
}

/**
 * A dropdown that looks like the rest of Verity rather than like the operating
 * system.
 *
 * The native control renders as a grey platform list that ignores our tokens
 * entirely, which on a tablet on a factory floor reads as a different app. The
 * real `<select>` is kept mounted and hidden so form semantics, `name`,
 * validation and refs all still work — and so `onChange` receives a genuine
 * HTMLSelectElement as its target, which every existing call site reads.
 */
/** Below this a list is quicker to read than to filter. */
const SEARCHABLE_FROM = 7;

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
) {
  const { error, children, className, ...rest } = props;
  const ref = React.useRef<HTMLSelectElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const choices = React.useMemo(() => readChoices(children), [children]);
  // Fixed-position and portalled: an absolute list is clipped by any scrolling
  // ancestor, and it has to open upward near the bottom of the screen.
  const { anchorRef, style } = useDropdownPosition<HTMLButtonElement>(open);

  const current = rest.value ?? rest.defaultValue;
  const selected = choices.find((c) => c.value === String(current ?? "")) ?? null;

  // Every dropdown in the app is searchable, rather than only the handful built
  // on SpecSelect. Adding it here reaches every call site at once instead of
  // rewriting each form — and a category tree or a unit list grows past the
  // point of scanning long before anyone thinks to convert that particular form.
  //
  // Short lists are left alone: a search box above two options is noise.
  const [query, setQuery] = React.useState("");
  const searchable = choices.length > SEARCHABLE_FROM;
  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return choices;
    return choices.filter((c) => c.label.toLowerCase().includes(q));
  }, [choices, query]);

  function choose(choice: SelectChoice) {
    setOpen(false);
    setQuery("");
    const node = ref.current;
    if (!node) return;
    node.value = choice.value;
    // A real change event so uncontrolled consumers and React's own listeners
    // both see it, rather than a hand-rolled object that only looks like one.
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function closeAfterFocusSettles() {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (anchorRef.current?.contains(active) || listRef.current?.contains(active)) return;
      setOpen(false);
    }, 0);
  }

  return (
    <div className="relative">
      <select {...rest} ref={ref} className="sr-only" tabIndex={-1} aria-hidden>
        {children}
      </select>

      <button
        type="button"
        ref={anchorRef}
        disabled={rest.disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setOpen((o) => !o);
        }}
        // Delayed so a click inside the list — including the search box —
        // lands before the list unmounts.
        onBlur={closeAfterFocusSettles}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
        }}
        className={cn(
          "flex h-[44px] w-full items-center justify-between gap-2 rounded-[12px] border bg-background px-3 text-left text-sm outline-none transition-all duration-200 disabled:opacity-50",
          selected ? "text-text-primary" : "text-text-tertiary",
          error
            ? "border-danger text-danger focus:border-danger"
            : "border-border focus:border-[var(--brand)]/70",
          className
        )}
      >
        <span className="truncate">{selected?.label ?? choices[0]?.label ?? ""}</span>
        <span aria-hidden className="shrink-0 text-xs text-text-tertiary">
          ▾
        </span>
      </button>

      {open && style && createPortal(
        <div
          ref={listRef}
          role="listbox"
          style={style}
          className="z-[9999] flex flex-col overflow-hidden rounded-[12px] border border-border bg-surface shadow-lg"
        >
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                // Enter on a single remaining match picks it, so a search can
                // be completed without reaching for the mouse.
                if (e.key === "Enter" && shown.length === 1 && !shown[0].disabled) {
                  e.preventDefault();
                  choose(shown[0]);
                }
              }}
              placeholder="Search…"
              className="shrink-0 border-b border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
          )}
          <ul className="min-h-0 flex-1 overflow-auto">
          {shown.length === 0 && (
            <li className="px-3 py-2 text-sm text-text-tertiary">No matches</li>
          )}
          {shown.map((choice) => (
            <li
              key={choice.value}
              role="option"
              aria-selected={choice.value === selected?.value}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!choice.disabled) choose(choice);
              }}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm text-text-primary hover:bg-brand-soft hover:text-[var(--brand)]",
                choice.disabled && "cursor-not-allowed opacity-40",
                choice.value === selected?.value && "bg-brand-soft text-[var(--brand)]"
              )}
            >
              {choice.label}
            </li>
          ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
        {title}
      </h2>
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-border bg-surface-2 p-8 text-center">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
    </div>
  );
}

export function LoadingState({
  title = "Loading",
  description = "Preparing data...",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-border bg-surface-2 p-8 text-center">
      <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
    </div>
  );
}

export function ErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-danger/15 bg-danger-soft/50 p-6 text-center">
      <h3 className="text-base font-semibold text-danger">{title}</h3>
      <p className="mt-1 text-sm text-danger/80">{description}</p>
    </div>
  );
}
