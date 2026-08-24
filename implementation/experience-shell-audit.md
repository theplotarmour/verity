> **SUPERSEDED — 2026-08-24.** Records **46 Playwright passed** and describes the shell's accent as gold `#D4A017` sourced from an identity board. The suite now stands at **60 Playwright / 285 Vitest**. Its composition findings still hold; its metrics do not.
>
> Current canonical readiness artifact: [`final-platform-readiness.md`](final-platform-readiness.md).
> Retained as historical evidence; not rewritten.

# Verity Experience Shell Audit

**Date:** 2026-08-24
**Baseline:** `bb42e61` (foundation verified intact — see `recovery-audit.md`)
**Scope:** the platform experience shell and visual identity. No client, industry pack or
vertical capability was started.

---

## 1. Visual Authority — PASS

Every visual decision traces to `verity-app-ui-mockups/`. Four boards were read in full, plus the
design source, which is where the exact values live.

| Source | What it settled |
|---|---|
| `uploads/pasted-1787320484268-0.png` | The **ratified** identity board — logo construction, wordmark, lockup variants, 9-swatch palette, Inter weight ladder, icon style, favicon |
| `uploads/pasted-1787320495682-0.png` | Exploration of six palettes (A–F). Establishes that gold is option **E, "Warm Sand / Gold"** — one of six candidates, not an accident |
| `uploads/pasted-1787320502040-0.png` | Full application layout: rail, header, collapse control, theme tri-state, mobile screens |
| `uploads/pasted-1787320604475-0.png` | The definitive gold application render. Custom Color reads **`#D4A017`** |
| `project/Verity App.dc.html` | The design **source**: exact tokens, geometry, sizing, and the accent derivation algorithm |

**Board 2 and board 3 render the app in teal, board 1 and board 4 in gold.** Resolved rather than
guessed: board 1 is the document titled *"VERITY BRAND IDENTITY"* and names gold as Primary, board
4's colour picker holds `#D4A017`, and the brief states gold independently. Teal is one entry in the
board's own ten-accent list, not a competing identity.

**Domain deliberately not taken.** The boards demo inventory, workforce, clients and an
"Acme Facilities Pvt. Ltd." tenant. None of it was implemented. The navigation is exactly the
platform's real capabilities, sourced from the registry.

## 2. Brand Implementation — PASS

**Mark.** Lifted verbatim from the design source, not redrawn:

```
<polygon points="4.5,3 19.5,3 12,11.2" />
<polygon points="12,12.8 19.5,21 4.5,21" />
```

Two opposing triangles on 24×24 with a 1.6-unit gap. The gap is the mark — closed up it reads as a
bowtie. Asserted in `e2e/brand.spec.ts` so a "tidy-up" cannot quietly reshape it. Variants: symbol,
wordmark, lockup, collapsed lockup, plus `app/icon.svg` for tab and app icon.

**The lockup is not all gold.** Symbol gold, wordmark in text colour, per the board's primary
lockup. Rendering the whole thing gold is the most common misuse of this identity.

**Colour — the accent is a derived scale, not a hex.** This is the single most important finding of
the brand pass. The design source computes ten tonal steps from `#D4A017` and selects a *different*
step per theme. That is not decoration; `#D4A017` reaches **2.16:1** on the light canvas and cannot
serve as a single value.

| Role | Light | Dark | Why |
|---|---|---|---|
| `--color-accent` (fills, indicators) | `#bc8e16` (600) | `#e6c878` (300) | board's own selection |
| `--color-accent-ink` (accent **text**) | `#806214` (800) | `#e6c878` | **5.2:1** — see §11 |
| `--color-accent-on` (text on gold) | `#191a1c` | `#191a1c` | **7.3:1**; white is 2.4:1 |

**Typography.** Inter 200/300/400/500 and IBM Plex Mono 400, self-hosted via `next/font`. Headings
are **Light (300)**, per the board — hierarchy from size, tracking and space, never weight.

**One accent, enforced.** The board states the law directly: *"One accent drives interaction,
selection and state. Neutrals and semantic colours never change."* Gold marks what is actionable,
selected or live. `StateCategory.Active` was moved **off** the accent bed onto the info bed, because
gold already means "this is where you are" and one token cannot carry both meanings.

## 3. Shell Architecture — PASS

`CAPABILITY → CONTRIBUTION → SHELL`, unchanged and reinforced.

Rail (collapsible, persisted), header (organization, theme, activity, account), mobile sheet.
Geometry follows the board: 33px nav rows, 10px radii, 56px header, 26px avatar, 29px controls.

**No route map was introduced.** Icons are declared *by the capability* through a new
`icon?: string` on `NavigationContribution`. It is a plain string rather than the UI layer's
`IconName` union because `src/server/` must not import `src/components/` — inverting that to satisfy
a type would put the design system upstream of the platform. The shell narrows it with `isIconName()`
and falls back, so a typo costs a glyph rather than a render.

## 4. Components — PASS

