# Task 115 — Convert Verity's governing docs to an Apple-craft design system (brand identity intact)

Authority: User instruction, 2026-09-18, verbatim — "we are completely shifting to apple
design, dont focus on colors because we'll keep accent color changer later just focus on
cover all kinds of ux... make a detailed taskplan for updating bible spec or adrs in order
to convert verity into a completely apple design and dev team product, keeping brand
identity intact." Builds on `verity-spec/17_decisions/adr/adr-024.md` (material/accent/
motion foundation, ACCEPTED 2026-09-18) and the `apple-design` skill (WWDC "Designing Fluid
Interfaces" / "Principles of Great Design," loaded this session). Two new reference
screenshots (Home dashboard, light + dark) supplied this session are evidence for the UX
*patterns* below — explicitly NOT for the blue accent shown, per the user's own instruction.

## Status: Items 1 and 2 DONE 2026-09-18. **ADR-025** written and ACCEPTED (six named
component patterns; `StatTile`/`StatTileRow` built as the first live proof, commit
`0d28988`). **AMD-002** drafted, presented for confirmation, confirmed by the product owner,
and applied (`verity-bible/volume_4_experience_ux.md` §1.C "Motion & Interruptibility" +
one line under §1.A) — see `CLAUDE.md`'s Bible-amendment record. Items 3 (Spec REQ-IDs) and
4 (`verity-design-companion` sync) not started. The other five ADR-025 patterns (split
action, workspace-switcher card, chart tooltip, filter-chip rows, AI suggested-prompts) are
named and bound but not yet built — `StatTile` is proof-of-pattern only.

**Correction on §2's own drafted text**: reading Bible V4 §1.B directly (not assumed)
before drafting found it already permits exactly what ADR-024 does — "Translucent overlays
are permitted ONLY when showing temporary contextual layers... a quick-action drop-down" —
so ADR-024's chrome-glass reactivation was already Bible-compliant, not a violation needing
amendment. AMD-002 ended up narrower than this file originally proposed: no change to §1.B
at all, only the new §1.C (motion, genuinely absent before) and one added line under §1.A.

## What this taskplan is, precisely

ADR-024 answered three narrow questions: which surfaces are glass vs. solid, what the
default accent is, and what motion parameters to use. It did not answer the bigger question
this session's direction now raises: **what counts as "Apple craft" for every kind of UX
Verity has** — navigation, actions, data display, forms, empty states, AI surfaces — and
where that gets written down so it outranks ad hoc taste on the next page anyone builds.
That's this taskplan: which documents change, in what order, and what each one says.

## The constraint this taskplan operates inside — read first

`CLAUDE.md` states: *"The Bible is not editable. One amendment (AMD-001, `factoryId` →
`tenantId`) was authorised by the product owner as a one-time edit... Do not modify
`verity-bible/` again without a fresh explicit instruction."* This session's user message —
"make a detailed taskplan for updating bible spec or adrs" — is that fresh explicit
instruction, scoped to whatever this taskplan proposes and only after it's reviewed, not a
blanket license to rewrite the Bible freely. **Every Bible edit this taskplan proposes must
be presented as a specific, quoted diff and confirmed before being applied** — the same
discipline `verity-adr-gate` already enforces for ADR numbering, applied here to Bible
volumes. Spec and ADR documents don't carry this constraint — they're the "Active
Canonical Documents" this repo already edits routinely (ADR-024 itself is proof).

## Scope

### 1. A new ADR: the Apple Craft Standard (component-pattern layer, above ADR-024)

ADR-024 covers material/accent/motion. It does not cover *component patterns* — the
concrete, reusable UX shapes the new reference screenshots show that don't exist anywhere
in Verity's current component set. Propose **ADR-025** naming these as the platform's
canonical patterns, each with an authority citation the way every other concrete choice in
this repo requires:

- **Split primary action** (`Create +` with an attached dropdown chevron) — replaces a bare
  "+ Add X" button wherever a page currently offers exactly one creation path but could
  reasonably offer several (e.g. Outreach's "+ Add prospect" could become "Create ▾" with
  Prospect / Task / Meeting as the split's options, reusing commands that already exist per
  capability — no new commands, a navigation/composition change only).
