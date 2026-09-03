# Task 84 — Verity AI agent system: six implementation areas

Authority: `CLAUDE.md` ADR-017 (accepted 2026-09-03 — the gate below is
now cleared). `taskplans/81_erpclaw_ai_operating_rules.md` (the rules this
builds against). `src/server/platform/command.ts`, `src/server/platform/
policy.ts` (the runtime this builds on — read in full 2026-09-02/03).
`erpclaw-prd/00-product-vision.md` §5.1 (AI-first but ledger-hard).

## Status: all six areas BUILT 2026-09-04. See each area below for scope
## notes and known gaps — "built" does not mean "final design."

The gate that blocked this is cleared: `CLAUDE.md` ADR-017 ratifies "the
agent channel authenticates and authorizes as the calling human's own
`ActorContext`, never elevated" as constitutional. Areas 1/2/3/4/5 —
`tool-manifest.ts`, `impact` on `CommandDefinition`, actor-scoped
filtering, `grounding.ts`'s per-turn `GroundingCache`, and
`executeQuery`/`executeCommand`'s `channel` parameter — are built and
unit-tested (`command-runtime.test.ts`, `tool-manifest.test.ts`,
`grounding.test.ts`); 1/2/3/5 additionally verified live against the
Shree Ganesh tenant (104 correctly-filtered tools for the owner role).
Area 6 needs an LLM/provider decision — resolved 2026-09-04: Groq, via
the existing `OPENAI_API_KEY`/`OPENAI_BASE_URL` in `.env` (OpenAI-
compatible endpoint, zero new secrets). Not started as of this edit.

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

Areas 1, 2, 3, 4, and 5 are **built** (2026-09-03/04). 6 is not started.

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

**4. Grounding enforcement — BUILT, MVP scope.** `src/server/platform/
grounding.ts`, `GroundingCache` + `assertGrounded`. Owned per agent turn
by the caller (area 6), never module-level state. `executeQuery` records
every query result's `id`s into the cache it's given; `executeCommand`
rejects (`E_UNGROUNDED`) any `*Id` input field whose value was never
recorded, for `channel === "agent"` only — every other channel passes no
cache and pays nothing. Not authorization: ADR-017 still holds, since
this restricts the SOURCE of a value, never who may write it. Known gap,
not fixed here: it checks "was this ID seen in ANY query result this
turn," not "was this ID seen for the SPECIFIC entity this field
references" — that needs a declarative reference schema on
`CommandDefinition.input` that does not exist yet.

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

**6. The chat surface — BUILT.** `src/server/platform/agent-chat.ts`
(`runAgentTurn`, `AgentNotConfiguredError`), `src/app/api/agent/chat/
route.ts`, `src/components/shell/AgentChatDock.tsx`. Provider: Groq via
its OpenAI-compatible endpoint, reusing the existing `OPENAI_API_KEY`/
`OPENAI_BASE_URL`/`OPENAI_MODEL` in `.env` — no new secret, no SDK
dependency added (the tool-calling wire format is a handful of fields
over `fetch`). `AgentChatDock` mounts in `ShellChrome` as a persistent,
always-in-DOM dock (Task 81 rule 10 — never a modal); it does NOT mount
in `HqChrome`, deliberately, since HQ's cross-tenant operator view is a
separate, higher-stakes surface this pass did not extend to. One
`GroundingCache` (area 4) is created per turn in `runAgentTurn` and
never persisted or reused. Known gaps: no streaming (one request/
response per turn, capped at 8 tool-call round trips); no persisted
conversation history across page loads (client state only); not
visually verified live (needs an authenticated session this pass had no
credentials for) — verified by typecheck, lint, and the full
`grounding.test.ts`/`command-runtime.test.ts` suites instead.

## Dependency order

ADR → (1, 2, 3, 5 can proceed in parallel, each is small and mechanical)
→ 4 (needs real design, may reshape 1/6) → 6 (needs 1–5 to have something
to call). Followed in practice: 1/2/3/5 built and verified live first,
then 4, then 6 last, consuming all five.

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
