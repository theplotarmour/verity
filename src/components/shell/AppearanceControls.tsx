"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { AccentPicker } from "@/components/shell/AccentPicker";

type Preference = "light" | "dark" | "system";

const THEMES: Array<{ value: Preference; label: string; icon: "sun" | "moon" | "system" }> = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "system" },
];

const MAX_AGE = 60 * 60 * 24 * 365;
const HEX = /^#[0-9a-fA-F]{6}$/;

function readCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];
}

function write(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

/**
 * Appearance — theme and accent.
 *
 * Both preferences are cookies the SERVER reads, which is what lets the document
 * arrive already correct with no script and no flash. This control therefore
 * does two things on every change: it writes the cookie so the next request is
 * right, and it applies the change to the live document so the current one is
 * too. Without the second the user would wait for a navigation to see their own
 * choice; without the first it would not survive one.
 *
 * The accent is a single custom property. Every accent surface in the product
 * derives from it through `color-mix` in `globals.css`, so nothing here needs to
 * know which components exist — and adding a component later needs no change
 * here either.
 *
 * `--color-accent-on` is the one value CSS cannot derive: choosing dark or light
 * ink requires a contrast comparison. It is computed here with the same rule the
 * server uses, so a live change and a reload agree.
 */
export function AppearanceControls({
  presets,
  defaultAccent,
}: {
  presets: ReadonlyArray<{ name: string; hex: string }>;
  defaultAccent: string;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<Preference>("system");
  const [accent, setAccent] = useState(defaultAccent);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = readCookie("verity-theme");
    if (t === "light" || t === "dark" || t === "system") setTheme(t);
    const a = readCookie("verity-accent");
    if (a && HEX.test(a)) setAccent(a.toUpperCase());
    setMounted(true);
  }, []);

  function chooseTheme(next: Preference) {
    setTheme(next);
    write("verity-theme", next);
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  }

  /**
   * Live preview during a drag — a direct style write only. No cookie, no
   * `router.refresh()`, because the picker fires this on every pointer-move
   * and a server round trip per pixel would stutter.
   */
  function previewAccent(hex: string) {
    const value = hex.toUpperCase();
    const root = document.documentElement;
    root.style.setProperty("--accent-seed", value);
    // Same rule as the server's `onAccentFor`: whichever candidate contrasts
    // better wins. Assuming white would fail on every light accent.
    root.style.setProperty("--color-accent-on", onAccentFor(value));
  }

  /** Commit on release/blur/quick-pick — writes the cookie and reloads server data. */
  function commitAccent(hex: string) {
    const value = hex.toUpperCase();
    setAccent(value);
    write("verity-accent", value);
    previewAccent(value);
    router.refresh();
  }

  if (!mounted) return <div className="h-[168px]" aria-hidden="true" />;

  return (
    <div className="flex flex-col gap-7">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 p-0 text-[13px] font-medium text-text">Theme</legend>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => chooseTheme(t.value)}
              aria-pressed={theme === t.value}
              className={
                "inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-4 text-[13.5px] transition-colors " +
                (theme === t.value
                  ? "bg-accent-subtle font-medium text-text ring-1 ring-[var(--color-accent-line)]"
                  : "verity-solid border border-line text-text-secondary hover:text-text")
              }
            >
              <Icon name={t.icon} size={17} />
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1 p-0 text-[13px] font-medium text-text">Accent</legend>
        <p className="mb-3 mt-0 max-w-[52ch] text-[12px] text-text-tertiary">
          Changes the interface only. The Verity mark keeps its own colour — brand and accent are
          separate systems.
        </p>

        <AccentPicker
          key={accent}
          initialHex={accent}
          presets={presets}
          onPreview={previewAccent}
          onCommit={commitAccent}
        />
      </fieldset>
    </div>
  );
}

/** Mirrors `onAccentFor` on the server so a live change and a reload agree. */
function onAccentFor(hex: string): string {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = (h: string) => {
    const n = h.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16)));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  return ratio(hex, "#191A1C") >= ratio(hex, "#FFFFFF") ? "#191A1C" : "#FFFFFF";
}