- **Icon-chip stat tile with overflow control** — a circular icon-chip (accent-tinted per
  ADR-024's tint-only rule) + label + big number + delta-vs-prior-period, with a `⋮`
  overflow menu (reusing `OverflowMenu`, already built) per tile. Verity has `Stat`/`StatRow`
  in `primitives.tsx` today with none of this — this is a real new variant, not a reskin.
- **Workspace-switcher card** — a bordered card (not a bare dropdown trigger) above the
  identity card at the sidebar foot, showing the active tenant/org name + a "Switch
  workspace" affordance. `OrganizationSwitcher.tsx` exists; this is a presentation change to
  it, not new logic.
- **Chart card with a live tooltip** — hovering the chart shows both series' exact values at
  that point (the reference screens show this precisely: "25 Sep 2026 · Leads 176 ·
  Conversions 62"). `src/components/ui/charts.tsx` exists; confirm/extend its tooltip
  behavior against this pattern.
- **Filter-chip task rows** — All/High/Medium/Low count-chips above a task list, each row
  carrying an inline priority pill + a due-date column. Outreach's `TaskPanel` and
  `WorkQueuePanel` already have adjacent patterns (work-queue filter chips, per Task 114
  P0.1) — this generalizes that shape into a shared primitive rather than a one-off.
- **Quick-actions tile grid** — a 2×3 (or N×M) grid of icon+label tiles for a page's most
  common creation/logging actions, distinct from the split-action button (that's the single
  most likely action; this is the fuller menu of them). New primitive, no existing analog.
- **AI-assistant panel with full-width suggested-prompt rows** — `AgentChatDock` exists
  (glass-chrome per ADR-024) but has no "suggested prompts as tappable rows" pattern inside
  it yet; the reference screens show 4 full-width buttons ("Summarize this week's activity,"
  "Draft a follow-up email," etc.) above the input. Add this to `AgentChatDock`'s empty/idle
  state.

Each of these needs its authority line (`Authority: ADR-025 [pattern name]`) the moment it's
used anywhere, per `CLAUDE.md`'s existing "every concrete technology choice must cite its
authority" rule — this ADR is what makes that citation possible.

### 2. Bible amendment — UX Constitution volume only, proposed not applied

Bible V4 §1 ("UX Constitution") is cited repeatedly in this repo (`CLAUDE.md`'s Experience
System section references "Bible V4 §1.A whitespace-as-structure," ADR-023/024 both cite it
for what survives their material changes). Propose a narrow amendment — **AMD-002** — adding
a subsection under §1 naming Apple's eight design principles (Purpose, Agency,
Responsibility, Familiarity, Flexibility, Simplicity-not-minimalism, Craft, Delight — the
`apple-design` skill's own §16) as the platform's *interpretive lens* for applying §1's
existing rules, not a replacement of them. Concretely:
- §1.A (whitespace-as-structure) gains a cross-reference to "Simplicity — not minimalism":
  stripping to essence, not burying everything in one place.
- §1.B (material) gains a cross-reference to ADR-024's chrome/content split as the current
  binding interpretation (Bible volumes describe intent, ADRs bind the concrete rule — this
  repo's own existing pattern, unchanged).
- A new §1.F or similar: motion and interruptibility as a named UX Constitution concern for
  the first time — currently absent from the Bible entirely, which is *why* ADR-024 had to
  invent motion governance from nothing rather than cite an existing Bible section.

**This is a proposal, not a diff to apply from this taskplan alone.** Draft the exact
before/after text as its own reviewable artifact when this taskplan is picked up, get it
confirmed, then apply — per the constraint section above.

### 3. Spec updates — REQ-ID additions, `verity-spec/`

The Spec (`verity-spec/`) is the technical-requirement layer, edited more freely than the
Bible per this repo's own authority order. Add REQ-IDs for the six ADR-025 patterns above
under whatever existing Experience System requirement group already governs shell/component
patterns (find it — likely adjacent to wherever ADR-011/023/024's own requirements were
filed; do not invent a new top-level section if an existing one fits). Each REQ-ID becomes
the citation target for `Authority: Spec V2 [REQ-ID]` on the component that implements it.

### 4. `verity-design-companion` skill — keep in sync

Task 111 already flagged this skill needs to track Experience System changes. Update it
(or confirm it auto-derives from `CLAUDE.md` and needs no separate edit — check which before
assuming) once ADR-025/AMD-002/the Spec REQ-IDs land, so a fresh session invoking that skill
gets the current picture, not ADR-023's now-superseded one.

## Non-goals — explicit, because "apple design" invites scope creep

- **Not literally cloning Apple's own products.** No SF Symbols, no iOS navigation-bar/tab-
  bar chrome, no macOS window chrome, no Apple wordmark/glyph anywhere. "Apple craft" means
  the WWDC-documented *discipline* (interruptible motion, material hierarchy, size-specific
  typography, the eight principles) applied to Verity's own identity — not Verity pretending
  to be an Apple app. This is the same distinction ADR-024's own "Explicitly out of scope"
  section already drew; restated here because it's the single easiest way for this taskplan
  to be misread.
- **Not touching brand identity.** The Verity mark stays monochrome, fixed, never recoloured
  (ADR-012, unchanged, unaffected by anything in this taskplan). Inter stays the typeface
  (ADR-024's typography clause already says this — no font swap, discipline only). The
  user's own instruction says "keeping brand identity intact" — take that literally: mark,
  wordmark, "OPERATE. OPTIMIZE. OUTPERFORM." tagline, hourglass motif are all out of scope
  for change.
- **Not the accent color.** Explicit from the user this turn: "dont focus on colors because
  we'll keep accent color changer later." Whatever the reference screenshots show in blue is
  evidence for *structure* only. Gold stays the default per ADR-024 until a separate,
  explicit decision changes it again.
- **Not INV-001/002/003, terminology, or authority order.** Nothing here touches tenancy
  isolation, closed-state locking, unified Party identity, or the Spec > Bible > ADR
  precedence order itself — this is an Experience System change, the same category ADR-011/
  012/023/024 all were, not a platform-architecture change.
- **Not a one-session build.** This taskplan defines what changes and where; execution is
  the same "proof surface first" phasing ADR-024's own rollout used (see its handoff) —
  land the governing-doc changes, then one pattern at a time, verified live, not a forced
  sweep.

## Open decisions for whoever picks this up

- Exact Bible §1 amendment text (AMD-002) — draft and get it confirmed before applying, per
  this file's own constraint section.
- Whether ADR-025 is the right number — re-run `verity-adr-gate` at execution time; this
  taskplan was written assuming 025 is free as of 2026-09-18, but taskplans and ADRs are
  numbered independently and a concurrent session could have taken it.
- Which existing Spec section the six REQ-IDs belong under — not identified by number in
  this file; find the ADR-011/023/024 requirement group's actual location before adding.
- Whether `verity-design-companion` needs its own edit or auto-derives from `CLAUDE.md` —
  check before assuming either.

## Verification (once execution starts)

Same discipline as ADR-024's own rollout, extended:
1. `npx tsc --noEmit` / `npx eslint --max-warnings=0` after every component-pattern change.
2. Live screenshot check (Chrome DevTools MCP or the user's own browser) — both themes,
   before/after — for every new pattern (split-button, stat-tile, workspace-switcher card,
   chart tooltip, filter-chip task rows, quick-actions grid, AI suggested-prompts).
3. Re-check the ADR-024 handoff's open `backdrop-filter` build bug before assuming any new
   glass-chrome pattern (e.g. the workspace-switcher card, if it becomes chrome) renders
   correctly — that bug is unresolved and will silently affect anything built on the glass
   classes until it's fixed.
4. Accessibility parity: every new pattern needs a `prefers-reduced-motion` and (if it uses
   glass) `prefers-reduced-transparency` check, per ADR-024's own carried-forward
   constraints — not a new rule, just don't skip it because the pattern is new.