**New:** `brand/VerityMark` (symbol/wordmark/lockup), `ui/icons` (closed 23-glyph set, 1.4 stroke,
board path data), `shell/ThemeToggle` (light/dark/system).

**Modified:** `ShellChrome` (rebuilt), `OrganizationSwitcher` (board-styled; single membership now
renders as a label, because a select with one option is a control that cannot do anything),
`primitives` (accent-on button ink, Light headings, Active state bed), `globals.css` (rewritten),
`DataTable`/`ScheduleGrid`/overview/workspace (accent → accent-ink).

**No duplicates created.** Every existing primitive was upgraded in place.

**Why the icon set is closed and platform-owned:** a capability picks an icon by *name* and never
ships SVG. The platform stays ignorant of what a capability looks like; the design system stays the
only place a glyph can enter the rail.

## 5. Capability Integration — PASS

All five keep purpose-built experiences. Consistency comes from tokens, not from one layout.

| Capability | Experience | Forced into generic CRUD? |
|---|---|---|
| Location | table + detail with geofences | No |
| Asset | operational record + actions | No |
| Scheduling | **time grid** across resources | No |
| Evidence | read-only register | No |
| Approval | decision queue | No |

Asserted by the pre-existing test *"scheduling renders a time grid, not a row list"*, which still
passes.

## 6. Backend Integrity — PASS

Nothing in the command, query, tenancy, identity or authorization path was altered for visual
reasons. No page imports Prisma. Supabase auth, membership resolution, organization switching, RLS,
field stripping, audit and the capability registry are untouched. The organization switcher still
submits a *membership* id, re-verified server-side (PLA-TEN-006).

**One deliberate server change, and it is not cosmetic — see §12.**

## 7. Responsive Verification — PASS

Rail ≥1024px; below that a sheet with a scrim (the one translucency Bible V4 §1.B permits).
Playwright asserts across desktop and Pixel 7: navigation restructures rather than shrinks, records
stack instead of scrolling sideways, no horizontal overflow, touch targets ≥44px. Chrome controls
are 44px on coarse pointers and tighten to the board's 29px on desktop.

The rail collapse is not decoration — at 1024px it returns ~164px to content.

## 8. Accessibility — PASS

Landmarks, skip link, `aria-current`, `aria-expanded`, Escape closes the sheet, `aria-live` on
organization switch, labelled controls, reduced-motion, state by glyph **and** text.

**Contrast is asserted, not asserted-to.** `brand.spec.ts` walks every text-bearing element on a real
page in both themes, computes the true composited background, and fails on anything under AA.
Currently **zero** failures.

**One a11y defect found and fixed during the pass:** the logo link was labelled
`"Verity — go to overview"`, which collided with the *Overview* nav item — two links with confusable
names, and it broke a responsive test. Now simply `"Verity"`.

## 9. Visual Comparison — PASS

| Board | Implemented |
|---|---|
| Hourglass symbol, exact geometry | ✅ verbatim from source, test-locked |
| Lowercase Inter Light wordmark | ✅ 300, −0.02em |
| Warm gold accent, restrained | ✅ three roles, contrast-corrected |
| Warm white / near-black grounds | ✅ `#f4f4f5` / `#0d0d0f` |
| Thin borders, low elevation | ✅ flattened board values |
| Light heading weights | ✅ 300 |
| Designed dark mode | ✅ accent moves up the tonal scale |
| Thin line icons, one stroke weight | ✅ 1.4 throughout |
| Collapse control, theme tri-state | ✅ both persisted |

## 10. Tests

| Gate | Result |
|---|---|
| Vitest | **274 / 274**, 19 files — run **twice consecutively** |
| Playwright | **46 passed**, 12 skipped (was 34 — brand spec adds 12) |
| Typecheck | clean |
| ESLint | clean |
| Production build | clean, 15 routes |
| Impeccable design detector | `[]` — no findings |

New: `e2e/brand.spec.ts` — token values per theme, mark geometry, Inter actually loading, theme
persistence, AA contrast sweep in both themes.

## 11. Deviations from the board — each with a reason

**a. No `backdrop-filter` on rail or header. — BIBLE OVERRIDE**
The board renders persistent chrome with `blur(30px)` over translucent layers. Bible V4 §1.B is
`[FACT]` and forbids glassmorphic blur as the visual identity, permitting it only for *temporary*
contextual layers. The Bible outranks the boards.
Resolved without losing the look: every translucent layer was composited against its own base and
shipped as the resulting solid colour (`--g1`, white at 44% over `#F4F4F5`, is `#F9F9F9`). Visually
equivalent at rest, legible over any content, and it does not repaint a blurred backdrop per scroll
frame. Translucency survives exactly where the Bible names it — the mobile sheet and its scrim.

**b. Accent text is gold-800, not the board's gold-600. — ACCESSIBILITY**
The board's light-mode `--ac` measures **2.72:1** on the page, failing AA and even the 3.0 non-text
floor. Gold-800 is the lowest step that clears AA at 5.2:1. Fills keep the board's value; only *ink*
was darkened. The logotype keeps raw gold — WCAG exempts logos from contrast.

