# Phase 1 — Design Reconciliation Audit

**Date:** 2026-08-26
**Nature:** **AUDIT ONLY.** No token, component, stylesheet or asset has been modified.
**Method:** existing implementation compared against `design/verity asthetics.png` (brand identity
sheet), `design/light theme.webp` and `design/dark theme.webp` (product boards), `design/logo.png`.
**Governing rule:** change only what the evidence shows is inconsistent. Do not rebuild what is
already correct.

---

## 1. Headline

> The implementation is **substantially aligned** with the Verity boards. Phase 1 is
> reconciliation, not reconstruction.

Of nineteen audited properties: **eleven already match**, **three need reconciliation to the brand
sheet**, **four are genuine gaps**, and **one is blocked on a product-owner decision**.

The single largest piece of real work is **scroll and shell architecture** (§5), which is a
structural gap rather than a styling one. The second is **deliberate dark-theme authoring** (§4).
Neither requires discarding existing work.

---

## 2. What already matches — do not touch

| # | Property | Evidence in implementation | Board requirement |
|---|---|---|---|
| 1 | **Typeface — Inter** | `--font-inter` in `globals.css`; `@fontsource/inter` installed | Brand sheet: Inter Thin / Light / Regular / Medium |
| 2 | **Dual theme infrastructure** | 48 `light-dark()` declarations, all centralized in `globals.css`; `data-theme` stamped server-side; `color-scheme` set per theme | Both themes first-class (D7) |
| 3 | **No theme flash** | Server stamps `data-theme` from cookie; no client script, no unstyled frame | — |
| 4 | **Theme toggle present** | `src/components/shell/ThemeToggle.tsx`, in desktop top bar and mobile bar | Must remain (D7) |
| 5 | **Glass is a bounded material system** | Exactly four classes — `.glass-shell`, `.glass-card`, `.glass-control`, `.glass-overlay`. Blur applied on those four surface kinds only, never per row or per badge | D6: controlled/elevated, not indiscriminate |
| 6 | **Blur capped and paired** | Background, blur and inner highlight travel together as one class; two blur values only (`26px`, `30px`) | ADR-011 constraint 2 |
| 7 | **Reduced transparency honoured** | `@media (prefers-reduced-transparency: reduce)` makes every surface opaque, drops all blur, hides the atmosphere. Borders and shadows carry hierarchy in that mode | ADR-011 constraint 5 |
| 8 | **Reduced motion honoured** | `@media (prefers-reduced-motion: reduce)` clamps animation, transition and scroll behaviour | ADR-011 constraint 5 |
| 9 | **Atmospheric gradients** | `.verity-atmosphere` — three accent-derived radial fields, `position: fixed`, `z-index: -1`, `pointer-events: none` | D4: subtle atmospheric/background gradients |
| 10 | **Semantic colour independent of accent** | `--color-success/warning/danger/info` plus six `--color-state-*`, all defined independently of `--accent-seed` | D4; boards show green/amber/red status |
| 11 | **Accent architecture connected** | `--accent-seed` → 50–900 `color-mix` ladder → computed AA fill/ink → components, controls, focus rings, `::selection`, `accent-color`, `caret-color` | D10: one connected system |

**Assessment:** points 5–9 mean the glass system is **already close to the formalization Phase 1
asks for**. It is bounded, documented in-file, capped, and degrades correctly. The work is to
verify placement against the boards and write it down as a matrix — not to rebuild it.

---

## 3. Needs reconciliation to the brand sheet

### 3.1 Neutral palette — three values differ

| Role | Brand sheet | Implementation | Delta |
|---|---|---|---|
| Darkest / dark canvas | `#0F1115` | `#0d0d0f` | slightly darker, slightly cooler |
| Dark surface | `#1C1F24` | `#1c1c1e` | less blue |
| Dark elevated | `#2A2E33` | `#242427` | noticeably darker, less blue |
| Light border | `#E6E8EB` | `#ececee` | lighter |
| Light canvas | `#F7F8FA` | `#f4f4f5` | darker, less blue |

The implementation's neutrals are near-achromatic; the brand sheet's carry a slight blue cast.
Small but systematic. **Recommendation:** adopt the brand sheet values as canonical and re-derive,
adjusting any value that fails AA and recording it — as `--color-text-tertiary` already was when
the board's `#7A7A7F` measured 3.9:1. Raised as **QD-1**; not applied.

### 3.2 Accent default — BLOCKED on QB-1

