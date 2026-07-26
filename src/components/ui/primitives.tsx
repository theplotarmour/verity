"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

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

  const sizes = {
    sm: "h-9 gap-1.5 rounded-[10px] px-3 text-xs",
    md: "h-11 gap-2 rounded-[12px] px-4 text-sm",
    lg: "h-12 gap-2 rounded-[14px] px-5 text-[15px]",
    icon: "h-9 w-9 shrink-0 rounded-[10px] p-0",
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

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
) {
  const { error, ...rest } = props;
  return (
    <select
      {...rest}
      className={cn(
        "h-[44px] w-full rounded-[12px] border bg-background px-3 text-sm text-text-primary outline-none transition-all duration-200 focus:ring-0",
        error 
          ? "border-danger text-danger focus:border-danger focus:shadow-[inset_0_0_14px_-4px_rgba(239,68,68,0.25)]" 
          : "border-border focus:border-[var(--brand)]/70 focus:shadow-[inset_0_0_14px_-4px_var(--brand)]/15",
        props.className,
      )}
    />
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
