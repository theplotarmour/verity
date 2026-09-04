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

## Still open, not fixed today (real design work, not a quick patch)

| Rule | Gap | Why not fixed now |
|---|---|---|
| 1 — live-record grounding | `assertGrounded` (Task 84 area 4) only checks `*Id` fields on command INPUT. It does not check whether a *prose claim* the model makes ("the customer's balance is ₹X") was actually backed by a query result this turn. Prompt rule 1 asks for this; nothing structurally enforces it for spoken claims, only for write-time IDs. | Task 84's own known-gap list already flags grounding as entity-agnostic MVP scope; extending it to prose claims is a materially different mechanism (would need response-time fact-checking against tool results), not a rule-9-style cheap fix. |
| 2 — exact match | Fixed at the prompt level only (above). A model can still ignore the instruction. No structural gate (e.g. refusing a create/update whose resolved entity came from a multi-candidate query without an explicit user pick) exists. | Same category as rule 1 — needs the grounding mechanism extended, not a standalone fix. |
| 8 — six-step contract, specifically step 3 (preview) | The loop goes straight from tool call to result. There is no "here's what I'm about to do in plain language, before you've said yes or no" step for an ambiguous or high-impact ROUTINE action (the example given: "mark all three overdue invoices written off" — routine per rule 4, but resolving to three specific invoices is worth showing before acting). Only destructive commands get any pause at all (via `needs_approval`), and even those get no preview UI — they're simply refused with a message. | A real preview step is a UI feature (a distinct message type the dock renders before the tool executes, with an accept/reject affordance) — not something to add to a text-only chat loop without designing that UI first. Belongs with Task 95's "Plans before execution" framing, not a today-sized fix. |

## Not yet applicable

Rules 3, 6, 11, 12, 14, 15 either govern UI surfaces not built yet
(onboarding, role editor, per-workflow next-actions), or are already
satisfied by construction (rule 3 — the dock never renders raw tool
names to the user, only `reply` text) and have nothing further to check
until those surfaces exist.

## Result

Two real, cheap gaps found and fixed same day. Two real, non-cheap gaps
recorded rather than rushed — both trace back to the same root (`assertGrounded`'s
MVP scope stopping at write-time IDs, not spoken claims) and should be designed
together, not patched separately, whenever they're picked up.
