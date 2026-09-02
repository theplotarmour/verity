# Task 81 — Platform-level assistant operating rules (from ERPClaw)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §5 (ERPClaw source).
PRN-001 (least surprise / explainable automation), PRN-002 (progressive
disclosure).

## Status: PENDING — no Verity assistant/command-layer exists yet to apply this to

Unlike Tasks 72–80 (business capabilities), this is a set of **cross-cutting
interaction rules**, not a data model — cheaper to adopt once an assistant
surface exists, and worth deciding early since it shapes command/UI-copy
conventions platform-wide rather than one capability.

**Trigger to start:** whenever Verity gains an assistant/chat command layer
over the Command/Query runtime. Until then this is a design decision on
file, not code.

**2026-09-03 addendum:** rules 8–14 below fold in learnings from the rest
of the ERPClaw corpus (`erpclaw-prd/00-04`, read in full) not present in
the original §5 extraction. Each cites its source section. The actual
build — six implementation areas, gated on a not-yet-written ADR — is now
tracked separately as **Task 84**; this file stays the operating-rules
reference Task 84 builds against, not the build plan itself.

## 1. Live-record grounding

Before the assistant claims a tenant has a record, balance, order, invoice,
stock quantity, payment, or duplicate, it must query the relevant Verity
read model in the current turn. Workspace context and prior chat memory are
not authoritative for business records.

## 2. Exact legal-entity resolution

If an action posts into a tenant, organization, business profile, or client
legal entity, exact resolution is required. If not found, show available
exact names and ask the user to choose. Never autocorrect, fuzzy-match,
abbreviate, or pick "closest" (this generalizes plywood's owner/business
name-matching discipline already in place).

**2a. When a default is allowed (additive, `erpclaw-prd/02-functional-
requirements.md` §2.2).** A *read* may default to the one existing record
when exactly one exists — no need to make a user with a single-tenant
workspace name it every time. The moment a second one exists, that default
disappears; reads behave like writes and require exact selection. The rule
is about ambiguity, not about reads vs. writes.

## 3. Business-language command layer

User-facing text says "send invoice", "record payment", "receive goods",
"close period", "add customer" — never the internal command key
(`verity.plywood.create_sales_order` stays a log/dev reference). Confirmation
dialogs describe consequences, not implementation commands.

## 4. Confirmation classes

Routine, clearly-authorized user actions execute without re-asking.
Destructive/high-impact actions require a second explicit confirmation:
deleting/restoring data, closing fiscal periods, changing credentials,
irreversible exports, schema/module operations, permanent cleanup, external
submissions.

**4a. The concrete checklist (additive, `erpclaw-prd/03-data-actions-and-
controls.md` §4.2), translated to Verity's own nouns** — the destructive
class is not just a mood, it is this list: close an accounting/fiscal
period, restore from backup, install or remove a capability, roll back a
platform/foundation file, generate a bank-payment file, force-reinitialize
a database, run a schema rollback, delete or rotate a stored credential,
and any cleanup that permanently deletes files. Anything not on a list
like this is routine by default; anything that IS on it never becomes
routine by habit.

**4b. Confirmation copy names the consequence, not the action (additive,
same source §4.3)** — quoted directly because it's the clearest possible
statement of rule 3 and rule 4 combined:

> Good: "This will close FY2026 and block ordinary postings into that
> year." Bad: "Run close-fiscal-year?"

The bad example is not hypothetical restraint — it is what a confirmation
dialog looks like when someone reaches for the command key because writing
the consequence out took a sentence instead of a function name.

## 5. Reversal over mutation