**c. Text on a gold fill is `#191a1c`, never white. —** white on gold is 2.4:1. This follows the
board's own contrast routine, which picks dark ink for a light accent.

**d. No ⌘K global search. — DATA REALITY**
Platform search is `DEFERRED` in `platform-readiness-audit.md` §14; no search API exists. A search
box that queries nothing is a control that lies about the platform, which §18's data-reality rule
forbids as squarely as a fake metric. It returns when there is something to query.

**e. Content stays at 14px; chrome follows the board's ~12.5px.** Navigation is glanced at; content
is read for hours. Bible V4 §1.A makes density context-sensitive.

**f. Body copy tertiary is `#6f6f74`, not the board's `#7A7A7F`** — the board value is 3.9:1.

**g. `data-theme` carries a resolved value; no `prefers-color-scheme` duplicate block.** The
pre-paint script resolves "system" before first paint, so the stylesheet needs one dark block rather
than two that can drift. Cost: no-JS users get light. Accepted — the app requires JS to sign in.

## 12. Defects found while verifying — all FIXED

These were **not** part of the brief. They were found because the work was verified rather than
assumed, and three are pre-existing platform issues.

**a. The whole UI was rendering in Times. — FIXED**
`--font-inter` was scoped to `<body>` while Tailwind v4 resolves theme variables against `:root`, and
Tailwind tree-shook the unreferenced `--font-sans`. The stack collapsed to a serif fallback and
looked plausible in a screenshot. Font variables moved to `<html>`; the stack is stated where it is
used; `brand.spec.ts` now asserts the first resolved family is Inter.

**b. `withTenant` inherited an undeclared 5-second transaction ceiling. — FIXED (pre-existing)**
`withTenant` is the single chokepoint for every tenant-scoped read and write, and used Prisma's
implicit default. Nobody chose 5s, nothing documented it, and it surfaces as
`Transaction already closed` rather than anything a caller can act on. A capability doing a handful
of writes over a remote database reaches it. Now explicit and env-tunable
(`VERITY_TX_TIMEOUT_MS`, default 15s), with the lock-holding trade-off documented at the constant.

**c. Two test teardowns could poison the database permanently. — FIXED (pre-existing)**
`command-runtime` and `foundation-acceptance` both dereferenced `actor.userId` *before* deleting
their fixed-id fixtures. `actor` is undefined whenever setup fails, so the first failure aborted
cleanup and left rows that made **every subsequent run** fail on a unique constraint — a suite that
could not recover without manual DB surgery. This is what turned one timeout into a persistent
"274 → 261" regression. Cleanup now runs fixed-name objects first, in FK-safe order, with the
actor-dependent delete guarded and last. Proven by two consecutive full-suite passes.

**d. Components requested font weights that were not loaded. — FIXED**
`font-semibold` (600) against a family loaded at 200–500: the browser silently synthesized it. All
weights now exist in the loaded set.

**e. `verity-app-ui-mockups/` was being linted. — FIXED** (in `recovery-audit.md`)

## 13. Remaining Gaps

| Gap | Class | Note |
|---|---|---|
| Global search UI | **DEFERRED** | blocked on a search API, not on design |
| Worker / operations / external shells | **DEFERRED** | contracts exist and are routable; §27 defers the applications |
| Board's density toggle (comfortable/compact) | **DEFERRED** | board ships it; no capability needs it yet |
| Per-user accent selection | **DEFERRED** | the board's ten-accent picker. Tokens are already derived, so this is a preference store away |
| `.eslintrc.json` is dead config | **NON_BLOCKING** | flat config wins; will mislead whoever edits it |
| Notification bell links to `/audit` | **NON_BLOCKING** | real destination, real data; a notification centre is a capability |
| Background job runner, storage driver, secret rotation | **NON_BLOCKING** | unchanged from `platform-readiness-audit.md` §14 |

## 14. Product boundary — verified

- **NO CLIENT SYSTEM BUILT.** No client-specific schema, route, workflow or branding.
- **NO INDUSTRY PACK BUILT.** No facilities, security, staffing, CRM or commerce.
- **NO DOMAIN DATA INVENTED.** The boards' inventory, products, suppliers and workforce were read
  for visual language and left there. Every figure on screen is queried; the two zeros on the
  overview are real zeros.
- Navigation contains exactly the five registered capabilities plus platform administration.

---

## VERDICT

# EXPERIENCE SHELL: READY

The approved identity is implemented from its own source rather than approximated, the shell stays
contribution-driven, capability experiences remain purpose-built, and both themes pass an automated
AA sweep. The foundation is untouched apart from one explicitly-documented transaction-budget fix
that removes a production footgun.

Where the boards and the Bible disagreed, the Bible won and the visual result was preserved by other
means. Where the boards were inaccessible, accessibility won and the deviation is recorded above.

**Client development remains NOT ALLOWED** — unchanged, by instruction.
