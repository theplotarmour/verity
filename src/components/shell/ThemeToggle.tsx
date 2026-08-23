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

/**
 * Theme control. Three states, as the board specifies — Light, Dark, System.
 *
 * "System" is a real state and not a synonym for the current system value: a
 * user who picks it expects the interface to follow the OS when it changes at
 * dusk. So the preference is stored as written, and only the RESOLVED value is
 * stamped onto the document. The media listener stays attached while the
 * preference is "system" and is removed otherwise.
 *
 * Rendering is deferred until after mount. The server cannot know the stored
 * preference, so anything drawn from it during SSR would be a guess that
 * hydration then corrects in front of the user.
 */
export function ThemeToggle() {
  const [preference, setPreference] = useState<Preference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("verity-theme") as Preference | null;
    if (stored && ORDER.includes(stored)) setPreference(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = preference === "dark" || (preference === "system" && media.matches);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    };

    apply();
    localStorage.setItem("verity-theme", preference);

    if (preference !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference, mounted]);

  // Placeholder holds the exact footprint so the header does not reflow when
  // the real control appears.
  if (!mounted) return <div className="size-9 sm:size-[29px]" aria-hidden="true" />;

  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]!;

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      title={`Theme: ${LABEL[preference]}. Switch to ${LABEL[next]}.`}
      className="grid size-11 sm:size-[29px] place-items-center rounded-sm border-0 bg-transparent text-text-secondary hover:bg-control hover:text-text cursor-pointer transition-colors"
    >
      <Icon name={ICON[preference]} size={15.5} />
      {/* The icon alone does not say which of three states is active, so the
          state is also carried as text for assistive technology. */}
      <span className="sr-only">Theme: {LABEL[preference]}. Activate to switch to {LABEL[next]}.</span>
    </button>
  );
}
