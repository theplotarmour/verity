# Phase 1 — Visual System Applied

**Date:** 2026-08-26
**Authorization:** product-owner instruction to apply the `design/` design language to the Verity
application. That instruction answers **QB-1** in favour of the brand sheet; **ADR-012** records the
decision before any token was edited, per work plan §5.1.
**Nature:** reconciliation, not reconstruction — as `phase-1-design-audit.md` predicted.

---

## 1. What changed

| Area | Change | Authority |
|---|---|---|
| Default accent | `#D4A017` → `#00D1B2`; preset list re-ordered, `Verity Mint` corrected from `#0FA894` to the brand-sheet value; gold retained as a preset | ADR-012 §1 |
| Accent fill / ink defaults | `--accent-fill-light` `#02B99E`, `--accent-fill-dark` `#6BE4D2`, both with `#191A1C` ink | computed by `accent.ts` |
| Neutrals | canvas `#F7F8FA` / `#0F1115`; text `#0F1115` / `#E6E8EB`; dark surface `#1C1F24`; dark elevated `#2A2E33`; sunken `#ECECEE` / `#131619` | ADR-012 §3 (QD-1) |
| Semantic success | `#3F7D53` / `#6FBE86` → `#2F7A3E` / `#7CC98A` | ADR-012 §4 (QB-2) |
| Semantic warning | `#9C7016` → `#8A6212` | pre-existing AA failure, 4.03:1 |
| Mark assets | `icon.svg` and `apple-icon.svg` mark fill `#D4A017` → `#0F1115` | brand sheet: mark is monochrome; ADR-012 §2 |
| Scroll architecture | Shell is fixed; `<main>` owns the only scroller; sidebar navigation region scrolls alone; desktop top bar is now persistent without `sticky` | work plan D11–D14, §5.6, §5.7; audit §4.2, §5 |
| Instructions | `CLAUDE.md` accent clause rewritten; "do not replace gold with teal" withdrawn; ADR-012 added to the decisions list; ADR-011 `Superseded By` set to partial | ADR-012 |

`src/server/platform/accent.ts` logic is **unchanged** apart from constants — the ladder, the
contrast walk and the preset mechanism all absorbed a hue change by editing one value, which is the
evidence the architecture was right.

## 2. Contrast, measured after the change

Computed with `accent.ts`'s own WCAG routine against the new grounds. Full table in ADR-012.
Every value clears AA for normal text: lowest is accent-as-text at **4.63:1**, then success light at
**4.97:1**. The previously failing warning now measures **5.15:1**.

## 3. Verification run

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run test` | **291 passed / 291**, 21 files, 0 skipped |
| `npx next build` | succeeds, 15 routes |
| `npm run build` | **blocked** — `prisma generate` cannot replace `query_engine-windows.dll.node` while a dev server holds it (`EPERM`). Not caused by this change; `next build` alone is green |
| Live visual review | **NOT DONE.** A `next dev` server (PID 29480, port 61139) was already running and stopped responding to requests during the pass. Screenshot comparison against the boards is outstanding |

## 4. What Phase 1 still owes

| # | Item | Source |
|---|---|---|
| 1 | **Live visual review** at 1440 / 1024 / 390 against `light theme.webp` and `dark theme.webp`, both themes, screenshots recorded | audit §7; Phase 1 acceptance |
| 2 | **Deliberate dark authoring** — dark values are correct tonal pairs but were not each designed per surface (D8) | audit §4.1 |
| 3 | **Sidebar overflow matrix** — the six-viewport test set, with a long navigation list | plan §5.7 |
| 4 | **Glass placement matrix** written down per surface | plan §5.3 |
| 5 | **Board composition** applied to capability pages — stat row, wide panel, filter bar, paginated dense table. `design/reference/verity-inventory.html` is the reimplementation of the boards and is the composition reference. Its *inventory domain is not to be built* (QD-2) | audit §4.3 |
| 6 | E2E suite re-run — `brand.spec.ts` expectations were updated to the new values but have not been executed (needs a server and a database) | — |

## 5. Deviation noted

`design/` previously also held the **Steep extraction** — `DESIGN.md`, `theme.css`, `variables.css`,
`tokens.json`: a peach/sienna palette on Signifier and Söhne, contradicting the brand sheet beside
it. Those files were removed from the working tree during this session and are not committed.
Nothing in `src/` ever read them. What remains in `design/` is Verity's own: the brand sheet, both
theme boards, the logo, and `reference/verity-inventory.html`.
