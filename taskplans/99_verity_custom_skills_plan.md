# Task 99 — Custom skills plan: efficient future work, multi-developer safety

Authority: this session's own record — every candidate below traces to a
real thing that happened in this repo (a mistake made, a manual process
repeated by hand, a bug that could recur), not a speculative want. Task
82 (`verity-client-capability-builder`) already covers one of these in
full; referenced, not duplicated.

## Status: PENDING — a plan, not an installed skill. Nothing below is built.

## Why this matters more than usual right now

`CLAUDE.md`'s own build-priority list ends with "capability/extension
infrastructure" and "hypothetical future-capability validation" — the
platform is explicitly meant to reach a point where multiple developers
build different client capabilities in parallel without stepping on each
other or on the platform core. That only works if the rules that
currently live in one person's (or one long session's) accumulated
context — CLAUDE.md, the ADR register, the taskplan conventions, the
"capability-private until two clients" discipline — are also encoded
somewhere a *new* developer or a *fresh* agent session can load
mechanically, instead of re-deriving them from scratch or, worse, getting
them wrong the way this session did once already (see Skill 2 below).

## Candidate skills

Each is independent — pick any subset, in any order, nothing here is
sequenced or gated on another.

### 1. `verity-client-capability-builder` — already planned, Task 82

Not repeated here. Builds a new capability correctly on the first
attempt: context-loading order, the anti-pattern list, the required
output checklist. The highest-value skill on this whole list and it
already has its own file.

### 2. `verity-adr-gate` — check the register before writing one

**Traces to a real mistake, same session.** An ADR got written into
`CLAUDE.md` as "ADR-013" without checking `verity-spec/17_decisions/adr/`,
which already had an *accepted* ADR-013. Cost: a wrong number shipped,
had to be found (by accident, while scanning for something unrelated) and
corrected across five files. A skill this small pays for itself the first
time it's used: given a proposed ADR, it (a) lists every file that
numbers ADRs (`verity-spec/17_decisions/adr/*.md`, `CLAUDE.md`'s own
"Accepted decisions" list, `taskplans/17A`'s separate `V2-ADR-*` series —
three different registers, worth the skill alone), (b) finds the true
next number, (c) writes the canonical file in the established format,
(d) updates every citing location in one pass. Cheap to build, high
value, directly prevents a repeat.

### 3. `verity-migration-safety` — schema/client drift checklist

**Traces to a real bug, same session.** A migration existed and had
already been applied to the live database, but the generated Prisma
Client was stale (generated before the migration), so every query
touching the changed table 500'd — including the actual reported bug
(the Receive-button investigation) turning out to have this as a
red-herring layer on top of the real bug. A skill that runs `prisma
migrate status` + `prisma generate` + a smoke query against a changed
model, as a standard step after any schema change or before starting a
debugging session that touches the database, would have caught this in
seconds instead of requiring a live-browser reproduction to surface it.

### 4. `verity-taskplan-writer` — scaffold, don't hand-author

This session wrote 25 taskplans (72–99) by hand, each following the same
structure: title, `Authority:` citation line, `## Status`, trigger
condition, scope, non-goals. A skill that takes a one-line description
and a source citation and produces a correctly-numbered, correctly-
formatted taskplan (checking `00_STATUS_INDEX.md` for the next number,
matching the established citation style) turns a 10-minute manual task
into a 30-second one, and — same benefit as Skill 2 — removes a class of
numbering/format mistakes rather than just doing the typing faster.

### 5. `verity-rd-miner` — repeatable reference-repo extraction

The erpclaw extraction (Tasks 72–95, plus this session's two rounds of
"deeper lessons") was a genuinely valuable, thorough, but entirely manual
process: read every doc, cross-reference against Verity's own
architecture, classify each finding as already-covered / additive /
new-gap / requires-ADR, write it up. `D:\Code\R&D\` holds a dozen-plus
other reference systems (`n8n`, `frappe`, `odoo-19.0`, `Zam`, a second
`calcom` clone, now `liquid-glass-react`) not yet mined this way — twelve
others already got a lighter one-pass audit (Tasks 02–13). A skill
encoding the *method* (not the erpclaw-specific findings) — how to read a
reference system, how to classify what it teaches against Verity's
existing authority docs, the four-way classification discipline — makes
the next repo's mining session hours instead of a full multi-turn
session, and keeps the classification honest (the discipline of
"already covered" vs "genuinely new" is exactly what stopped this
session from inventing duplicate work).

### 6. `verity-capability-boundary-check` — the multi-developer one

**Purpose-built for "multiple developers, different clients, in
parallel."** Given a diff or a branch, flags whether it touches
`src/server/platform/` (shared, requires the "two real clients prove
reuse" bar and usually an ADR) versus staying inside one capability's own
folder (`src/server/capabilities/<name>/`) — the exact distinction Task
82's anti-pattern list already states in words ("one client's need means
platform primitive") but nothing currently checks mechanically. This is
the one directly aimed at your stated future scenario: two developers,
one building a CA-firm capability, one building a second plywood-like
client, neither should be able to accidentally widen shared platform
code to solve a problem local to their own capability, and a human
reviewer shouldn't have to catch every instance by eye.

### 7. `verity-orientation` — cold-start briefing

A fresh developer, or a fresh agent session with no accumulated context,
currently has to read `CLAUDE.md` (900+ lines) plus whichever taskplans
are relevant before doing useful work. A skill that generates a short,
current-as-of-now briefing — what's built (from `00_STATUS_INDEX.md`),
what's standing-and-triggered (Task 96's phases), what's the immediate
authority order — would compress that ramp-up, and could regenerate
itself as the platform grows rather than staying a static document that
drifts (the way `CLAUDE.md`'s own ADR list already drifted, per Skill 2).

### 8. `verity-design-companion` — project-scoped extension of `impeccable`

`impeccable` is deliberately generic. Verity's Experience System (ADR-011/
012: the ten accent presets, the four glass materials and their
constraints, the monochrome-mark rule, the specific neutral/type ladder)
is real, specific, and currently lives entirely in `CLAUDE.md` prose that
`impeccable` has no special awareness of. A thin, project-scoped skill
that hands `impeccable` the Verity-specific palette/material/token
constraints as structured input — rather than relying on the model to
have read and remembered the right paragraph of `CLAUDE.md` — reduces the
chance of a future frontend change quietly drifting off-token the way a
hand-hardcoded accent value would.

## Priority, if choosing where to start

**High, cheap, do first:** Skills 2 and 3 — both are small, both directly
prevent a mistake that already happened once, both pay for themselves
immediately.

**High value, more effort:** Skill 6 — the one that actually serves
"multi-developer, different clients" as stated, but needs real design
work (what counts as a platform-touching change is not always a clean
file-path rule — a new Verb in the closed set, for instance, touches
`authorization.ts` legitimately).

**Useful, no urgency:** Skills 4, 5, 7, 8 — each saves real time but
nothing breaks by deferring them.

## Non-goals

- Not building any of these now. This is the plan, not the work.
- Not a replacement for Task 82, which already covers capability-building
  specifically and in more depth than a one-paragraph entry here would.
- Not a claim that these are the only useful skills — the ones listed
  each trace to something concrete this session hit; a different
  session's friction would surface different candidates.
