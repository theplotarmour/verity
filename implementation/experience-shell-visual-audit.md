# Experience Shell — Visual Rebuild Audit

**Date:** 2026-08-24
**Scope:** brand correction, sign-in rebuild, runtime fix. No client, pack or vertical started.
**Diagnosis:** `experience-shell-visual-gap-audit.md`

---

## 1. Previous state

The shell was structurally sound — contribution-driven navigation, correct tonal accent, correct
spacing and radii — but wearing the wrong logo. The mark was the **placeholder** from the design
source HTML (two mitred triangles, square aspect) rather than the approved artwork, and the wordmark
was Inter Light standing in for a geometric logotype. Sign-in explained the platform's internals in
a card floating in an empty viewport.

## 2. Runtime error — ROOT CAUSE FOUND, FIXED

**`Uncaught (in promise) TypeError: Failed to convert value to 'Response'`**

`src/proxy.ts` is the only code in the platform that must produce a `Response` — there are no route
handlers. It had no failure path around a call that reaches an external service on **every request**:

```ts
await supabase.auth.getUser();   // throws → promise rejects → Next has no Response
return response;
```

A Supabase outage, DNS failure, timeout, revoked refresh token, or a missing environment variable at
boot each produce a rejected promise where Next expects a Response. The result is not one broken
page — it is **every route at once**, including `/sign-in`, the one page that could have recovered
the session.

**Confirmed before fixing.** `src/test/proxy.test.ts` reproduced it: the pre-fix proxy rejected on a
throwing auth client, and two of four tests failed exactly as predicted.

**Fixed at the contract, not suppressed.** The boundary now always resolves to a Response. This is
safe *because the proxy performs no authorization* — a request that fails to refresh simply carries
no refreshed session, and the page's own `requireActor()` redirects to sign-in. The failure is
logged, not swallowed: a test asserts `console.error` is called, because a provider outage must not
look like users being randomly signed out.

**Regression coverage:** 4 tests — happy path, auth service throwing, client construction throwing,
and failure visibility.

**Verified in the browser:** sign-out → sign-in (failed) → sign-in (succeeded) → organization
switch → navigation. Console clean throughout; no uncaught promise errors, no hydration errors.

## 3. Security — FIXED (found while verifying)

The dev server printed credentials in plaintext:

```
└─ ƒ signInWithPassword("nobody@example.com", "wrongpassword123") in 537ms
```

Next.js logs server-action arguments, and the positional `(email, password)` signature put every
password into the server log — including production logs wherever action logging is enabled.

`signInWithPassword` now takes `FormData`, which that logger treats as opaque. The credential never
reaches the log. Authentication behaviour is otherwise unchanged.

## 4. Brand — REBUILT FROM THE ACTUAL ASSET

### The symbol

Derived by **measuring the supplied raster**, not by drawing:

| Parameter | Value | How |
|---|---|---|
| Aspect ratio | **0.6922** (16.613 × 24) | bounding box |
| Slanted edge | `x = 0.84178·y − 2.29246` | least-squares, residual **±0.02px** |
| Corner radius | **2.0** exactly | solved from tangency to the top edge and the slant |
| Pinch circle | centre (8.3064, 12), **r = 1.3135** | fitted to the notch |
| Virtual apex | y = 12.5911 | the triangles overshoot centre; the circle carves the overlap |

That last row is the detail the placeholder missed: the facing edges are **concave**, not pointed.

**Fidelity check.** The reconstructed path was rasterised and compared pixel-for-pixel against the
supplied asset: **0.468% disagreement**, entirely anti-aliasing at the edges.

### The wordmark

"verity" is a geometric logotype, not Inter. Reproducing it with a font would be an approximation of
a logo, which the brief forbids — so the **approved artwork itself** is used, extracted to
`public/brand/verity-wordmark.png` and applied as an alpha mask painted with `currentColor`. It is
pixel-exact to what was signed off and still inherits the theme's ink in light and dark.

A gamma lift (0.55) is applied to the mask alpha. A hairline logotype scaled down ~7× averages its
stroke with the page and renders grey; the lift keeps the strokes reading as ink at small sizes
without thickening the letterforms.

Tracing it to a vector path was attempted first and **rejected**: it produced 24 anti-aliasing
fragments in an 8.6 KB path — a lossy re-derivation, not the asset.

### Lockup and favicon

Proportions measured from the primary logo: symbol = **0.865 ×** wordmark height, gap = **0.38 ×**,
optically centred. The favicon now uses the board's app-icon treatment — the mark held in a rounded
square, because a bare dark mark disappears against a dark browser tab strip.

## 5. Sign-in — REBUILT

**Copy removed.** "Authentication is handled by the platform identity realm" is gone and was **not**
replaced. No "Welcome back", no "Access your workspace". The page now says only what a person needs
to act on: the identity, "Sign in", two labels, one button. It was not merely user-hostile — it
described the architecture on a page reachable without authenticating.

A Playwright test now fails the build if any of eight implementation or marketing phrases reappear.

**Composition.** The card is gone. The identity sits at the optical centre with the form beneath it
on the same axis, separated by a hairline rather than boxed — Bible V4 §1.A puts hierarchy in
alignment and space, and a border here would carry no meaning. Column held to 340px. Plain canvas:
no gradient, no illustration, no hero panel.

