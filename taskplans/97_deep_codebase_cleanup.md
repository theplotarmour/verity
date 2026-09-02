# Task 97 — Deep codebase cleanup plan

Authority: direct investigation of the working tree, 2026-09-03 (root
listing, `git ls-files`, `.gitignore`, `eslint --version`, greps for
TODO/console.log/eslint-disable across `src/`). Every finding below is
cited to what was actually checked, not assumed.

## Status: PENDING — a plan, nothing executed

## Headline: the codebase itself is clean. The mess is at the root.

`src/` came back clean on every mechanical check: **zero** `TODO`/`FIXME`/
`HACK`/`XXX` markers, **zero** stray `console.log`, **zero**
`eslint-disable` comments. That's a genuinely disciplined codebase — this
plan is about documentation sprawl, one dead config file, one already-
made mistake to correct, and a couple of things worth a closer look, not
about rot in the application code.

## Finding 1 — `.eslintrc.json` is dead and should be deleted

`package.json` pins `"eslint": "^9"`; confirmed running (`npx eslint
--version` → 9.39.4). ESLint 9 reads flat config (`eslint.config.mjs`)
exclusively unless `ESLINT_USE_FLAT_CONFIG=false` is set — grepped for
that flag across `.json`/`.mjs`/`.ts`/`.env*`, found nowhere. `.eslintrc.json`
at the root is not read by anything that runs today. It carries three
rule overrides (`no-explicit-any: off`, `no-unused-vars: off`,
`no-img-element: off`) that look load-bearing but aren't — if any of them
is actually needed, it has to be (and may already be) in
`eslint.config.mjs`, since that's the only file ESLint reads.

**Action:** confirm the three rules already have equivalent handling in
`eslint.config.mjs` (read it before deleting), then delete
`.eslintrc.json`. Low risk, no code touched, one file removed.

## Finding 2 — ADR-013/017 numbering mistake, already fixed

Not a new finding to act on — recorded here for the plan's own paper
trail. Commit `6bd5c4b` (2026-09-03) already corrected a same-day mistake:
an ADR was written into `CLAUDE.md` as ADR-013 without checking the real
register at `verity-spec/17_decisions/adr/`, which already ran through
`adr-016.md`. Fixed to ADR-017 with a proper canonical file. The general
lesson folded into `CLAUDE.md` itself (its ADR list is now flagged
stale — stops at 012, real register goes to 017) so the next person
doesn't repeat it.

## Finding 3 — `implementation/adr-013-proposal.md` is now stale-named

That file is the **proposal** that became the real, accepted
`verity-spec/17_decisions/adr/adr-013.md` (Global HQ Operator Security
Model) — read in full during this investigation to root-cause Finding 2.
Its own header says "PROPOSAL FOR REVIEW — NOT A DECISION," but the
decision it proposed has since been made and accepted. Keeping a
proposal doc whose filename now collides in spirit with a different,
accepted ADR-013 is exactly the kind of thing that caused Finding 2's
mistake — the next person searching for "adr-013" finds this file first.

**Action:** rename to `implementation/adr-013-hq-operator-security-
proposal.md` (or move under an `implementation/archive/` if one doesn't
already imply proposals go stale in place) and add one line at the top:
"Superseded — see `verity-spec/17_decisions/adr/adr-013.md` for the
accepted decision." Do not delete — it's a legitimate design-rationale
record, just needs to stop looking like a live, numbered-open ADR.

## Finding 4 — 13 loose `.md` files at repo root

`clinic.md`, `coaching.md`, `HQ_Issues_And_Findings.md`,
`HQ_User_Guide.md`, `HQ_UX_Redesign.md`, `HQaudit.md`,
`KentsRestaurant.md`, `Naksh_Trial_Friction_Points.md`, `plywood.md`,
`PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md`, `Verity_Component_
Specification.md`, `Verity_Motion_Architecture.md`, `Verity_Operator_
Client_Mapping.md`, `Verity_Page_By_Page_Flow_Report.md` — 14 once you
count `AGENTS.md`/`CLAUDE.md` out. Several are actively cited as
authority elsewhere (`plywood.md`, `KentsRestaurant.md`, `clinic.md`,
`coaching.md`, `salon.md` are all named in `CLAUDE.md` itself and in
Task 82/83) — these are **not** clutter, they're load-bearing and belong
exactly where they are, at the root, per `CLAUDE.md`'s own references.

