import { redirect } from "next/navigation";
import { activeAuthProviderName, resolveActor } from "@/server/platform/auth";
import { SignInForm } from "./SignInForm";
import { AuthShell } from "./AuthShell";

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
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in with a usable membership? Nothing to do here.
  const actor = await resolveActor();
  if (actor) redirect("/");

  const provider = activeAuthProviderName();
  const { error } = await searchParams;

  return (
    <AuthShell title="Welcome back." lead="Sign in to your Verity workspace.">
      {provider === "oidc" ? (
        <div className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="m-0 rounded-md border border-danger/25 bg-danger-subtle px-3 py-2.5 text-[13px] text-danger">
              Your organization could not complete sign-in. Try again or contact your identity administrator.
            </p>
          )}
          <a
            href="/api/auth/oidc/start"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--brand)] px-4 text-[14px] font-medium text-white no-underline transition-opacity hover:opacity-90"
          >
            Continue with organization sign-in
          </a>
          <p className="m-0 text-center text-[13px] leading-relaxed text-text-secondary">
            Passwords and account recovery are managed by your organization&apos;s identity provider.
          </p>
        </div>
      ) : (
        <SignInForm />
      )}
    </AuthShell>
  );
}
