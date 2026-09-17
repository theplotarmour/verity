# Handoff — Verity Experience System v2 (ADR-024 rollout)

Authority: `verity-spec/17_decisions/adr/adr-024.md` (the decision),
`~/.claude/skills/apple-design/SKILL.md` (the craft reference it's built
on). Not a taskplan — no taskplan number assigned; this is purely a
material/motion/accent redesign, tracked here the same way Task 111/112's
rollout was.

## What ADR-024 says (read the full doc first, this is the summary)

Two-treatment material system: structural chrome (sidebar, top bar,
command palette, modals, dropdowns/popovers) uses the glass classes
(`.glass-shell`/`.glass-control`/`.glass-overlay`) — reactivated from
`globals.css`, which never deleted them, ADR-023 just stopped defaulting
to them. Dense content (tables, forms, record cards) stays
`.verity-solid`, exactly as ADR-023 specified — that part is unchanged.
Default accent reverts Mint → Gold `#D4A017` (existing preset, not new),
with a new constraint: accent is tint/interactive-only, never a large
filled background. New spring-based motion system on top, via
`framer-motion` (already a dependency).

## Done this session (commits `b95296d`..`233463f`)

1. **Foundation** — ADR-024 written; `DEFAULT_ACCENT` in `accent.ts` and
   `--accent-seed` fallback in `globals.css` flipped to Gold; AA-verified
   (6/6 `accent-contrast.test.ts` pass, both fill/ink pairs recomputed by
   hand and matched: light `#bc8e16`, dark `#e6c878`, both dark ink).
   `CLAUDE.md` rewritten to match (Experience System section, forbidden-
   patterns item 8, ADR-012/023 register entries).
2. **Proof surface** — `ShellChrome` (sidebar `<aside>`, mobile top bar,
   mobile nav sheet, the search input, the bell button), `ProfileMenu`
   dropdown, `OverflowMenu` popover, `Combobox`'s floating list (NOT its
   field — that stays solid, sits among other form fields), `Modal`
   dialog surface — all moved `.verity-solid` → the appropriate glass
   class. Fixed the concrete accent-as-fill defect ADR-024 names: Outreach's
   "Current Direction" banner (`src/app/(shell)/outreach/page.tsx`) was
   `bg-accent-subtle` across the whole card — now `bg-surface` with a 3px
   gold left-edge stripe (`border-l-accent`).