Implementation `--accent-seed: #d4a017` (Warm Sand Gold). Brand sheet labels **`#00D1B2`** as
**Primary**; both boards render in it. `CLAUDE.md` forbids replacing gold with teal.

**This is the one Phase 1 decision that cannot proceed.** Every token below the seed derives from
it, so the ladder, the computed fill/ink pair, the atmosphere gradients and the contrast sweep all
depend on the answer. **No change made. Awaiting QB-1.**

### 3.3 Semantic success versus a teal accent — QB-2

Current success is `#3f7d53` / `#6fbe86`. If the accent becomes `#00D1B2`, accent-tinted surfaces
and success status move close together in hue — the collision D4's independence rule exists to
prevent. The boards show teal accent and green "In stock" in the same table, so the reference
itself sits near this line.

**Not resolved here.** Requires QB-2.

---

## 4. Genuine gaps

### 4.1 Dark theme is derived, not authored — D8

Dark values exist for every token, but they are *paired* values inside `light-dark()` rather than a
separately designed theme. Several read as tonal counterparts rather than design decisions.

The boards prove the intended standard: the world map is **re-rendered** for dark rather than
filtered; the accent **brightens** rather than flipping; glass on the Reorders panel is composed
differently against a dark ground.

**Work:** author dark deliberately across background · surfaces · glass · borders · text hierarchy
· accent · semantic · controls · tables · charts · navigation · overlays, and record each decision.
**Not an inversion.** The `light-dark()` structure is the right vehicle and is retained.

### 4.2 Desktop top bar is not persistent

`ShellChrome` marks the **mobile** bar `sticky top-0 z-30`. The **desktop** bar (`h-[84px]`) has no
sticky or fixed positioning, and the page body scrolls — so search, organization switcher, theme
toggle, activity and avatar scroll out of view. The boards draw that bar as persistent chrome.

Follows directly from §5 and is fixed by the same change.

### 4.3 Board composition not yet applied to capability pages

The boards' composition — stat-card row, wide panel, filter bar, paginated dense table — is the
template. Current pages use `PageHeader` + `StatRow` + `DataTable`, which is the same skeleton at
lower fidelity.

**Explicitly recorded:** the boards' *Inventory* domain is a **composition reference only**. No
Inventory module, no products, suppliers, warehouses, SKUs or stock. Verity has no such capability
and must not gain one from a picture. Raised as **QD-2**.

### 4.4 Global search promises less than the board shows

The board's top-bar search reads as platform-wide. The implementation is honest — placeholder
"Search this page", scoped to loaded records, with an in-file note that platform search is deferred
and "drawing a box that promises one would be a control that lies".

**Correct as built.** Recorded so it is not mistaken for a defect. Remains deferred (QX-5).

---

## 5. Scroll and shell architecture — the largest structural gap

**Current structure:**

```tsx
<div className="min-h-dvh lg:grid" style={{ gridTemplateColumns: "234px 1fr" }}>
  <aside className="glass-shell hidden flex-col … lg:flex"> lockup · nav · account </aside>
  <div className="flex min-w-0 flex-col"> mobileBar · topBar · <main> </div>
</div>
```

`min-h-dvh` lets the grid grow with content, so **the document body scrolls as one page**. Three
consequences, each contradicting a decision:

| Decision | Current behaviour | Verdict |
|---|---|---|
| **D11** — not one giant scrolling page | The whole application scrolls as a single document | **GAP** |
| **D12** — sidebar navigation scrolls only when it must | The `<aside>` has no inner scroll container. A long nav grows the aside, grows the grid, and scrolls the **whole page** — carrying the lockup off-screen. The account card uses `mt-auto`, which stops working once the column exceeds the viewport | **GAP** |
| **D13** — dense regions scroll internally | `<main>` flows; tables extend the page rather than scrolling in place | **GAP** |

The board's own evidence for the target: the table is **paginated** — "Showing 1 to 4 of 128 items",
pages 1 · 2 · 3 · … · 32 — and the sidebar shows **no scrollbar** because nine items fit.

**Required shape** (design, not yet implemented):

```
h-dvh, overflow-hidden                      ← shell owns the viewport
├── aside  h-full, flex column
│     ├── lockup            shrink-0        ← never scrolls
│     ├── nav               min-h-0, overflow-y-auto   ← scrolls ONLY when needed
│     └── account card      shrink-0        ← pinned, never scrolls
└── main column  min-w-0, flex column
      ├── top bar           shrink-0        ← persistent chrome
      └── page region       min-h-0, overflow-y-auto   ← per-page scroll ownership
```

