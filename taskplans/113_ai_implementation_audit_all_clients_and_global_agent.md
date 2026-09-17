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

## Non-goals

- Not a redesign of the agent architecture. ADR-017's constitutional claim
  (no service-account/elevated path, agent = calling human's own context)
  is being *verified*, not reopened, unless the audit finds it's actually
  been violated — that would escalate to a stop condition, not a silent
  fix.
- Not scoped to Outreach only, despite Task 106 being the concrete trigger
  — "global AI agent" in the user's own request means platform-wide, and
  the per-tenant check above is deliberately capability-agnostic.
