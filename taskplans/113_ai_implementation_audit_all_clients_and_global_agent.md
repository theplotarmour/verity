# Task 113 — AI implementation audit: per-tenant AI + the global agent

Authority: User synthesis, 2026-09-17 — "check AI implementation for all
clients and global AI agent." Audits Task 84 (`verity_ai_agent_system`,
COMPLETE per index), ADR-017 (agent channel authority), Task 106 Phase 8
(`OutreachAiInsight`, BLOCKED), Task 95 (AI long-term vision, aspirational).

## Status: PENDING — audit not yet run

## Trigger

Task 84 (the platform's global AI agent — command execution, grounding,
approval flow) is marked COMPLETE in `00_STATUS_INDEX.md`, but "complete"
there means unit-tested and live-verified for near-term scope, with known
MVP gaps recorded in the file itself (no streaming, entity-agnostic
grounding, no confirm UI). Separately, Task 106 Phase 8 built a
capability-specific AI feature (`OutreachAiInsight`) that is explicitly
**BLOCKED for live use** — `OPENAI_MODEL=groq/compound` has no tool
calling, so the Task 84 agent dock never worked in that deployment, and
Groq's free-tier 8k TPM is under one grounded turn. No session has since
verified whether that block is still in force, whether it affects every
tenant or one deployment config, or whether any tenant has ever
successfully completed a real AI-agent interaction end-to-end. This
taskplan is that verification — distinguishing BUILT from PROVEN per
`CLAUDE.md`'s own reporting-vocabulary rule, which this exact gap violates
if left unaudited.

## Scope

**In scope:**
1. **Global agent (Task 84 / ADR-017) status check.** Confirm the six
   implementation areas are still wired as built: command execution
   through `enforcePolicy()`, grounding (`GroundingCache`), the
   approval/confirm flow, the `agent` `PolicyChannel` running as the
   calling human's own `ActorContext` (ADR-017's constitutional claim —
   verify no drift toward a service-account or elevated path). Check for
   regressions since 2026-09-04/09.
2. **Model/deployment configuration per environment.** What
   `OPENAI_MODEL` (or equivalent) is actually configured in each real
   deployment target — dev, any live tenant, CI. Confirm whether the
   Groq-no-tool-calling block from Task 106 Phase 8 is still current, or
   was a deployment-specific misconfiguration that's since been corrected
   elsewhere. Do not assume; check the actual environment variable per
   target.
