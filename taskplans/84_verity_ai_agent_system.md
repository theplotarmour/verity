# Task 84 — Verity AI agent system: six implementation areas

Authority: `CLAUDE.md` ADR-017 (accepted 2026-09-03 — the gate below is
now cleared). `taskplans/81_erpclaw_ai_operating_rules.md` (the rules this
builds against). `src/server/platform/command.ts`, `src/server/platform/
policy.ts` (the runtime this builds on — read in full 2026-09-02/03).
`erpclaw-prd/00-product-vision.md` §5.1 (AI-first but ledger-hard).

## Status: IN PROGRESS — areas 1, 2, 3, 5 built and tested 2026-09-03.
Areas 4 (grounding enforcement) and 6 (chat surface) not started.

The gate that blocked this is cleared: `CLAUDE.md` ADR-017 ratifies "the
agent channel authenticates and authorizes as the calling human's own
`ActorContext`, never elevated" as constitutional. Areas 1/2/3/5 —
`tool-manifest.ts`, `impact` on `CommandDefinition`, actor-scoped
filtering, and `executeQuery`'s `channel` parameter — are built, unit-
tested (`command-runtime.test.ts`, `tool-manifest.test.ts`), and verified
live against the Shree Ganesh tenant (104 correctly-filtered tools for
the owner role). Area 4 needs its own design pass; area 6 needs an LLM/
provider decision. Neither started.

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
buildable. Done: `CLAUDE.md` ADR-017 is that ADR, accepted. The six areas
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

Areas 1, 2, 3, and 5 are **built** (2026-09-03). 4 and 6 are not started.

**1. Tool-manifest generator — BUILT.** `src/server/platform/
tool-manifest.ts`, `buildToolManifest(tx, actor)`. Every `CommandDefinition`/
`QueryDefinition`'s zod `input` schema converted via zod v4's native
`z.toJSONSchema()` — no new dependency, one source of truth, never a
hand-duplicated second copy of "what a sales order needs." `listCommands`/
`listQueries` added to `command.ts`/`query.ts` to enumerate the registry
(neither existed before — only single-key lookup did).

**2. Confirmation-class field on commands — BUILT.** `CommandDefinition`
now carries `impact?: "routine" | "destructive"` (Task 81 rule 4/4a
supplies the destructive checklist). Absent means routine — every command
shipped before this field existed is routine by that checklist, so no
retroactive tagging was needed. The proposal/confirm UI flow this enables
is still area 6's job, not built here.

**3. Actor-scoped tool visibility — BUILT, combined with area 1.**
`buildToolManifest` filters by the actor's actual grants before returning
anything — not a separate pass, since an unfiltered manifest was never
worth producing in the first place. Verified live against the Shree
Ganesh tenant: 104 tools for the owner role, correctly zero for a
no-role actor, correctly excludes a suspended capability's tools.
**Performance finding, fixed in the same pass:** the first version called
`permittedVerbs()` (a recursive role-composition query) once per
registered command/query — confirmed live to time out a 15s interactive
transaction against the real ~110-item registry. Fixed by calling
`resolvePermissions` exactly once per manifest build and checking
candidates against the in-memory result instead.

**4. Grounding enforcement — the genuinely open problem. Still not
started.** Task 81 rule 1 says "query before claiming." Nothing enforces
that today; it is prompt convention until built. Real version: a
create/update tool call referencing an entity by name should require
that entity's ID came from a query result already surfaced in the same
turn, not free-typed by the model. Unsolved, not a small addition —
budget real design time here.

**5. Query-channel parity gap — BUILT.** `executeQuery` now takes a
`channel: PolicyChannel = "api"` parameter. Building this surfaced a
bigger gap than the "small, mechanical" framing suggested: `executeQuery`
was calling `authorize()` directly (Layer 1 only), never `policy.ts`'s
unified `enforcePolicy` the way `executeCommand` already did — exactly
the "four different callers" problem `policy.ts`'s own module doc
describes fixing for commands, never applied to reads. Fixed by routing
`executeQuery` through `enforcePolicy` too. Confirmed behavior-preserving
(`authorize()` and `evaluatePolicy`'s Layer 1 both resolve through the
same `verity.resolve_permissions` function) and covered by the existing
allow/deny tests in `command-runtime.test.ts`, which passed unchanged.

**6. The chat surface itself — not started.** New UI + a server route.
Lives as a persistent shell region per Task 81 rule 10, not a modal.
Needs an LLM/provider decision this session made no assumption about —
no AI SDK is installed. Nothing to reuse here.

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
