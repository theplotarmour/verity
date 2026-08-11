# PRD 02 — AI Assistant

**Phase A · Depends on PRD 00 for the module manifest**

## Problem

The commercial wedge is not the software. Odoo's licence is expensive; Odoo's
*implementation* is ₹5–20L and takes months. If Verity ships the same
configuration burden with a cheaper licence, it competes on price alone, which
is the weakest position available.

The assistant is the wedge. It has to do the work a ₹5L implementation partner
does: understand the business, pick the modules, seed the templates, and answer
"how do I do X" for the next six months.

## What makes this hard, stated up front

An assistant that invents a field name is worse than no assistant. A user who
is told to "open Settings → Recipes" when no such screen exists learns within a
day that the assistant guesses, and then never uses it again — and by then it is
in the price list.

So the single design constraint that matters: **the model is never asked to
recall Verity's structure.** Every response is grounded in a manifest and a
schema passed in the request. This is why PRD 00 comes first — the manifest is
the grounding.

## Goals

1. Onboarding: a conversation that ends with the right modules active and
   sensible defaults seeded, without a human implementer.
2. In-context help that answers from *this tenant's* configuration, not from
   generic documentation.
3. Proactive anomalies: surface the thing nobody thought to look at.

## Non-goals

- **Writing data unattended.** The assistant proposes; a human confirms. See R4.
- **Replacing the guide.** `GUIDE.md` stays the source of truth; the assistant
  cites it rather than paraphrasing it.
- **Fine-tuning.** Prompt plus grounding. A fine-tune on four verticals' worth of
  data would overfit and would need redoing every time a module ships.

## Requirements

### R1 — Grounding context
Every request carries, built server-side:

- the tenant's active module manifests (keys, names, permissions);
- the tenant's pack and dashboard;
- the current route and the models it reads;
- for schema questions, the relevant model's field names and enum values,
  generated from `schema.prisma` rather than hand-maintained.

The enum point is not cosmetic. `ScheduleStatus` is `SCHEDULED / ATTENDED /
ABSENT / SWAPPED / CANCELLED` — a model asked to guess would say "COMPLETED",
which is exactly the wrong answer and looks exactly like a right one. (It is
also the mistake a human made in this codebase, and a test caught it.)

**Acceptance:** a test asserts the generated context for a tenant contains only
their active modules, and that enum values in the context match the Prisma
schema exactly.

### R2 — Model routing
- Operational, latency-sensitive (field hints, "what does this status mean")
  → `llama-3.1-8b-instant`.
- Analytical (report building, anomaly explanation) → a larger Groq-hosted model.

Routing is by task type, decided server-side, never by the client.

**Note on the architecture's model choices:** it names `llama3-8b-8192` and
`mixtral-8x7b-32768`. Both are deprecated on Groq. Pin current model IDs in one
constant and treat them as configuration — they change faster than this document
will be revised.

### R3 — Read-only tools, tenant-scoped
The assistant may call a fixed set of server-side tools: today's attendance,
open POs, outlet scores, overdue invoices. Every tool derives `factoryId` from
the session — **never** from a model-supplied argument.

This is the same rule the ingest endpoint follows, and for the same reason: a
tenant id that arrives as a parameter is a parameter an attacker can set. Here
the attacker's input is the prompt, and prompt injection is a solved-in-theory,
unsolved-in-practice problem. The mitigation is that the model cannot express
the request.

**Acceptance:** a test asserts no tool signature accepts a tenant identifier,
mirroring the existing `integrations.ts` guard in `tenant-isolation.test.ts`.

### R4 — Proposals, not writes
Configuration changes are proposed as a diff the user approves. "I'll enable
Inventory and Procurement and create three checklist templates — apply?"

Approval executes the *existing* server actions with the *user's* session and
permissions. The assistant gets no privileged path. A user who cannot create a
checklist cannot obtain one by asking nicely.

**Acceptance:** a test asserts a proposal executed by a SUPERVISOR fails the
same permission check a direct call would.

### R5 — Onboarding wizard
A conversation collecting: what the business does, how many locations, what they
track today. Output is a module recommendation with reasons, mapped to a pack
where one fits, plus seed templates.

It must be able to say "none of the four packs fit; here is an à la carte set" —
forcing a poor pack fit is worse than admitting the gap, and the gap is the
research input for the next vertical.

### R6 — Anomaly surfacing
A scheduled job runs a fixed set of checks — an outlet missing consecutive
opening SOPs, a supplier price above the network median, an SLA-breach spike —
and writes a `Notification`. The model *explains* the anomaly; it does not
*detect* it. Detection is SQL, deterministic and testable. An LLM asked to find
anomalies in a table will find them whether or not they exist.

### R7 — Cost and abuse control
Per-tenant monthly token budget, enforced server-side, surfaced in HQ. Without
it a single tenant's chat loop is an unbounded cost against a ₹2,500/month
platform fee — and on a trial, against ₹0.

Trials get a tighter budget than paying tenants for exactly that reason: a
7-day no-card signup is an unauthenticated stranger with an inference budget.

**Acceptance:** a tenant at their cap gets a clear message, not a failure.

### R8 — Trial conversion nudge
On day 5 of a 7-day trial the assistant raises activating billing, in the
conversation rather than as a banner.

It must be **specific and true**: what the tenant has actually configured, what
their pack would cost including their team bracket, and what happens on day 8.
A generic "your trial is ending" is a banner with extra steps; "you have 14
outlets and 3 users, Franchise QSR OS is ₹19,999 plus nothing for team size at
your headcount, and on Sunday this becomes read-only" is a decision.

Day 5 rather than day 7 is deliberate — see PRD 01. A trial ending tomorrow
forces a decision under pressure, and that decision is usually "not now".

**Acceptance:** the nudge quotes a price computed by `monthlyTotal()`, not a
hardcoded figure; a test asserts the quoted number equals the function's output
for that tenant's pack and bracket.

### R9 — Read-only awareness
On a `TRIAL_EXPIRED` or `READ_ONLY` subscription, the assistant stays available
for questions and explicitly cannot propose writes. Asked to do something that
writes, it says why and how to restore access.

An assistant that offers to fix something it cannot fix is worse than one that
declines — the user follows the suggestion, it fails, and now they distrust both
the assistant and the product. The proposal path in R4 executes real actions
with the user's session, so it inherits the server-side write guard
automatically; this requirement is about not *offering*.

**Acceptance:** with a read-only subscription, a proposal that writes is refused
before execution with a message naming the subscription state.

## Risks

| Risk | Mitigation |
|---|---|
| Hallucinated fields or screens | R1 grounding; never ask the model to recall structure |
| Prompt injection into tool calls | R3: tools cannot express another tenant |
| Assistant becomes a privilege-escalation path | R4: user's own session and permissions |
| Runaway inference cost | R7 budget per tenant, tighter on trials |
| Free trials farmed for inference | R7 trial budget; a no-card signup is a stranger with a token allowance |
| Deprecated model IDs | Pinned in one constant, treated as config |
| The nudge quotes a stale price | R8 computes it with `monthlyTotal()`; never hardcoded |
| Assistant offers what a read-only tenant cannot do | R9 refuses before proposing, naming the state |
| Users trust a confident wrong answer | Cite the guide section; link rather than paraphrase |

## Success criteria

- A new tenant reaches a working configuration without an implementer.
- The assistant never names a field, screen or enum value that does not exist —
  asserted by a test that runs its context builder against the live schema.
- No assistant action succeeds that the asking user could not perform directly.
