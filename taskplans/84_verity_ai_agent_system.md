# Task 84 — Verity AI agent system: six implementation areas

Authority: `CLAUDE.md` ADR-013 (accepted 2026-09-03 — the gate below is
now cleared). `taskplans/81_erpclaw_ai_operating_rules.md` (the rules this
builds against). `src/server/platform/command.ts`, `src/server/platform/
policy.ts` (the runtime this builds on — read in full 2026-09-02/03).
`erpclaw-prd/00-product-vision.md` §5.1 (AI-first but ledger-hard).

## Status: PENDING — ADR-013 accepted; the six areas below are now
buildable, in the stated dependency order. Still not started.

The gate that blocked this is cleared: `CLAUDE.md` ADR-013 ratifies "the
agent channel authenticates and authorizes as the calling human's own
`ActorContext`, never elevated" as constitutional. What follows is
implementation work, sequenced per Task 96 Phase 3 — not yet begun.

## The one fact that already decides the hard part

`policy.ts` already models a fourth caller channel, `"agent"`, alongside
`human`/`api`/`job` — added in anticipation of exactly this ("an AI agent
added in Phase 9 would have become a fourth caller with a fourth set of
habits"). Its own module doc states the rule directly:

> "THE CHANNEL IS RECORDED, NEVER CONSULTED. The dangerous reading of 'AI,
> API, UI and human actions share one model' is a system that quietly
> trusts a service account more than a person."

`policy-engine.test.ts` already asserts identical verdicts across all four
channels for the same actor and request. **The agent executes as the
authenticated human's own `ActorContext` — same role, same grants, same
tenant scope, same `enforcePolicy()` call every other caller goes
through. Never a separate service actor with elevated or different
authority.** This is not a proposal; it is already true in the code. What
does not yet exist is a numbered ADR ratifying it as constitutional, the
way ADR-005/008/009/011/012 ratify their own already-decided shapes.

The user's own framing lands on exactly this, independently: *"AI is an
interface to Verity's existing authority, not a new authority layer."*
That sentence, or one very close to it, is the ADR's actual content.

## The ADR-first gate — cleared 2026-09-03

Was: write the ADR, get it accepted, only then treat the six areas as
buildable. Done: `CLAUDE.md` ADR-013 is that ADR, accepted. The six areas
are buildable work now, not a design sketch — still not started, and
still subject to their own stated dependency order below.

## What "does things the user can't" actually means, once the gate holds

Not permission bypass — that door is closed by the fact above. The
legitimate versions: speed and scale (issuing many commands in the time a
human issues one), diligence under load (catching a duplicate customer,
an aging receivable, a blank required field a tired clerk would miss),
procedural consistency (never skipping a step), instant ad-hoc answers
that would otherwise need a report built, and bulk actions the UI has no
button for yet — same grant, no UI built. Never: a verb the actor's role
doesn't hold, cross-tenant reach, or a skipped `enforcePolicy()` call.

## The six implementation areas

Each is buildable independently once the ADR gate clears; none is started
now.

**1. Tool-manifest generator.** Every `CommandDefinition`/`QueryDefinition`
already carries a zod `input` schema (`command.ts`, `query.ts`). Generate
the LLM's tool schemas from those — one source of truth, never a
hand-duplicated second copy of "what a sales order needs."

**2. Confirmation-class field on commands.** `CommandDefinition` has no
`impact` field yet. Add `impact: "routine" | "destructive"` (Task 81 rule
4/4a supplies the destructive checklist). A destructive command the agent
selects returns a *proposal*; only an explicit human confirmation
executes it via `executeCommand`.

**3. Actor-scoped tool visibility.** Filter the tool list per conversation
by `permittedVerbs`/`grantedScopes` (already in `policy.ts`) — the model
never sees a tool it holds no grant for. Defense-in-depth on top of the
real gate in area 2/the existing pipeline, not a replacement for it.

**4. Grounding enforcement — the genuinely open problem.** Task 81 rule 1
says "query before claiming." Nothing enforces that today; it is prompt
convention until built. Real version: a create/update tool call
referencing an entity by name should require that entity's ID came from a
query result already surfaced in the same turn, not free-typed by the
model. Unsolved, not a small addition — budget real design time here.

**5. Query-channel parity gap.** `executeCommand` threads `channel`
through to the audit row; `executeQuery` takes no `channel` parameter yet.
Small, mechanical, but until it's added, agent-issued *reads* don't show
up distinctly from human reads in audit.

**6. The chat surface itself.** New UI + a server route. Lives as a
persistent shell region per Task 81 rule 10, not a modal. Nothing to reuse
here — doesn't exist in any form today.

## Dependency order

ADR → (1, 2, 3, 5 can proceed in parallel, each is small and mechanical)
→ 4 (needs real design, may reshape 1/6) → 6 (needs 1–5 to have something
to call). Do not build 6 first and retrofit the gate — that is how a
service-account shortcut gets written under deadline pressure.

## Relationship to Task 95

The user's own 2026-09-03 "Jarvis-level" vision (business graph,
multilingual/Hinglish understanding, proactive morning briefs, a job
system, an AI control centre, camera/voice/WhatsApp input, a full six-phase
roadmap) is real and worth keeping — recorded in full as **Task 95**,
explicitly marked aspirational and phased, explicitly gated behind this
same ADR plus its own later decisions. It is deliberately NOT folded into
the six areas above: those six are the near-term, concretely-buildable
slice: Task 95's phase 1 ("Grounded Ask") is roughly areas 1+3+5 here;
everything past that is Task 95's own territory, not this file's.

## Non-goals

- Not a decision about *which* LLM/provider, streaming protocol, or UI
  framework — implementation detail once the gate and shape are settled.
- Not a redesign of `command.ts`/`policy.ts` — every area above is
  additive to what exists, confirmed by reading both files in full before
  writing this.
- Not started. Nothing in this file authorizes touching platform code.
- Not the long-term vision — see Task 95 for that, and do not let its
  scope creep back into these six areas.
