# Task 95 — Verity AI: long-term vision (aspirational, phased)

Authority: User synthesis, 2026-09-03, second round, in full. Subordinate
to `taskplans/84_verity_ai_agent_system.md` — same ADR gate, same
"agent authenticates as the calling human, never elevated" constitutional
rule, none of that is re-litigated here.

## Status: PENDING — aspirational north star, not a build plan. Recorded
in full so it isn't lost; not a commitment to build any of it.

This is the "Jarvis-level" version of Task 84's assistant, recorded
because it's a coherent, well-thought-through vision worth keeping, not
because any of it is scheduled. Nothing here is implementable before
Task 84's ADR exists, and most of it is not implementable before Task
84's six near-term areas are actually built and proven. Treat every
section below as a **direction**, not a spec — nothing in this file
authorizes design decisions Task 84 hasn't already gated, let alone code.

## The core framing

Not "add a chatbot." An operating-intelligence layer: understands the
business, knows the user's actual authority (Task 84's non-negotiable),
reasons over live records, executes real work, and becomes — gradually,
provably, one phase at a time — the interface through which people run
the system. "Jarvis for Indian businesses," not a humanoid assistant.

## The one architectural rule that governs everything below

The AI is never a second backend. It sits on top of the existing
platform and uses exactly the same path a human does: `ActorContext →
authorize()/enforcePolicy() → command/query → state → audit`. Every
capability below is a *consumer* of that path, never a bypass of it —
this is Task 84's ADR, restated as the ceiling on everything in this
file, not a new decision.

## Identity model

Five conceptual identities per request, all collapsing onto the one real
`ActorContext` already in `command.ts` — this is vocabulary for
reasoning about the system, not five new database concepts:

- **User** — the human.
- **Actor** — their real Verity `ActorContext` (tenant, membership, role).
- **Agent** — the AI, acting on behalf of that Actor, never on its own.
- **Tenant** — the business context.
- **Capability** — the domain it's currently operating inside.

## Seven layers (conceptual, not a mandated module boundary)

Conversation → Context (who/role/org/tenant/screen/selected record/recent
actions/time) → Business Graph → Reasoning → Tools (every command/query
becomes one, per Task 84 area 1) → Action Engine (`executeCommand`, per
Task 84 area 2) → Memory (see "Memory model" below — deliberately not a
chat-history dump).

## The business graph

The differentiator from "prompt an LLM and hope": relationships between
customers, suppliers, products, orders, payments, invoices, locations,
tasks, approvals, documents, traversed to ground an answer in live
records rather than generated from a text search. Example shape: a
margin question traverses `Customer → Sales Order → Selling Price →
Product → Purchase Cost → Transport → Discount → Payment → Margin` and
answers with actual numbers, not a plausible-sounding guess.

## Business language, India-first

Users won't speak database language, and for a lot of Verity's actual
market, won't default to English either. Concrete requirement: understand
Hindi, Hinglish, and regional-language business shorthand — *"Ram wale
customer ka kitna paisa pending hai?"* — without translating to English
first and losing meaning in the process. A semantic vocabulary layer
resolves domain terms by context (`"party"` → customer or supplier
depending on what's being asked; `"jama"` → payment or collection
depending on capability) rather than a fixed dictionary. Indian business
vocabulary (GST/CGST/SGST/IGST/HSN/SAC/GSTIN/TDS/TCS/UPI/NEFT/RTGS/e-way
bill/LR/challan) are first-class business concepts the system understands,
not prompt-engineering examples.

## Per-role behavior, same AI

Owner, sales manager, accountant, warehouse manager, and worker asking
the same style of question ("what needs my attention") get different
answers — not because the AI has different personalities, but because
each answer is filtered through that Actor's actual scope and role, the
same way every other Verity screen already differs per role. This is Task
81 rule 12 (business-language permissions) and the existing
Verb+Entity+Scope model, not a new personalization system.

## Proactive behavior

A "morning brief," different per role (owner gets a business brief;
sales gets a call list; finance gets collections/GST exceptions;
warehouse gets expected receipts) — generated from the same Attention
concept as **Task 90**, not a separate mechanism. This is Task 90's
consumer, not a reason to build a second exceptions engine.

## Plans before execution

For a multi-step request, the AI proposes a plan — "I'll create 14
orders, reserve 320 sheets, and put 2 customers on credit hold" — and the
human reviews/approves before anything executes through normal commands.
This is Task 84 area 2 (confirmation class) and Task 91 (bulk/partial
failure) combined at conversation scale, not a new execution model.

## The "why" layer

Every AI answer traces to the records that produced it — "ABC is flagged
because: ₹8.4L outstanding, ₹2.1L overdue, credit limit ₹7L, last
payment 19 days ago — source: 4 invoices, 3 payments, 1 credit-limit
record." This is Task 81 rule 14 (explainability), applied to AI-produced
claims specifically.

## Hard distinction against hallucination