`min-h-0` is the load-bearing detail: a flex child defaults to `min-height: auto` and refuses to
shrink below its content, which is precisely why an `overflow-y-auto` region silently fails to
scroll and pushes the page instead.

**Not blindly fixed-height.** D13 says scroll ownership is determined per page and recorded — a
short settings form should not sit in a scroll container that never scrolls.

**Test matrix required:** 1440 · 1024 · 390px, plus short viewport height, plus large and small
navigation sets, plus permission-filtered navigation (which changes item count at runtime).

---

## 6. Glass placement matrix — observed, to be ratified in ADR-012

Where glass is used today, checked against D6:

| Surface | Class | Appropriate? |
|---|---|---|
| Sidebar shell | `.glass-shell` | **Yes** — level 1, quiet, recedes |
| Mobile top bar | `.glass-shell` | **Yes** |
| Mobile nav sheet | `.glass-overlay` | **Yes** — temporary contextual layer |
| Scrim behind sheet | `.verity-scrim` | **Yes** — not glass; a scrim |
| Search input | `.glass-control` | **Yes** — floating control |
| Activity/bell button | `.glass-control` | **Yes** |
| Cards and panels | `.glass-card` | **Verify per surface** — must not reach dense tables |
| Table rows | none | **Correct** — dense content stays solid |
| Form fields | to verify in `primitives.tsx` (8 references) | **Verify** |

**No decorative default usage was found.** The four classes are applied to shell, card, control and
overlay — the exact four kinds ADR-011 constraint 2 permits. The outstanding work is to verify each
`.glass-card` call site against the "non-dense" rule and write the matrix into ADR-012.

**Recommendation:** retain all four tokens under their current names. They are accurate, bounded
and already documented in-file. Nothing here justifies renaming or consolidation.

---

## 7. Work items for Phase 1 execution — none started

| # | Item | Blocked by |
|---|---|---|
| 1 | Write ADR-012 (reference hierarchy, F1–F4, glass matrix, scroll architecture, dark mandate) | QB-1, QB-2, QD-1 |
| 2 | Set accent default | **QB-1** |
| 3 | Retune semantic success against the accent | **QB-2** |
| 4 | Reconcile neutrals to brand sheet | **QD-1** |
| 5 | Author dark theme deliberately, token by token | items 2–4 |
| 6 | Rebuild shell to fixed-viewport with contained scrolling | none — **ready to start** |
| 7 | Make desktop top bar persistent | folded into 6 |
| 8 | Sidebar nav inner scroll with stable header and footer | folded into 6 |
| 9 | Per-page scroll ownership, recorded | after 6 |
| 10 | Verify `.glass-card` call sites against the non-dense rule | none — **ready to start** |
| 11 | Re-run composited AA sweep | after 2–5 |
| 12 | Screenshot every route at 1440 / 1024 / 390, both themes, compare to boards | after 5–9 |
| 13 | Update `CLAUDE.md` accent anti-regression line | **QB-1** |

**Items 6–10 are unblocked.** Everything touching colour waits on QB-1, QB-2 and QD-1, because the
accent seed is the root of the token graph and re-deriving it twice would waste the contrast sweep.

---

## 8. Remaining design questions

- **QB-1** — accent default `#00D1B2` or `#D4A017`? Contradicts a written `CLAUDE.md` rule. **Blocking.**
- **QB-2** — does a teal accent collide with semantic success green? **Blocking for token work.**
- **QD-1** — adopt brand-sheet neutrals as canonical? Recommended yes.
- **QD-2** — confirm the boards' Inventory screen is composition-only, with no Inventory module implied.
- **QD-3** — density: ship comfortable only, or restore the comfortable/compact toggle?

---

## 9. Conclusion

Nothing was rebuilt, because most of it did not need rebuilding. Inter, the dual-theme
infrastructure, the theme toggle, the bounded glass system, the accessibility fallbacks, the
atmospheric gradients, the independent semantic scales and the connected accent architecture are
all **already correct** and are retained unchanged.

The real Phase 1 work is narrower and more specific than Revision 2 implied: **shell and scroll
architecture**, **deliberate dark authoring**, **three palette reconciliations**, and **one blocked
accent decision**.

**No changes have been made. Phase 1 execution has not begun.**