3. **Step 3** — `CommandPalette` dialog and `AgentChatDock`'s trigger
   button + panel container moved to glass (message bubbles/input/buttons
   *inside* the dock deliberately stayed solid — stacking glass on glass
   collapses legibility, per `globals.css`'s own comment). `Button` in
   `primitives.tsx` gained real press feedback (`active:scale-[0.97]`,
   apple-design skill §1's exact value). New `src/lib/motion.ts`:
   `springDefault`/`springMomentum`/`reducedMotionFade` presets matching
   the skill's damping/response table — **foundation only, not yet wired
   into any component's actual open/close transition.**

Verified live in Chrome DevTools MCP, both themes, on `/outreach` and
`/outreach/[id]`: chrome renders with the gradient/border/shadow styling
correctly, gold accent shows on active nav + avatar + the banner edge,
content stays solid and legible, `PermissionDenied`'s new "Request
access"/"Go to dashboard" buttons (unrelated Task 114 work, same session)
render correctly on the glass-adjacent page background.

## The open bug — found, not fixed (real, needs fresh-context investigation)

**`backdrop-filter` is being stripped from all four glass classes during
the CSS build.** Confirmed via live CSSOM inspection
(`document.styleSheets` walk, matching rules by selector): the compiled
`.glass-shell`/`.glass-card`/`.glass-control`/`.glass-overlay` rules in
the browser have **zero** `backdrop-filter` or `-webkit-backdrop-filter`
property — not overridden by a later rule (checked `prefers-reduced-
transparency` via `matchMedia`: `false`, and the media-query fallback
block's compiled rule is also empty, same symptom) — the property is
gone before it reaches the browser at all.

Ruled out this session:
- Not a `var()`-in-`var()` composition issue — hardcoded
  `backdrop-filter: blur(44px) saturate(2.1)` (zero custom properties)
  on `.glass-shell` and it *still* compiled with no `backdrop-filter` at
  all. (Test edit was reverted — `globals.css` is back to the `var()`
  version, no net diff from `233463f`.)
- Not `prefers-reduced-transparency` — `matchMedia` returned `false` at
  the same moment the bug was observed.
- Not a duplicate/second `.glass-overlay` definition fighting it —
  walked every stylesheet's rules recursively, only the two expected
  definitions exist (base `.glass-shell,...,.glass-overlay { box-shadow
  }` rule and the level-specific ones), and NEITHER carries
  `backdrop-filter` in the compiled output.

**Effect on what's live right now**: the glass surfaces render as
correctly-tinted, bordered, shadowed cards — visually acceptable, not
broken-looking — but with zero actual blur. It reads as "a slightly
warm dark card" rather than translucent chrome. Not a regression (the
classes were unused before this session, so this bug predates ADR-024
entirely — nobody had rendered them live since ADR-023 to catch it).

**Where to look next** (not yet tried, ran out of budget this session):
1. Test a **production build** (`next build && next start`) instead of
   dev — this project uses Turbopack (Next.js 16), and dev-mode CSS
   handling can differ from what actually ships. If backdrop-filter
   survives a prod build, this is dev-only and lower priority.
2. Check for a `browserslist` field anywhere (none found in `package.json`,
   no `.browserslistrc` — Lightning CSS/Tailwind v4's CSS engine uses a
   default target when none is set; worth checking what that default is
   and whether it's dropping `backdrop-filter` as "needs a fallback it
   doesn't know how to generate").
3. Try moving the four glass class definitions into a Tailwind `@layer
   utilities` block (they currently sit outside any `@layer`) — Lightning
   CSS may process layered vs. unlayered CSS differently.
4. As a last-resort workaround if the build tool genuinely can't be
   made to keep it: apply `backdrop-filter` via inline `style={{
   backdropFilter: ... }}` in the handful of components that need it
   (`ShellChrome`, `ProfileMenu`, `OverflowMenu`, `Combobox`, `Modal`,
   `CommandPalette`, `AgentChatDock`) instead of the shared CSS class —
   uglier, but bypasses whatever the build pipeline is doing to the
   plain-CSS declaration.

Do not guess-fix this blind again with a large amount of unrelated
context already loaded — it's a narrow, mechanical build-pipeline
question. A fresh session with a small, focused repro (a blank test
page with one `.glass-shell` div) will find the real cause faster than
more trial edits in the live app.

## Remaining rollout (per the approved plan's own "not everywhere at
once" phasing — none started)

- Wire `src/lib/motion.ts`'s presets into actual component transitions:
  `Modal`/`CommandPalette` open/close, `OverflowMenu`/`Combobox` dropdown
  scale-from-trigger (`transform-origin` anchored to the trigger element,
  per apple-design skill §7 — not built yet).
- Typography pass: size-specific `letter-spacing` (negative tracking on
  large Light-300 headings, near-zero on body), leading discipline check
  against `primitives.tsx`'s heading styles.
- Per-capability rollout beyond Outreach's one banner — the rest of
  `src/app/(shell)/` follows the same chrome/content split as it's next
  opened, not a forced single-session sweep.
- **Copy the gold-primary brand board into the repo.** It currently
  lives only at `C:\Users\divyo\OneDrive\Desktop\PlotArmour\Verity\
  f0ec2b60-f00e-4dcf-afae-738bebfeb525.png` on the product owner's
  machine — ADR-024 flags this as its own follow-up. Until it's copied
  into `design/` (e.g. `design/verity-aesthetics-v2.png`) and cited by
  path, the repo's `design/verity asthetics.png` (still mint-primary) is
  the only in-repo evidence, and it's stale on the accent-default
  question specifically.

## Verification checklist for whoever picks this up

1. `npx tsc --noEmit` / `npx eslint <changed files> --max-warnings=0` —
   clean after every commit so far, same discipline expected going
   forward.
2. `npx vitest run src/test/accent-contrast.test.ts` if touching
   `accent.ts` again — 6/6 must stay passing.
3. Live check in Chrome DevTools MCP (or the user's own browser) after
   any material-class change — screenshot both themes, don't assume the
   CSS comment describes what actually renders (see the backdrop-filter
   bug above for exactly why).
4. This environment has no local Postgres — unaffected by this batch
   (pure CSS/token/component work, no schema).
