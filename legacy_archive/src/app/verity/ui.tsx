"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * HQ primitives.
 *
 * Separate from `@/components/ui/primitives` on purpose. Those read the theme
 * tokens, which the owner shell overwrites with each tenant's brand colour —
 * an operator screen that changes colour depending on which client was opened
 * last is worse than no styling at all. These are fixed dark and fixed scarlet.
 */

export function HqCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-white/8 bg-white/[0.02] p-4", className)}>
      {children}
    </div>
  );
}

export function HqStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "brand";
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-bold tracking-[-0.03em]",
          tone === "brand" ? "text-[#FF1D2A]" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function HqButton({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const variants = {
    primary: "bg-[#FF1D2A] text-white border-transparent hover:brightness-110",
    ghost: "bg-transparent text-white/60 border-white/12 hover:border-white/30 hover:text-white",
    danger: "bg-transparent text-[#FF6B74] border-[#FF6B74]/30 hover:bg-[#FF6B74]/10",
  } as const;

  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition-all",
        "disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function HqInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[14px] text-white",
        "placeholder:text-white/25 focus:border-[#FF1D2A]/50 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function HqSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      // `bg-[#141416]` on the element makes the native option list dark too,
      // which the theme-token select cannot do here.
      className={cn(
        "min-h-11 w-full rounded-xl border border-white/10 bg-[#141416] px-3 text-[14px] text-white",
        "focus:border-[#FF1D2A]/50 focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function HqField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-white/30">{hint}</span> : null}
    </label>
  );
}

export function HqDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
