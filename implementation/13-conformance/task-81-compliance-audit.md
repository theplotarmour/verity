# Task 81 compliance audit — against Task 84's chat surface

Authority: `taskplans/81_erpclaw_ai_operating_rules.md` (16 rules),
`taskplans/101_remaining_work_master_plan.md` §1a. Walked 2026-09-04
against `src/server/platform/agent-chat.ts`, `batch.ts`, `grounding.ts`,
`src/components/shell/AgentChatDock.tsx` — the only code that exists to
apply these rules to.

Task 81's own trigger ("whenever Verity gains an assistant/chat command
layer") fired when Task 84 area 6 shipped 2026-09-04. This is the first
walk of the 16 rules against what actually got built.

## Compliant, no action

| Rule | Why |
|---|---|
| 4/4a — confirmation classes, destructive checklist | `runCommandBatch`'s `needs_approval` gate never auto-executes a destructive command — stricter than the rule requires, not weaker. |
| 5 — reversal over mutation | Enforced at the schema level (append-only tables + `reject_mutation` trigger) on every ledger this session touched, not an agent-layer concern. |
| 7 — assistant + dashboard, visible trail | Every tool call runs through the ordinary `executeCommand`/`executeQuery` path — same audit/activity/domain-event trail as any other caller. Nothing the agent does is agent-only-visible. |
| 10 — persistent shell region, not a modal | `AgentChatDock` mounts once in `ShellChrome`, toggled open/closed, never navigates away. |
| 16 — auditability before automation | The agent only calls commands a human already can, all already explainable/audited. Nothing new was automated. |

## Fixed today (cheap, found by this audit)

| Rule | Gap found | Fix |
|---|---|---|
| 9 / 13 — error-class taxonomy, "why can't I" | `runTool` was discarding `toActionFailure`'s already-computed `code` and handing the model a bare message string, so a model reading the error had no reliable way to distinguish "fix your input" from "you're not allowed" from "query again." | `runTool` now returns `{ code, message }` for every failure (command and query paths), and the system prompt tells the model what each code means (rule 4 of the prompt, `E_VALIDATION`/`E_FORBIDDEN`/`E_CONFLICT`/`E_UNGROUNDED`). |
| 2 — exact legal-entity resolution, never fuzzy-match | Nothing in the system prompt stated this discipline at all — the model was free to guess a "closest" customer/supplier name with nothing structurally stopping it. | Added as prompt rule 2: list exact candidates and ask, never autocorrect; single-record default only when exactly one exists (rule 2a). Prompt-level, not structurally enforced — see open gaps below. |

## Built 2026-09-08 (previously recorded open, real design work)

| Rule | Gap | Fix |
|---|---|---|
| 1 — live-record grounding (prose claims) | `assertGrounded` only checked `*Id` fields on command INPUT, not a prose claim's numbers. | `GroundingCache` now also records every number reachable from a query result this turn; `checkProseClaims()` (`grounding.ts`) scans the final reply for currency/comma-grouped/decimal numbers and flags any not seen in a query result. **Deliberately a warning, not a block** (`AgentTurnResult.groundingWarnings`) — a false positive here would refuse a correct answer, worse than the gap it closes. Rendered as a small "double-check" note in the dock, never alters or suppresses the reply. Full response-time fact-checking of arbitrary claims (not just numbers) remains future work; this closes the concrete, worked numeric case. |
| 8 — six-step contract, step 3 (preview) | No pause before executing a routine action whose resolution wasn't obvious (worked example: "mark all three overdue invoices written off"). | `agent-chat.ts`'s `detectBatchPreview()`: when one assistant message contains 2+ tool calls to the SAME routine (non-destructive) command, the turn stops before executing any of them and returns a `PendingPreview` (command description + exact resolved inputs) instead. `AgentChatDock.tsx` renders a structural Confirm/Cancel card. Confirm calls `executeConfirmedPreview()` with the EXACT previously-shown inputs — the model never re-derives them, so there is no drift between what was shown and what runs. Scope is deliberately bounded to this one shape (2+ same-key routine calls in one message) — not a general "preview anything ambiguous" engine, per the same over-build caution Task 93 states for a different primitive. |

## Still open, not fixed (real design work, different mechanism than above)

| Rule | Gap | Why not fixed now |
|---|---|---|
| 2 — exact match, structural enforcement | Fixed at the prompt level only (2026-09-04 pass). A model can still ignore the instruction. No structural gate (e.g. refusing a create/update whose resolved entity came from a multi-candidate query without an explicit user pick) exists. | Would need the grounding mechanism extended to track "which specific candidate did the user pick," a different and larger addition than the numeric-claim check built today. |

## Not yet applicable

Rules 3, 6, 11, 12, 14, 15 either govern UI surfaces not built yet
(onboarding, role editor, per-workflow next-actions), or are already
satisfied by construction (rule 3 — the dock never renders raw tool
names to the user, only `reply` text) and have nothing further to check
until those surfaces exist.

## Result

2026-09-04: two real, cheap gaps found and fixed same day; three non-cheap
gaps recorded rather than rushed.

2026-09-08: two of those three built (prose-claim numeric grounding as a
warning, and the preview step for the batch-routine-action shape). One
remains open — structural (non-prompt-level) exact-match enforcement —
tracked above, not rushed for the same reason the others weren't: it needs
the grounding mechanism extended in a different direction than either fix
built today.
