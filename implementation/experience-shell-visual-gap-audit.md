# Experience Shell — Visual Gap Audit

**Date:** 2026-08-24
**Phase:** 0 — inspection before modification
**Question:** why did the previous pass diverge from the supplied board?

This is the diagnosis. Corrections and results are in `experience-shell-visual-audit.md`.

---

## Summary of cause

The previous pass took its values from the **design source HTML** in
`verity-app-ui-mockups/project/`, which is accurate for palette, spacing and rhythm — and it
got those right. What it did **not** have was the logo artwork. The design source draws the mark
as a placeholder:

```html
<polygon points="4.5,3 19.5,3 12,11.2"/>
<polygon points="12,12.8 19.5,21 4.5,21"/>
```

Two mitred triangles with a straight gap. The approved mark, supplied afterwards as
`public/37456f41-…png` and on the identity sheet, is a different shape: the corners carry a real
radius and the facing apexes are **cut by a circle**. The previous pass reproduced the placeholder
faithfully and called it the identity.

The same error repeated on the wordmark. "verity" is set in a geometric face; the previous pass
rendered it as Inter Light in a `<span>`, which is a font substitution for a logotype.

Everything else below is smaller, but the logo is the one that makes the interface fail the
"same product?" test at a glance.

---

## 1. Brand — the load-bearing gap

| Element | Previous | Board | Severity |
|---|---|---|---|
| Symbol geometry | mitred triangles, straight gap | rounded corners (r = 2.0), circular pinch | **CRITICAL** |
| Symbol aspect | 1.0 (square 24×24 viewBox) | **0.6922** — noticeably tall | **CRITICAL** |
| Wordmark | Inter Light `<span>` | geometric logotype artwork | **CRITICAL** |
| Lockup proportion | ad-hoc, symbol = wordmark size | symbol = 0.865 × wordmark, gap = 0.38 × | HIGH |
| Favicon | placeholder triangles | mark in the app-icon square | MEDIUM |

The aspect ratio alone is disqualifying: a square mark and a 0.69 mark are different logos.

## 2. Typography

| Property | Previous | Board |
|---|---|---|
| Family | **Times** (see below) | Inter |
| Heading weight | `font-semibold` (600) | Light (300) |
| Loaded weights | 200–500 | 100–600 per the board's ladder |

The **Times** finding was real and shipped: `--font-inter` was declared on `<body>` while Tailwind
v4 resolves theme variables against `:root`, and Tailwind tree-shook the unreferenced `--font-sans`.
The stack collapsed silently. It was fixed mid-pass and is now asserted in `e2e/brand.spec.ts`;
recorded here because it is the clearest example of why this audit could not be done from
screenshots.

`font-semibold` requested a 600 that was never loaded, so the browser synthesised it — headings were
neither the board's Light nor a real Semibold.

## 3. Colour and accent

Largely correct. The previous pass derived the board's **tonal accent scale** rather than using flat
`#D4A017`, which is right and non-obvious — `#D4A017` reaches only 2.16:1 on the light canvas.

| Property | Status |
|---|---|
| Gold tonal scale, per-theme step | **Correct** |
| Accent ink darkened to clear AA | **Correct** (5.2:1) |
| Dark ink on gold fills, never white | **Correct** (7.3:1) |
| Gold reserved for active/selected | **Correct** |
| Active-nav bed too pale (gold-50) | Minor — corrected to the board's 10% composite |

## 4. Surfaces, borders, radius

Correct and traceable. The board's translucent chrome (`--g1`..`--g4`, `blur(30px)`) was composited
to solid colours because Bible V4 §1.B `[FACT]` forbids persistent glass. That resolution stands —
the Bible outranks the board, and the flattened values preserve the appearance.

Radii (6/9/10/12/16), hairline borders and low-spread shadows all match.

## 5. Navigation and header

| Property | Status |
|---|---|
| Icon-led, 33px rows, 10px radius | **Correct** |
| Gold only for the active item | **Correct** |
| Collapse control | **Correct** |
| Contribution-driven, no route map | **Correct** — architecture preserved |
| Header restraint | **Correct** — no fake search shipped |

Navigation was not a gap. The architecture built earlier held.

## 6. Sign-in — second-worst surface after the logo

| Problem | Severity |
|---|---|
| "Authentication is handled by the platform identity realm." | **HIGH** |
| Form boxed in a card floating in an empty viewport | HIGH |
| Wordmark rendered as Inter | CRITICAL (see §1) |

The copy is the more serious of the two. It describes the platform's internals to someone who only
wants to start work, and it does so on a page reachable **without authenticating** — so it also
narrates architecture to anyone who loads the URL.

## 7. Runtime — found while inspecting, not visual

`src/proxy.ts` is the only code in the platform that must produce a `Response`; there are no route
handlers. It had **no failure path**:

```ts
await supabase.auth.getUser();   // throws → the promise rejects → no Response
return response;
```

Any transient failure of the auth provider, or a missing env var at boot, leaves Next with a
rejected promise where a Response belongs — reported exactly as
`Uncaught (in promise) TypeError: Failed to convert value to 'Response'`, taking down **every**
route including `/sign-in`. Root cause confirmed by a failing test before any fix.

## 8. Security — found while inspecting

The dev server logged credentials in plaintext:

```
└─ ƒ signInWithPassword("nobody@example.com", "wrongpassword123") in 537ms
```

Next.js logs server-action arguments. The positional `(email, password)` signature put every
password into the server log.

## 9. Tooling — why the visual gap was invisible

`max-w-[340px]`, `justify-items-center` and other arbitrary utilities silently failed to generate
while the dev server's Tailwind cache was stale; computed styles read `max-width: none`. The page
rendered full-bleed while the source looked correct. Any visual review conducted without checking
computed values would have mis-attributed this to the markup.

---

## What was NOT a gap

Recorded so the next pass does not "fix" them:

- **Solid chrome instead of the board's blur** — Bible V4 §1.B, deliberate.
- **Accent ink darker than the board's** — the board's own value fails AA at 2.72:1.
- **No ⌘K search** — platform search is `DEFERRED`; there is no API behind it.
- **Content at 14px while chrome follows the board's ~12.5px** — Bible V4 §1.A, density is
  context-sensitive.
- **Capability-driven navigation** — working architecture, preserved.