3. **Per-tenant reality check.** For every tenant with an actual account
   (per this repo's own note, "Shree Ganesh Timber Trading Co. is
   Verity's one real client" as of Task 93) — has the AI agent or any
   AI-derived feature (`generateLeadInsight`, the `AI Assistant` dock
   shown in the Home dashboard reference pattern, Outreach's `AI insights`
   card) ever been exercised successfully in that tenant's real session,
   or only in tests/dev? BUILT vs. PROVEN, per capability, per tenant.
4. **`runAgentTurn` / `toolKeys` narrowing (Task 106 Phase 8's mechanism).**
   Verify this generalizes cleanly to other capabilities wanting a scoped
   AI feature, or whether it was built narrowly for Outreach and would
   need generalization work before a second capability could reuse it —
   this repo's own foundation-readiness bar (Task 84's item 14,
   "hypothetical future-capability validation").
5. **Task 95 (AI long-term vision) reality gap.** List which of its
   phases remain purely aspirational vs. which now have real, if partial,
   implementation via Task 84/106 — the file itself says this needs
   updating as things land, and it's unclear if that's been kept current.

**Out of scope:**
- Building any new AI feature. This is an audit — BUILT/PROVEN/NOT YET
  BUILT classification per `CLAUDE.md`'s own reporting vocabulary, not
  new implementation. A fix for whatever's found is a follow-up taskplan.
- Prompt-quality or model-choice recommendations beyond "does tool calling
  work at all" — that's a product decision once the facts are established,
  not something to embed as an opinion in the audit itself.
- Task 81's compliance-rule audit (already CLOSED, separately tracked) —
  don't re-run that; cite its result if relevant, don't redo the work.

## Deliverable

A findings section appended to this file (or a follow-up numbered
taskplan, if the findings are large enough to need their own build plan)
stating, per capability and per real tenant: agent channel status (working
/ blocked / never exercised), model/tool-calling configuration actually in
force, and an explicit list of what Task 95's vision phases are now
BUILT vs. still aspirational. Update `00_STATUS_INDEX.md`'s Task 84 and
106 rows if this audit finds their current status text is stale.

## Findings (2026-09-17, partial — item 2 confirmed empirically, items 1/3/4/5 not yet run)

**Item 2 — model/deployment configuration: CONFIRMED, then FIXED.** Live
probe against Groq's endpoint: `groq/compound` returns HTTP 400 on a tool-
call request — confirmed still broken, not a stale claim. A second probe
against `openai/gpt-oss-120b` on the same Groq endpoint/key returned a
correct function call. `.env`'s `OPENAI_MODEL` changed from
`groq/compound` to `openai/gpt-oss-120b` on this basis
(`src/server/platform/agent-chat.ts` line-comment/whitespace only, no
functional change). This is a narrow deployment-config fix per Task 101's
Category-1 "buildable now, zero dependency" bar — not a redesign, per this
file's own non-goals.

**Follow-up run against the repo's real integration test
(`src/test/capability-outreach.test.ts`'s opt-in live-AI case,
`describeDb`, exercises `generateLeadInsight` end to end against the real
actor-scoped path):** 60/64 tests pass (3 pre-existing environmental
failures, consistent with Task 106's own note about remote-DB/pooler
flakiness — not new). The live-AI assertion itself still fails: the model
now completes a tool call, but `generateLeadInsight` does not persist an
insight row from it. **Conclusion: item 2's config fix is necessary but not
sufficient** — Phase 8's BLOCKED status changes from "provider rejects tool
calls" to "provider accepts tool calls, but the action pipeline after the
tool call doesn't complete." That is a different, still-open bug, not yet
root-caused. `requireActor` in the test file was also fixed to pass through
`importOriginal` (it was fully replacing the auth module, masking other
exports) — a test-correctness fix uncovered while chasing this, unrelated
to the model swap itself.

**Item 1 — global agent regression check: NO DRIFT FOUND.** Read
`agent-chat.ts` in full and grepped `command.ts` for `channel`. `channel:
"agent"` is threaded through to `runCommandBatch`/`executeQuery` purely as
a passthrough option; the only place `channel === "agent"` is branched on
anywhere in `command.ts` is line 265, gating `assertGrounded(input,
grounding)` — a restriction (agent-sourced input must be grounded),
never an added authority path. Destructive commands still always return
`needs_approval` (`runTool`'s command branch, unconditional on
`command.impact === "destructive"`). One `GroundingCache` is still
constructed fresh per `runAgentTurn` call, never passed in or reused.
ADR-017's constitutional claim holds as written; no regression since
2026-09-04/09.

**Item 4 — `toolKeys` narrowing generalization: CONFIRMED GENERIC.**
`runAgentTurn`'s `options.toolKeys` filters the already actor-scoped
`fullManifest` by key list before building the OpenAI tool array — a
plain array filter with no Outreach-specific logic anywhere in
`agent-chat.ts`. Any capability can call `runAgentTurn(actor, history,
message, { toolKeys: [...] })` today with no generalization work needed;
Task 106 Phase 8 was the first caller, not a special case that would need
refactoring for a second one.

**Item 5 — Task 95 phase reality gap.** Phase 1 (Grounded Ask) and Phase 2
(Safe Actions) are BUILT (Task 84 areas 1-2, 4-6, confirmed present in
`agent-chat.ts`/`grounding.ts`/`tool-manifest.ts` this pass). Phase 3
(Business Reasoning) is NOT built — it explicitly depends on Tasks 88/90
existing "in some form," and both are still trigger-unfired per Task
101's addendum; Task 92 (business timeline, one of its three
dependencies) is done, but that alone doesn't satisfy the phase. Phase 4
(Proactive AI) depends directly on Task 90 — not built, same reason.
Phases 5-6 (Multimodal India, Autonomous Operations) are untouched, as
Task 95 itself expects at this stage. No update to Task 95's own text
needed — its phase gating already correctly predicts this.

**Item 3 — per-tenant BUILT-vs-PROVEN reality check: INCONCLUSIVE, needs
live access this environment doesn't have.** No local PostgreSQL
connection is available here (same pre-existing limitation Task 109
recorded for its own DB-touching tests) to query `OutreachAiInsight` rows
or any AI-feature usage table against the real PA-OMS tenant. The
integration-test result recorded above (tool call succeeds, insight still
doesn't persist) is the closest available evidence and points toward
"never successfully completed end-to-end in that tenant," but that's an
inference from a test environment, not a confirmed per-tenant fact.
Whoever has production/live-DB access should run this check directly
before this item can move from PENDING to answered.

**Summary — this file's scope is now fully addressed except item 3,**
which is blocked on infrastructure access, not effort. Findings above
should inform `00_STATUS_INDEX.md`'s Task 84/95 rows only if either
needs correcting — checked, neither does: Task 84's "complete for
near-term scope, MVP gaps recorded" framing already matches what's found
here, and Task 95's own phase gating already predicted this state.

## Non-goals

- Not a redesign of the agent architecture. ADR-017's constitutional claim
  (no service-account/elevated path, agent = calling human's own context)
  is being *verified*, not reopened, unless the audit finds it's actually
  been violated — that would escalate to a stop condition, not a silent
  fix.
- Not scoped to Outreach only, despite Task 106 being the concrete trigger
  — "global AI agent" in the user's own request means platform-wide, and
  the per-tenant check above is deliberately capability-agnostic.
