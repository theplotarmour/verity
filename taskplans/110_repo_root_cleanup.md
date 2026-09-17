# Task 110 — Repository root cleanup (file organization)

Authority: User synthesis, 2026-09-17 ("clean all fake tenants" session
continuation) — corroborated independently by `taskplans/97_deep_codebase_
cleanup.md` Finding 4, which had already identified the same set of
"genuinely loose" root files (HQ_*, `Naksh_Trial_Friction_Points.md`,
`PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md`, the four `Verity_*.md` files) and
explicitly distinguished them from the load-bearing vertical-reference docs
(`plywood.md`/`KentsRestaurant.md`/`clinic.md`/`salon.md`/`coaching.md`).

## Status: BUILT 2026-09-17

## What this closes

`taskplans/97`'s Finding 4 was never acted on (its own status noted the
loose-file cleanup as blocked pending a decision on where things should go).
This task makes that decision and executes it.

## What moved

All via `git mv` (history preserved), verified against `CLAUDE.md`'s exact
citations before moving — nothing `CLAUDE.md` itself references by path was
touched (checked directly, not assumed: grepped `CLAUDE.md` for each
filename before moving it).

**Vertical reference PRDs** → `docs/reference/verticals/`:
`clinic.md`, `coaching.md`, `KentsRestaurant.md`, `plywood.md`, `salon.md`.
`.claude/skills/verity-client-capability-builder/SKILL.md`'s step 6 citation
updated in the same change to the new paths.

**Reference PRD trees** (moved whole, not flattened):
`erpclaw-prd/` → `docs/reference/erpclaw-prd/`,
`odoo-prd/` → `docs/reference/odoo-prd/`.

**Business collateral** → `business/pitch-decks/`:
`Pitch Decks/*.pptx` (3 files — CA Firm, Colonel's Kebabz, Kents Verity).

**Archived** (moved, not deleted — dated subfolders under `docs/archive/`,
pre-V2, not cited by `CLAUDE.md`'s authority order, superseded in substance
by later docs where a successor exists):
- `docs/archive/2026-08-hq/` — `HQ_Issues_And_Findings.md`,
  `HQ_User_Guide.md`, `HQ_UX_Redesign.md`, `HQaudit.md`
- `docs/archive/2026-08-plywood/` — `PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md`
  (superseded in substance by `taskplans/68`/`69`)
- `docs/archive/2026-08-experience-system/` — `Verity_Component_
  Specification.md`, `Verity_Motion_Architecture.md`, `Verity_Operator_
  Client_Mapping.md`, `Verity_Page_By_Page_Flow_Report.md` (superseded in
  substance by ADR-011/012 + the `impeccable` skill)
- `docs/archive/2026-08-misc/` — `Naksh_Trial_Friction_Points.md`
  (reference-checked first: only cited by `taskplans/97` itself, which is
  a historical record and doesn't need a live path)

**Deleted**: `37456f41-0206-4857-8455-926170724862.png` (767 KB, anonymous
UUID filename, tracked in git, zero references found anywhere in `.md`/`.ts`/
`.tsx` content).

## What was explicitly left alone, and why

- `taskplans/` — flat by explicit project design (`CLAUDE.md`: "Canonical V2
  documents are currently maintained as single-file master documents under
  `taskplans/`. Do not assume a directory-based corpus exists."). This task
  does not create subdirectories there or delete any taskplan — the
  existing supersede-in-place + `00_STATUS_INDEX.md` convention is this
  repo's cleanup mechanism for that directory (ADR-009: supersede, never
  erase).
- `verity-bible/`, `verity-spec/`, `implementation/` — tier 1-3 authority,
  cited by exact path in `CLAUDE.md`'s Authority order.
- `design/`, `verity-app-ui-mockups/` — cited by exact path in `CLAUDE.md`
  (ADR-011/012's swatch and "identity authority" references). Moving either
  would require editing those citations in the same change; out of scope.
- `audit/` — already dated-subdirectory structured; one loose root
  `FINDINGS.md` left as-is rather than risk breaking the many relative
  cross-references audit docs make to each other.
- `docs/enterprise-research/`, `docs/enterprise-strategy/`,
  `docs/superpowers/`, `clients/colonel-kebabz/`, `clients/pa-oms/` —
  already correctly organized; `docs/reference/` follows the same spirit.
- `pacreds.txt` — already gitignored (never committed), but plaintext and
  credentials-shaped. Not moved anywhere in the repo — flagged to the
  product owner directly to relocate to a password manager / secrets store
  themselves. Contents never read by this session.
- Build/generated artifacts (`.next/`, `node_modules/`, `test-results/`,
  `graphify-out/`, `tsconfig.tsbuildinfo`) — not a git-tracked hygiene
  issue, left alone.

## Verification

- `git status --short` after all moves: only the intended renames (`R`),
  one deletion (`D`), one modified skill file — no untracked leftovers.
- `npx tsc --noEmit -p tsconfig.json`: clean, confirming no `src/` import
  or relative path referenced any moved `.md`/asset.

## Non-goals

- Does not touch `taskplans/*.md` structurally or by deletion.
- Does not move `design/` or `verity-app-ui-mockups/`.
- Does not permanently delete the archived docs — archiving preserves them
  for reference; a future task can revisit deletion once nobody's needed to
  check the archive for a while.
- Does not act on `pacreds.txt` beyond flagging it.
