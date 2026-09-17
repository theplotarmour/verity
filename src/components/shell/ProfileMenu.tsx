"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { signOut } from "@/server/actions/platform";

/**
 * Top-bar identity control. Was a static, unclickable avatar — Sign out lived
 * only in the desktop sidebar's own footer (overlapping the assistant dock at
 * small viewport heights) and there was no single reachable "Settings" entry
 * point at all. This replaces the avatar with the actual menu: Account
 * (`/account`, every role, no gate) and Settings (`/settings`) — also
 * ungated, deliberately: `/settings`'s own Appearance section is a per-user
 * cookie preference (theme/accent), not tenant policy, so every actor needs
 * to reach it. Sections inside `/settings` that ARE tenant-admin-only
 * (Business, Tax, Advanced configuration) gate themselves at that page, the
 * same pattern `PermissionDenied` already covers elsewhere on this platform.
 */
export function ProfileMenu({
  userLabel,
  userInitials,
}: {
  userLabel: string;
  userInitials: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={userLabel}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-accent-subtle text-[13px] font-medium text-accent-ink shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-accent-line)] transition-transform duration-150 hover:-translate-y-px"
      >
        <span aria-hidden="true">{userInitials}</span>
        <span className="sr-only">Account menu — signed in as {userLabel}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="glass-overlay absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-xl p-1.5"
        >
          <div className="truncate px-3 py-2 text-[12.5px] text-text-tertiary">{userLabel}</div>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-text no-underline transition-colors hover:bg-surface-sunken"
          >
            <Icon name="parties" size={17} className="shrink-0 text-text-tertiary" />
            Account
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-text no-underline transition-colors hover:bg-surface-sunken"
          >
            <Icon name="configuration" size={17} className="shrink-0 text-text-tertiary" />
            Settings
          </Link>
          <div className="my-1.5 border-t border-line" />
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 py-2 text-left text-[14px] text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text"
            >
              <Icon name="signOut" size={17} className="shrink-0 text-text-tertiary" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
