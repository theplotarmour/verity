import type { ReactNode } from "react";
import { accentStyle } from "@/server/platform/accent";
import { SignInThemeToggle } from "./SignInThemeToggle";
import { BrandPanel } from "./BrandPanel";
import { VerityLockup } from "@/components/brand/VerityMark";

/**
 * The front-door composition, shared by sign-in and the password-reset
 * pages (2026-09-15) so "Forgot password?" lands on the same screen the
 * person just left, not a different product. See `page.tsx` for why the
 * accent block is redeclared here in full.
 */
const GOLD = accentStyle("#D4A017");

/** The derived block from `globals.css` lines 96–139, redeclared together
 *  at `#main` so every level resolves from `GOLD`. */
const ACCENT_OVERRIDE_CSS = `
#main {
  --accent-seed: ${GOLD["--accent-seed"]};
  --accent-50: color-mix(in srgb, #ffffff 94%, var(--accent-seed));
  --accent-100: color-mix(in srgb, #ffffff 86%, var(--accent-seed));
  --accent-200: color-mix(in srgb, #ffffff 70%, var(--accent-seed));
  --accent-300: color-mix(in srgb, #ffffff 42%, var(--accent-seed));
  --accent-400: color-mix(in srgb, #ffffff 18%, var(--accent-seed));
  --accent-500: var(--accent-seed);
  --accent-600: color-mix(in srgb, #0d0d0f 12%, var(--accent-seed));
  --accent-700: color-mix(in srgb, #0d0d0f 26%, var(--accent-seed));
  --accent-800: color-mix(in srgb, #0d0d0f 42%, var(--accent-seed));
  --accent-900: color-mix(in srgb, #0d0d0f 58%, var(--accent-seed));

  --accent-fill-light: ${GOLD["--accent-fill-light"]};
  --accent-fill-dark: ${GOLD["--accent-fill-dark"]};
  --accent-ink-light: ${GOLD["--accent-ink-light"]};
  --accent-ink-dark: ${GOLD["--accent-ink-dark"]};

  --color-accent: light-dark(var(--accent-fill-light), var(--accent-fill-dark));
  --color-accent-hover: light-dark(var(--accent-700), var(--accent-200));
  --color-accent-active: light-dark(var(--accent-800), var(--accent-100));
  --color-accent-edge: var(--accent-700);

  --color-accent-subtle: light-dark(
    color-mix(in srgb, transparent 90%, var(--accent-seed)),
    color-mix(in srgb, transparent 85%, var(--accent-seed))
  );
  --color-accent-muted: light-dark(
    color-mix(in srgb, transparent 94%, var(--accent-seed)),
    color-mix(in srgb, transparent 91%, var(--accent-seed))
  );
  --color-accent-line: light-dark(
    color-mix(in srgb, transparent 72%, var(--accent-seed)),
    color-mix(in srgb, transparent 66%, var(--accent-seed))
  );

  --color-accent-on: light-dark(var(--accent-ink-light), var(--accent-ink-dark));
}
`;

export function AuthShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ACCENT_OVERRIDE_CSS }} />
      <main id="main" className="grid min-h-dvh grid-cols-1 bg-canvas lg:grid-cols-2">
        <BrandPanel />
        <div className="relative flex flex-col px-6 py-10 sm:px-16 lg:px-20 lg:py-14">
          <div className="flex justify-end">
            <SignInThemeToggle />
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="mx-auto w-full max-w-[400px]">
              <h1 className="m-0 text-[32px] font-normal leading-tight tracking-[-0.02em] text-text">{title}</h1>
              <p className="m-0 mt-2 text-[15px] text-text-secondary">{lead}</p>
              <div className="mt-9">{children}</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 pb-2 pt-10">
            <VerityLockup size={20} className="text-text" />
            <p className="m-0 text-[10px] uppercase tracking-[0.24em] text-text-tertiary">Operate. Optimize. Outperform.</p>
          </div>
        </div>
      </main>
    </>
  );
}
