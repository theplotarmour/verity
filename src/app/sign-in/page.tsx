import { redirect } from "next/navigation";
import { resolveActor } from "@/server/platform/auth";
import { accentStyle } from "@/server/platform/accent";
import { SignInForm } from "./SignInForm";
import { SignInThemeToggle } from "./SignInThemeToggle";
import { BrandPanel } from "./BrandPanel";
import { VerityLockup } from "@/components/brand/VerityMark";

export const dynamic = "force-dynamic";

/**
 * Authentication — the product's front door.
 *
 * REDESIGNED against a supplied reference board (2026-09-04): a two-column
 * "product-led" composition — left, the brand story and a floating preview
 * of the real product; right, the credential form — replacing the earlier
 * single-column minimal composition. Matched structurally to the reference:
 * layout, spacing, field order, and copy. The mark itself stays exactly as
 * approved (`VerityLockup`) — a reference board does not override ADR-012's
 * monochrome-mark rule, and the board's own mark is a generic hourglass
 * glyph, not Verity's.
 *
 * ACCENT: this page only, pinned to Warm Sand Gold (`#D4A017`, one of the
 * ten ADR-012 presets) — not a change to the signed-in app's own default
 * (Verity Mint, ADR-012), which still comes from the tenant's stored
 * `verity-accent` cookie via `accentStyle()` in the root layout.
 *
 * Overriding just the 5 base tokens `accentStyle()` returns (inline on this
 * page's own wrapper) is NOT enough: `--color-accent`, the 50→900 ladder,
 * and the subtle/line/muted variants are declared ONCE at `:root` in
 * `globals.css`, each as `var(--accent-seed)` / `light-dark(var(...))`. A
 * custom property's computed value is substituted where it is DECLARED, and
 * a descendant that never redeclares that property simply inherits the
 * ancestor's already-substituted string — overriding only the ingredient
 * (`--accent-seed`) does nothing for a DERIVED property nobody redeclared.
 * Confirmed live: with only the 5 tokens overridden, `--color-accent`
 * computed as the tenant's actual stored accent, not gold. So the whole
 * derived block is redeclared together below, fresh, at this page's own
 * scope — the same formulas `globals.css` uses, just sourced from gold.
 *
 * No Google/OAuth entry — deliberately not added.
 *
 * Only the experience changed. The authentication contract, session
 * handling, membership resolution and redirect behaviour are untouched.
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

export default async function SignInPage() {
  // Already signed in with a usable membership? Nothing to do here.
  const actor = await resolveActor();
  if (actor) redirect("/");

  return (
    <>
      {/* Static, server-authored CSS text with no user input — see the
          module comment above for why this can't be a plain inline `style`
          prop. A sibling of `<main>`, deliberately: as a child it becomes an
          actual grid ITEM inside `<main>`'s own 2-column grid and silently
          consumes the first cell, pushing everything else out of place. */}
      <style dangerouslySetInnerHTML={{ __html: ACCENT_OVERRIDE_CSS }} />

      <main id="main" className="grid min-h-dvh grid-cols-1 bg-canvas lg:grid-cols-2">
        <BrandPanel />

        <div className="relative flex flex-col px-6 py-10 sm:px-16 lg:px-20 lg:py-14">
          <div className="flex justify-end">
            <SignInThemeToggle />
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <div className="mx-auto w-full max-w-[400px]">
              <h1 className="m-0 text-[32px] font-normal leading-tight tracking-[-0.02em] text-text">
                Welcome back.
              </h1>
              <p className="m-0 mt-2 text-[15px] text-text-secondary">
                Sign in to your Verity workspace.
              </p>

              <div className="mt-9">
                <SignInForm />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pb-2 pt-10">
            <VerityLockup size={20} className="text-text" />
            <p className="m-0 text-[10px] uppercase tracking-[0.24em] text-text-tertiary">
              Operate. Optimize. Outperform.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