The genuinely loose ones — `HQ_Issues_And_Findings.md`, `HQ_User_
Guide.md`, `HQ_UX_Redesign.md`, `HQaudit.md`, `Naksh_Trial_Friction_
Points.md`, `PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md`, and the four
`Verity_*.md` files — are not cited by `CLAUDE.md`'s authority order and
read as point-in-time audit/spec artifacts (dated content, e.g. HQ audit
findings) rather than living references.

**Action (needs your call, not mine):** these look like exactly the kind
of historical-record doc that belongs under `implementation/` (which
already holds dated, point-in-time artifacts like `client-readiness.md`,
`db-diagnosis.md`) rather than at the root next to the five
actively-cited client docs. **Do not move anything without confirming
each one is actually superseded** — `HQaudit.md`/`HQ_Issues_And_
Findings.md` in particular could still be an open punch list, not a
closed record. This finding is "worth sorting," not "safe to move
blindly."

## Finding 5 — `verity-bible/` (492K) vs `verity-spec/` (4.1M)

Already correctly classified by `CLAUDE.md`'s own Authority order:
`verity-bible/` is "Legacy v1, maintained for historical context only; DO
NOT use for new architecture decisions." It's small, it's already marked
non-authoritative, and nothing in this investigation found code or docs
treating it as live. **No action** — this is working as designed, listed
here only so the cleanup plan can say it was checked rather than missed.

## Finding 6 — root scratch files are already correctly gitignored

`tmp_backup_verity/`, `tmp-010-*.mts`/`.mjs`, and `*.tsbuildinfo` are all
covered by `.gitignore` (confirmed by direct grep) and confirmed
untracked (`git ls-files` returns nothing for `tmp_backup_verity/`).
They're local disk clutter (17K, trivial), not a repo problem.

**Action, optional and local-only:** `rm -rf tmp_backup_verity
tmp-010-*.mts tmp-010-*.mjs` on your own machine whenever convenient —
doesn't touch git, doesn't need a PR, purely a `git status` noise
reduction for the one machine that has them.

## Finding 7 — one untracked, unexplained root asset

`37456f41-0206-4857-8455-926170724862.png` (767K) at the repo root,
untracked (not in `git ls-files`), UUID-shaped filename typical of a
pasted screenshot. Not referenced by anything found in this scan.

**Action (needs your call):** identify what this is before deleting — if
it's a stray paste-in from an earlier session with nothing pointing to
it, safe to remove; if it's referenced somewhere this scan didn't check
(a design doc's image link, a README embed), keep it.

## What this plan deliberately does NOT touch

- `src/` — clean per the mechanical checks above; no action items there.
- `verity-spec/`, `verity-bible/` — both already correctly governed by
  `CLAUDE.md`'s Authority order; not touched.
- Dependencies (`package.json`) — not audited for unused packages in this
  pass; would need `depcheck` or equivalent run separately if wanted.
- Test files, migrations, Prisma schema — none of these showed up as
  cleanup candidates in this investigation.

## Suggested order, if you approve any of this

1. Finding 1 (`.eslintrc.json` deletion) — lowest risk, do first.
2. Finding 3 (rename the stale proposal doc) — small, prevents a repeat
   of Finding 2's mistake.
3. Finding 7 (the stray PNG) — needs your identification first.
4. Finding 4 (root doc sorting) — needs your per-file confirmation; not
   a single mechanical action.
5. Finding 6 — whenever, local-only, no urgency.

Nothing here is executed. Say which findings to act on and I'll do those
specifically, not the whole list at once.
