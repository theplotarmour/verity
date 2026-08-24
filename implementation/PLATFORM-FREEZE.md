# PLATFORM FREEZE

**Effective:** 2026-08-24
**Applies to:** every agent and engineer working in this repository — Claude Code, Codex,
Fable, and humans alike.
**Read this before proposing any change to `src/server/platform/`, `prisma/schema.prisma`,
or the application shell.**

---

## The rule

> **The Verity foundation is frozen at this milestone. No platform change may be made unless a
> real client requirement demonstrates that the existing foundation cannot support it.**

Not "would be cleaner with". Not "a future client might need". **Cannot support.**

---

## What is true at the freeze

- The foundation is proven: tenant isolation, RLS enforcement on the runtime role, organization
  scoping, row- and field-level authorization, command authorization, audit immutability and
  cross-tenant rejection are each bound to an executable assertion that fails if the property
  stops holding. Evidence: [`final-platform-readiness.md`](final-platform-readiness.md).
- **No client, industry pack or domain module exists.** The five capabilities in
  `src/server/capabilities/` — Location, Asset, Evidence, Scheduling, Approval — are shared
  platform-proving capabilities, not a product for anyone.
- A capability can contribute entities, commands, queries, states, StateCategory mappings,
  permissions, configuration, events, audit behaviour, SLA behaviour, **scheduled work**,
  evidence, notifications, UI and navigation **without modifying platform internals**.
- Provider bindings are **intentionally deferred**: no scheduler provider, no storage driver, no
  notification transport. Each contract is complete and tested; none is wired to a vendor.

---

## Why the bindings are deferred rather than missing

A contract with no provider is a decision that has been *made*. A provider chosen with no
requirement is a decision that has been *guessed*.

No authority names a scheduler, a storage vendor or a transport. Binding one now would encode a
guess into the foundation and make it expensive to unpick later — and the first real requirement
is the only thing that can tell us which to pick, in what order, and whether the contract's
vocabulary is even right.

**If you find yourself binding a provider without a requirement in hand, stop.**

---

## What must NOT be built

Not because they are bad ideas — because nothing has asked for them:

- a generic scheduler
- a generic storage implementation
- a generic notification transport
- more abstract workflow machinery
- hypothetical industry modules
- a fake or demonstration client capability
- any customer-specific module: Guard Patrol, Facilities, Staffing, CRM, ERP, Security
  Operations, Professional Services, Commerce, or anything like them

Building any of these before a requirement exists is the failure mode this document is here to
prevent.

---

## The constitutional principle this protects

> **Standardize the foundation, not every behavior.**
>
> Prefer **purpose-built implementation** where specialization materially improves workflow
> depth, performance, reliability, usability, or domain correctness.
>
> Prefer **configuration** only where variation genuinely belongs at tenant or client level
> without compromising those qualities.

Both halves matter, and the second is the one most often got wrong.

**Purpose-built capability code is encouraged.** A capability may own real typed columns, its own
tables, hard-coded domain rules, a bespoke screen and specialised performance work. Scheduling
needs a time grid and Approval needs a queue; forcing both through one generic renderer would
trade real usability for uniformity nobody asked for.

**Configuration is not a virtue.** If every future capability is pushed through generic metadata
because that feels more "platform-like", Verity becomes an infinitely configurable ERP — which is
the specific outcome this architecture exists to avoid. Genericity is a cost, paid for a reason,
not a default.

---

## The decision path for the next requirement

```
CLIENT REQUIREMENT
       │
       ▼
Can existing Verity primitives support it?
       │
   YES ├──────────────────────────────────► Build the capability. Stop here.
       │
    NO ▼
Is the missing behaviour:
   • capability-specific?      ──► build it inside the capability
   • a reusable capability?    ──► build a new shared capability
   • a genuine platform primitive?
       │
       ▼
Smallest possible foundation extension — additive, contract-shaped,
justified in writing by the requirement that forced it
       │
       ▼
Build the capability
```

Most requirements terminate at the first branch. That is the design working, not a shortcut.

---

## Every future platform change must state its cause

A change to `src/server/platform/`, to the platform tables in `prisma/schema.prisma`, or to the
shell's internals must name, in its commit message:

1. **The concrete capability or client requirement that necessitated it.** Not a category —
   the actual requirement.
2. **Why it could not be satisfied through existing contracts.** Specifically which contract was
   tried and what it could not express.
3. **Why it belongs at platform level** rather than inside the capability that wanted it.

A change that cannot answer all three is over-engineering wearing a commit message. Reviewers
should reject it, and agents should refuse to write it.

---

## Adding a capability does not break the freeze

For clarity, since this is where the line is most often misread. These are **expected and
additive**, not platform changes:

- a new file under `src/server/capabilities/<name>/`
- new tables in `prisma/schema.prisma` and a migration for them
- one registration line in `src/server/capabilities/registry.ts`
- new `StateDefinition`, `Permission` and `ConfigParameter` rows (these are data)
- new routes under `src/app/(shell)/`
- a `registerContribution({ navigation, workspace, schedules })` call

None of that touches tenancy, authorization, the state runtime, the command runtime, the audit
runtime, or the shell's internals. If your capability *does* need to touch one of those, that is
the signal to stop and apply the decision path above.

---

## Hand-off

The correct next action is **not** "what should we build next?"

It is: *here is a real operational requirement — build it as a capability on the existing Verity
foundation, and do not modify platform primitives unless you can prove the requirement cannot be
satisfied through existing contracts.*

Verity is finished as infrastructure. It is now waiting for a requirement.
