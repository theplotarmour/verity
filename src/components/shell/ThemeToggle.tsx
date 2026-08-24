"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icons";

type Preference = "light" | "dark" | "system";

const ORDER: Preference[] = ["light", "dark", "system"];
const ICON: Record<Preference, IconName> = { light: "sun", dark: "moon", system: "system" };
const LABEL: Record<Preference, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match system",
};

/** A year. Long enough that the choice survives, short enough to expire. */
const MAX_AGE = 60 * 60 * 24 * 365;

function readPreference(): Preference {
  const match = document.cookie.match(/(?:^|;\s*)verity-theme=(light|dark|system)/);
  return (match?.[1] as Preference) ?? "system";
}

/**
 * Theme control. Three states, as the board specifies — Light, Dark, System.
 *
 * The preference is a COOKIE, not localStorage, so the server can stamp
 * `data-theme` into the first byte of HTML. That is what lets the document
 * carry no theme script at all; see `app/layout.tsx` and `globals.css`.
 *
 * "System" is a real state and not a synonym for the current system value: a
 * user who picks it expects the interface to follow the OS when it changes at
 * dusk. It is stored as written, and it removes the attribute entirely — the
 * stylesheet's `color-scheme: light dark` then follows the OS on its own, with
 * no media listener to attach and nothing to keep in sync.
 *
 * The attribute is also set here directly rather than waiting for a navigation,
 * so switching is instant instead of a round trip.
 *
 * Rendering is deferred until after mount. The server does not send the
 * preference down to this component, so anything drawn from it during SSR would
 * be a guess that hydration then corrects in front of the user.
 */
export function ThemeToggle() {
  const [preference, setPreference] = useState<Preference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPreference(readPreference());
    setMounted(true);
  }, []);

  function choose(next: Preference) {
    setPreference(next);
    document.cookie = `verity-theme=${next}; path=/; max-age=${MAX_AGE}; samesite=lax`;
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  }

  // Placeholder holds the exact footprint so the header does not reflow when
  // the real control appears.
  if (!mounted) return <div className="size-11 lg:size-9" aria-hidden="true" />;

  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]!;

  return (
    <button
      type="button"
      onClick={() => choose(next)}
      title={`Theme: ${LABEL[preference]}. Switch to ${LABEL[next]}.`}
      className="grid size-11 cursor-pointer place-items-center rounded-md border border-line bg-surface text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text lg:size-9"
    >
      <Icon name={ICON[preference]} size={17} />
      {/* The icon alone does not say which of three states is active, so the
          state is also carried as text for assistive technology. */}
      <span className="sr-only">
        Theme: {LABEL[preference]}. Activate to switch to {LABEL[next]}.
      </span>
    </button>
  );
}