Four labels on every AI-stated fact: **Known** (retrieved directly),
**Calculated** (derived from known records), **Inferred** (AI reasoning
over known facts, labeled as such), **Unknown** (Verity doesn't have
enough information — say so, don't invent a plausible-sounding reason).
Directly enforces Task 81 rule 1 (live-record grounding) and Task 84 area
4 (grounding enforcement) at the level of individual stated facts, not
just tool calls.

## Documents, voice, camera — inputs

Long-term multimodal input: understanding uploaded invoices/contracts/PDFs
(documents become part of the business graph, queryable — "find the
payment terms in the ABC contract"), voice input for hands-busy warehouse
work, and camera input (photograph an invoice → extracted and checked
against the catalogue; photograph damaged stock → recorded as evidence
against an order). Each of these is its own, much later, phase — see
roadmap below.

## WhatsApp as a surface

Given the target market, a WhatsApp-based interface (query balances, get
a top-N list, send a customer a drafted message for approval before it
sends) is a plausible high-leverage channel, not a gimmick — but a
channel, not a new authority model; every action through it still goes
through the same Task 84 pipeline as the in-app chat.

## Learned business patterns (not personal data)

Statistical observations about the business itself — "ABC usually pays
within 32 days," "this supplier normally delivers 2 days late" — kept
distinct from personal/chat memory (see below). This is a genuinely new
kind of derived data Verity doesn't have a home for yet; needs its own
design pass when it's actually in scope, not before.

## Memory model — four kinds, not one bucket

Conversation memory (temporary), business memory (structured facts, i.e.
what's already in Verity's own tables — not a duplicate store), learned
patterns (the statistical layer above), and user preferences ("show
amounts in lakhs," "keep it concise"). Naming these separately now is
meant to prevent the common failure mode of stuffing all of them into one
vector store and calling it "memory" — a decision for whenever memory
is actually built, not a spec for it yet.

## Everything AI does is a Job

Not "AI did something" as an opaque log line — `Request → Plan →
Approval → Job → Commands → Results → Audit`, with the job visibly
running/inspectable/cancelable, and the human free to leave while it
completes. This is Task 91 (bulk/partial-failure) generalized to
long-running, possibly-unattended work.

## Exception detection as a standing capability

Duplicate invoices/customers, unusual prices/discounts, negative margins,
excessive credit, unexpected stock movements, duplicate payments, missing
required fields, suspicious changes — surfaced continuously, not only
when asked. Overlaps heavily with Task 90 (Attention) and Task 88
(reconciliation) — likely the same underlying mechanism wearing three
names, worth reconciling into one when any of the three is actually
designed rather than building three.

## An AI control centre

An operator-facing view of what the AI is doing right now across the
tenant: active jobs, recommendations, anomalies, pending approvals, and
— critically — an inspectable record of *which actor's authority* each
action ran under, which records it touched, which commands it issued,
and what it was blocked from doing. This is what makes an "agent that can
act" something an owner can actually trust, and it's a natural extension
of Task 84's audit-parity area (area 5) and the existing correlation-ID
audit trail (Task 38), not a new logging system.

## Detailed, operational-provenance audit

Not chain-of-thought — the actual decision trail: which human, which
`ActorContext`, which tools were queried, which command ran, whether
authorization passed, whether confirmation was required and given, and
the result. Already largely what `command.ts`'s existing
`correlationId`/domain-event trail produces; this section is a
requirement that the AI-specific UI surfaces it legibly, not a new data
model.

## Capability manifest — automatic AI-readiness

Every Verity capability already declares commands, queries, permissions,
states, and events. The claim worth keeping: if Task 84 area 1's tool
generator is built correctly, **every new capability becomes AI-capable
automatically**, with zero AI-specific work per capability. This is the
single strongest architectural argument for building Task 84's six areas
as thin, generic layers over the existing registries rather than
capability-aware special cases.

## Screen and record context

If the user is looking at `/customers/ABC` and asks "why hasn't he
paid," the AI already knows which customer, tenant, and capability are in
play — it should not re-ask. A concrete, buildable requirement once the
chat surface (Task 84 area 6) exists: thread current-route/selected-record
context into the same turn as the tool-call context.

## Two "killer feature" framings worth keeping verbatim

**"Explain my business to me"** — a new owner gets a synthesized
narrative (godown count, active customers/suppliers, revenue
concentration, largest cost driver, current bottleneck, outstanding and
overdue totals, and a short focus list) instead of an empty dashboard.
**"What should I do today?"** — a ranked, actionable priority list
instead of a KPI grid. Both are Task 90 (Attention) plus Task 92
(business timeline) plus the business graph, composed — not new data,
a new way of presenting data Verity already has once those exist.

## The six-phase roadmap, as given

1. **Grounded Ask** — chat + `ActorContext` + queries + permission
   filtering + citations. Answers questions Verity already knows.
   Roughly Task 84 areas 1, 3, 5.
2. **Safe Actions** — commands + tool manifest + routine/destructive
   classification + confirmation + audit. Task 84 areas 2, 4, 6.
3. **Business Reasoning** — business graph, multi-step reasoning, derived
   metrics, exception detection, plans. Depends on Tasks 88/90/92 existing
   in some form.
4. **Proactive AI** — events, schedules, anomaly detection, morning
   brief, attention engine. Depends on Task 90 directly.
5. **Multimodal India** — voice, Hindi/Hinglish, documents, images,
   WhatsApp.
6. **Autonomous Operations, strictly bounded** —
   `Observe → Understand → Recommend → Preview → Approve → Execute →
   Verify → Audit`, with routine low-risk actions eventually running
   within explicitly granted authority. This phase is the one most likely
   to need its own, later ADR beyond Task 84's — "explicitly granted
   authority" for unattended execution is a materially different question
   than "the agent acts as the human in the same turn," and should not be
   assumed to fall under Task 84's existing gate without a fresh decision.

## Non-goals

- Not a build plan. Every phase above needs its own scoping pass, at the
  time it's actually picked up, against whatever Verity looks like then.
- Not an argument for building ahead of the near-term six areas in Task
  84 — this file's entire premise is "worth remembering," not "worth
  starting."
- Phase 6 specifically is not covered by Task 84's ADR and should not be
  treated as pre-authorized by it.