Submitted invoices, payment allocations, stock movements, GL entries, goods
receipts/issues, audit events, and evidence attachments are corrected
through reversals/addenda/adjustments — not just finance, every operational
ledger (extends INV-002's closed-state pattern beyond Work Orders).

## 6. Metadata-driven UI

Client modules declare pages, entities, fields, forms, tables, actions,
reports, status labels, permissions, and dashboard contributions as metadata
where practical (parallels ERPClaw's `UI.yaml`). Bespoke screens remain
allowed for domain-critical workflows; list/detail/form/report scaffolding
should be generated or convention-driven.

## 7. Assistant plus dashboard

Assistant is the fastest path for record creation, lookup, summaries, and
chained workflows. Dashboard is the audit/review/control surface. Every
assistant action has a visible record trail in the dashboard — no action
that only the assistant can see happened.

## 8. The six-step functional contract

`erpclaw-prd/02-functional-requirements.md` §1. Every assistant-driven
workflow follows the same shape: (1) resolve the entities involved from
live reads, (2) validate prerequisites/permissions/domain invariants, (3)
**preview** a high-impact or ambiguous outcome in business language, (4)
execute through one command in one transaction, (5) return a concise
business-readable result, (6) leave an audit trail with the record visible
on its normal detail page. Step 3 is not the same thing as rule 4's
confirmation gate — a preview is "here is what I am about to do, in plain
language, before you've even said yes or no to a specific dialog"; it can
apply to a routine action too, whenever the *outcome* isn't obvious from
the request (e.g. "mark all three overdue invoices as written off" —
routine per rule 4, but the three invoices it resolved to are worth
showing before it acts).

## 9. Error-class taxonomy

`erpclaw-prd/03-data-actions-and-controls.md` §8. The assistant (and,
where it applies, ordinary UI error states) should sort a failure into one
of these classes and respond accordingly, rather than surfacing one
generic error shape for all of them:

| Class | Required behavior |
|---|---|
| Validation | Name the field and the correction needed |
| Missing prerequisite | Link to the setup step that unblocks it |
| Ambiguous entity | List the current candidates, ask the user to choose (rule 2) |
| Permission denied | Explain what's inaccessible without revealing the data behind it |
| Domain-invariant failure (GL/stock/etc.) | Block the commit, show the specific reconciling detail |
| Duplicate operation (e.g. re-billing a period) | Block, offer the link/sync path instead of silently no-op'ing |
| Background-job failure | Stop loudly, record the failure, show a recovery path |
| Network/integration denied | Explain which optional feature needed the network and why it's blocked |
| Confirmation missing | Present the business consequence (rule 4b) and wait |

This is additive to rules 1–7, not a new mechanism — it's the response
shape those rules produce once a failure needs sorting.

**9a. Worked example (user synthesis, 2026-09-03).** A plywood user must
never see a bare `P2010` or similar driver-level code. The domain-invariant
row above means, concretely: not *"cannot dispatch"* but **"This order
cannot be dispatched yet. 18 sheets are still awaiting receipt."** The
class picks the shape of the response; the response still has to say the
specific, current, true thing.

## 10. Assistant rail is a persistent shell region

`erpclaw-prd/01-information-architecture-and-pages.md` §1. Wherever the
assistant surface lives, it sits in the same persistent layer as
navigation and the header — command intake, entity-resolution prompts,
action previews (rule 8 step 3), confirmations (rule 4), and completed
summaries all in one place a user can glance at without it interrupting
whatever screen they're on. Not a modal, not a page it navigates away to.
Settles *where* Task 84's chat surface lives before anyone builds it.

## 11. Onboarding by description, never by inference alone

`erpclaw-prd/04-optional-modules-and-expansion.md` §5. An onboarding flow
may ask "describe your business" and guess an industry/profile from the
answer, but it must show that guess and get explicit confirmation before
applying anything — seeding defaults, suggesting capabilities, or (if
Verity ever has one) installing a capability pack. "I'm a school" may
*suggest* a profile; it must never *become* one unconfirmed. Same
confirmation discipline as rule 4, applied to the one flow where the
system is guessing rather than being told.

## 12. Business-language permissions, not just business-language commands

User synthesis, 2026-09-03 — extends rule 3 to authorization itself. A
permission list reading `VIEW / MANAGE / DELETE` against an entity name is
technically correct and product-weak. Wherever a role's grants are shown
to a human (role editor, "why can't I do this" per rule 13, an approval
screen), render them as the business actions they gate — "View customers",
"Approve credit", "Receive material", "Adjust stock", "Raise invoices" —
never the raw `Verb + Entity` pair. **The authorization model underneath
does not change** — same `Verb + Entity + Scope`, same `authorize()`,
same fail-closed `ForbiddenError`. This is a rendering rule, exactly like
rule 3 is a rendering rule over commands: one more place the internal
vocabulary must not leak into product copy.

## 13. "Why can't I do this" always has an answer

User synthesis, 2026-09-03. A disabled control is not self-explanatory. A
greyed-out "Dispatch" button teaches the user nothing; **"Dispatch
unavailable — 12 units are still awaiting receipt"** teaches them the
business process. Same for a permission gate ("Approve unavailable — you
don't hold the required approval permission," per rule 12's vocabulary)
and a missing-prerequisite gate ("Invoice unavailable — customer GSTIN is
missing"). This is rule 9's error taxonomy applied *before* the user even
attempts the action, at the control itself, not only after a failed
attempt.

## 14. Explainability belongs to every consequential automated action

User synthesis, 2026-09-03. Not an AI-only concern — any automated
consequence (credit hold, auto-generated finance entry, dunning email,
notification) should be able to answer "why did Verity do this" on
demand: **"Invoice was placed on credit hold because outstanding exposure
reached ₹12.4L against a ₹10L limit."** This generalizes rule 9's
domain-invariant-failure shape from *blocking* an action to *explaining*
one Verity already took on the user's behalf.

## 15. Every workflow exposes its next valid actions

User synthesis, 2026-09-03, second round. The positive form of rule 13 —
not just "why can't I," but "what can I do from here," stated without
being asked: `Received → Reserve / Return / Adjust`, `Dispatched →
Confirm delivery / Report loss`. A user should not have to memorize a
capability's own state machine to know what comes next; the state machine
already exists in code (ADR-009 `StateCategory`) — this is displaying it.

## 16. Auditability before automation

User synthesis, 2026-09-03, second round. A stronger, prior form of rule
14: if Verity cannot yet explain a *manual* version of an action clearly
(rule 9's error taxonomy, rule 14's explainability), it must not automate
that action. Explainability is a precondition for automation, not a
feature added after — automating something the system can't yet account
for just moves the trust problem into a place with less scrutiny, not out
of the system entirely.

## Non-goals

- Not a spec for building the assistant itself — see **Task 84**, which
  carries the ADR-first gate and the six implementation areas. This file
  is the rules Task 84 builds against, not the build plan.
- Not retroactive to existing plywood UI, though plywood's current owner/
  business exact-match behavior already satisfies rule 2.
- Not a redesign of the Verb+Entity+Scope authorization model (rule 12)
  or of `command.ts`/`policy.ts` (rules 8–9) — every rule here is a
  presentation-layer requirement over what those already decide.
