"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type NavMenuItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  description?: string;
};

/**
 * One dropdown in the floating header — a nav group that was a sidebar section.
 *
 * A dropdown hides its contents, which is a real cost in a tool people sit in
 * all day. Two things pay it back: the trigger stays lit while any page inside
 * it is open, so you can always see *which* area you are in without opening
 * anything; and the items carry their description, which the icon-width sidebar
 * could never show.
 */
export function NavMenu({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavMenuItem[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // The group is "current" when any page inside it is — this is what keeps
  // wayfinding intact once the items themselves are hidden.
  const groupActive = items.some((item) => isActive(item.href));

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Navigating closes the menu. Without this it stays open over the page you
  // just asked for.
  useEffect(() => setOpen(false), [pathname]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors",
          groupActive
            ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
            : "text-text-secondary hover:bg-surface-2/70 hover:text-text-primary",
        )}
      >
        {title}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="verity-fade-in verity-glass absolute left-0 z-50 mt-2 w-[280px] overflow-hidden rounded-[18px] p-1.5"
        >
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-start gap-3 rounded-[12px] px-3 py-2.5 transition-colors",
                  active
                    ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                    : "text-text-secondary hover:bg-surface-2/70 hover:text-text-primary",
                )}
              >
                {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : null}
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{item.label}</span>
                  {item.description ? (
                    <span className="mt-0.5 block text-[11px] text-text-tertiary">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