**Error presentation.** A failed password is an ordinary event, not a system fault, so it is an
inline line rather than a full error panel — still `role="alert"`, still the uniform message that
avoids an account-enumeration oracle.

**Functionality untouched:** Supabase auth, session handling, membership resolution, redirects,
tenant isolation. Verified across empty submission, invalid credentials, valid credentials, loading
state, redirect, both themes.

## 6. Architecture — PRESERVED

| Check | Result |
|---|---|
| Shell remains capability-neutral | **PASS** |
| No hard-coded capability route map | **PASS** — icons declared via the contribution contract |
| No Prisma import in UI | **PASS** |
| Platform does not import capability internals | **PASS** |
| No `factoryId`, no franchise terminology | **PASS** — conformance suite asserts it |
| No client-specific navigation or components | **PASS** |
| Tenant isolation / authorization untouched | **PASS** |

Icons are declared **by the capability** as `icon?: string` on `NavigationContribution` — a plain
string rather than the UI layer's union, because `src/server/` must not import `src/components/`.
The shell narrows it and falls back, so a typo costs a glyph rather than a render.

## 7. Accessibility

Contrast is **measured, not asserted**: a Playwright test walks every text-bearing element on a real
page in both themes, computes the true composited background, and fails under AA. **Zero failures.**

Landmarks, skip link, `aria-current`, `aria-expanded`, Escape closes the sheet, `aria-live` on
organization switch, labelled controls, reduced-motion, state by glyph and text. The mark and
wordmark are `aria-hidden` with an `sr-only` name, so the logo announces once as "Verity" rather
than as decorative noise.

## 8. Responsive

Playwright asserts across desktop and Pixel 7: navigation restructures rather than shrinks, records
stack instead of scrolling sideways, no horizontal overflow, touch targets ≥44px. Sign-in is one
column that needs no second layout at 390px.

## 9. Tests

| Gate | Before | After |
|---|---|---|
| Vitest | 274 / 274 (19 files) | **278 / 278 (20 files)** |
| Playwright | 46 passed, 12 skipped | **54 passed, 12 skipped** |
| Typecheck | clean | clean |
| ESLint | clean | clean |
| Production build | clean | clean |

New: `src/test/proxy.test.ts` (4) — the response contract. `e2e/brand.spec.ts` grew to 10 per
project — mark geometry, wordmark-as-artwork, sign-in vocabulary, sign-in identity, gold primary
button, enumeration-oracle check.

**Browser inspection, both themes, console clean:** sign-in, overview, locations, scheduling, audit,
organization switch, theme toggle, sign-out, sign-in failure, sign-in success.

## 10. Tooling defect worth recording

`max-w-[340px]` and `justify-items-center` silently failed to generate against a stale Tailwind v4
dev cache — computed styles read `max-width: none` while the source was correct, and the page
rendered full-bleed. Cleared by removing `.next` and restarting. Recorded because the failure mode
is "the CSS you wrote does not exist", and it is indistinguishable from a markup error unless
computed values are checked.

## 11. Remaining limitations

| Item | Class | Note |
|---|---|---|
| Wordmark is a raster mask, not a vector | **NON_BLOCKING** | pixel-exact and recolours; a vector needs the original outlines, which were not supplied |
| Global search | **DEFERRED** | blocked on a search API, not on design |
| Worker / operations / external shells | **DEFERRED** | contracts exist and route; §27 defers the applications |
| Board's density toggle | **DEFERRED** | no capability needs it yet |
| Per-user accent picker | **DEFERRED** | tokens already derived; a preference store away |
| `.eslintrc.json` is dead config | **NON_BLOCKING** | flat config wins; will mislead whoever edits it |
| Failed sign-ins not recorded | **DECISION_REQUIRED** | pre-authentication has no tenant; needs a platform-level security log |
| Job runner, storage driver, secret rotation | **NON_BLOCKING** | unchanged from `platform-readiness-audit.md` §14 |

## 12. Product boundary

- **NO CLIENT SYSTEM.** No client-specific schema, route, workflow or branding.
- **NO INDUSTRY PACK.** No facilities, security, staffing, CRM or commerce.
- **NO INVENTED DATA.** The board's inventory, products and workforce were read for visual language
  and left there. The two zeros on the overview are real zeros.
- **NO FAKE CONTROLS.** The search box the board shows is not drawn, because nothing would answer it.

---

## VERDICT

# VISUAL REBUILD: PASS · RUNTIME: FIXED

The mark is now the approved artwork verified to 0.47% against the supplied asset rather than the
placeholder from the design source. The wordmark is the real logotype rather than a font
substitution. Sign-in no longer narrates the architecture to anyone who loads the URL.

The runtime error was root-caused to a genuine missing failure path at the one boundary that must
produce a `Response`, reproduced in a test before being fixed, and closed at the contract rather
than suppressed.

**Not claimed:** that this is finished design work. Two things are known-imperfect and recorded
above — the wordmark is a raster mask because vector outlines were never supplied, and the shell's
denser surfaces (tables, detail pages, forms) received token-level correction rather than the
composition-level attention the sign-in page got. They are honest gaps, not oversights.

**Client development remains NOT ALLOWED** — unchanged, by instruction.
