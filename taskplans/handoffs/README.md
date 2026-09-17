# Handoffs — what's in flight, right now, in order

**This file is the entry point.** Anyone opening this repo who wants to know
"what's actively being worked on and in what order" should read this file
first — not `00_STATUS_INDEX.md` (that's the full historical register of
every taskplan ever written, Done and Pending both) and not any single
taskplan (each one only knows its own scope). This file is kept current
every time active work state changes — a new item starts, an item finishes,
or the order changes. If it looks stale (no update in the "Last updated"
line below matching recent commits), regenerate it from `git log` and the
taskplans it points to before trusting it, same rule `00_STATUS_INDEX.md`
already states for itself.

**Last updated: 2026-09-18 (Task 114 P1.5 fully landed; Experience System v2 / ADR-024 started)**

## How to use this folder

- Each file here is a **file-level, concrete continuation checklist** for
  one active thread of work — exact paths, function names, what's already
  built vs. still needed, discovered nuances that would otherwise be
  re-derived from scratch. It answers "where exactly," not "why" — the
  "why" lives in the taskplan it's paired with (cited at the top of each
  handoff file).
- A handoff file is **not** a taskplan. It doesn't invent scope, doesn't get
  a taskplan number, and doesn't replace the taskplan it's paired with —
  it's a working note that stays in sync with that taskplan's own status
  markers (DONE/PENDING per item) as code actually lands.
- When a thread finishes entirely, its handoff file moves to
  `taskplans/handoffs/done/` (create that subfolder when the first one
  finishes) rather than being deleted — same "don't destroy history"
  posture as the rest of `taskplans/`.

## Active work, in order

### 1. Verity Experience System v2 — ADR-024 rollout (glass chrome, gold accent, motion)

Handoff: [`experience-system-v2-adr024.md`](./experience-system-v2-adr024.md)
Authority: `verity-spec/17_decisions/adr/adr-024.md`

Status: Foundation + proof surface + step 3 (CommandPalette/AgentChatDock/
Button press/motion presets) DONE 2026-09-18 (commits `b95296d`..
`233463f`). **A real, found-but-unfixed bug is blocking full visual
completion**: `backdrop-filter` is stripped from all four glass classes
somewhere in the CSS build — confirmed via live CSSOM inspection, not yet
root-caused (dev-vs-prod build, Lightning CSS defaults, and `@layer`
placement are the untried leads). Read the handoff's own "open bug"
section before touching `globals.css` again. Remaining rollout (motion
wired into actual transitions, typography pass, per-capability sweep,
copying the gold board into `design/`) is intentionally deferred per the
plan's own phasing — none of it started.

### 2. Task 114 — Outreach execution-layer UX redesign — P1.5 fully DONE 2026-09-18

Handoff: [`outreach-p0-continuation.md`](./outreach-p0-continuation.md)
Taskplan: `taskplans/114_pa_oms_outreach_execution_layer_redesign.md`

Status: P0, P1, and **all of P1.5 (items 1-9)** DONE. Items 6 and 9 are
partial by design — see the taskplan's own per-item notes for exactly
what each stops short of and why (both need product-owner-level business
decisions the review never specified). Item 5 (card verbosity) is now
also DONE — trimmed to one qualification field + 3 footer items instead
of four/five. **Only P2 remains** (sequences/cadences, activity-type-
aware forms, enrichment) — still parked pending product-owner scoping;
do not start it from the taskplan's text alone. If asked to scope just
the activity-type-aware forms slice, propose the exact field set per
type before writing code (per this file's own prior discipline).

### 3. Task 111 → Task 112 — structured-minimalism material rollout — DONE 2026-09-17

Full sweep complete: `Surface`'s `solid` default flipped to `true`
(ADR-023), every remaining `.glass-*` class and `bg-glass-N` token in
`src/` migrated to `verity-solid`/`bg-surface-sunken` across ~40 files in
7 commits (`fb7f3b9`..`3ad2b89`). See
`taskplans/112_complete_ui_ux_upgrade_to_structured_minimalism.md`'s own
Status section for the full file list and verification notes. The known
`bg-glass-2` violation in `prospects/page.tsx` (~line 345) is fixed. Task
114's P1.5 (which depended on this landing first per its own note) can
now proceed.

### 4. Task 113 — AI implementation audit

No handoff file — small enough that the taskplan itself
(`taskplans/113_ai_implementation_audit_all_clients_and_global_agent.md`)
carries its own findings inline. Status: items 1/2/4/5 DONE 2026-09-17
(model swap applied, `openai/gpt-oss-120b`; surfaced a second bug —
`generateLeadInsight` still doesn't persist after a successful tool call,
unresolved). Item 3 (per-tenant reality check) needs live-DB access this
environment doesn't have — flagged, not silently skipped.

### 5. Task 90 — Attention platform concept (watching, not active)

Not active work — a trigger watch. `taskplans/90_attention_platform_
concept.md`'s 2026-09-17 note records that Task 114's Outreach work queue
(P0.1) is a capability-local build, not the platform-primitive trigger
firing (still one real instance, not two independently-arrived-at ones).
Listed here so nobody re-derives this question mid-P0.1.

## Closed loops (no longer active, recorded so they aren't re-opened)

- **Task 97 Finding 1/6 + Task 100's metric-snapshot migration** — both
  were already done 2026-09-04 (commit `e92dbee`), just undocumented until
  2026-09-17. No handoff needed; corrected directly in
  `taskplans/97_deep_codebase_cleanup.md`, `taskplans/100_dashboard_
  intelligence_direction.md`, and `taskplans/00_STATUS_INDEX.md`.
- **Task 109 Phase G's Kanban board** — built 2026-09-17, removed the same
  day by a concurrent session (`ec31890`) in favor of `/outreach/
  prospects`. Not a regression to fix — see Task 109's own correction
  note. Do not rebuild it.

## When you finish something in a handoff file

1. Update the taskplan it's paired with (status markers, DONE + date +
   files touched) in the same commit as the code — not a separate pass.
2. Update the relevant section of *this* README (status line under
   "Active work, in order") in the same commit.
3. If the whole thread is done, move its handoff file to `./done/` and
   remove its "Active work" entry above, replacing it with a one-line
   pointer under "Closed loops."
