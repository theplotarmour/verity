# Verity — Client Readiness

**Date:** 2026-08-27
**Branch:** `feat/adr-012-visual-system`
**Method:** every figure below was produced by running the quoted command on this checkout. A claim
that could not be reproduced is recorded as unreproduced rather than smoothed over.
**Scope:** the platform and its operator console. **No client, industry pack or domain module has
been built, and none was created to produce this report.**

---

## Verdicts

| | Verdict | Basis |
|---|---|---|
| **A — Visual / product readiness** | **YES**, with one deferral | ADR-012 applied; both themes verified live; scroll ownership proven by test; 67 e2e assertions green |
| **B — Platform / HQ readiness** | **YES** | Every administrative surface built on the existing runtime; Workflows A–D walked through the interface with zero SQL |
| **C — Client foundation readiness** | **YES** | Gate 9 proven by a built probe with an empty platform diff, then deleted |

```
A = YES (deferral recorded)
B = YES
C = YES
                ↓
        CLIENT BUILD APPROVED
```

**The gate returns approved.** A client can be created, configured, organized, staffed and audited
entirely through HQ, by a person who never opens a terminal.

What that does **not** authorize: starting a client build. Phase 5 remains locked behind ADR-014
(the DEC-001 conflict Kent's requirements raise) and the provider decisions §8.4 defers until a real
requirement names one.

---

## Evidence

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | clean |
| Lint | `npm run lint` | clean |
| Unit + integration | `npm run test` | **312 passed / 312**, 23 files, **0 skipped** |
| Build | `npm run build` | succeeds, 25 routes |
| End to end | `npx playwright test` | **67 passed**, 19 skipped (the mobile project skips desktop-shell and HQ specs by design), 0 failed |
| Migrations | `npx prisma migrate deploy` | 31 applied, none pending |
| Gate 9 diff | `git diff --stat src/server/platform/ prisma/schema.prisma` (with probe present) | **empty** |

---

## A — Visual / product

ADR-012 is in force: the brand sheet's `#00D1B2` is the default accent, neutrals are the sheet's,
semantic success was retuned away from the accent hue so status and theme cannot read as one
signal, and the mark is monochrome everywhere — favicon, app icon and the lockup, which had painted
the symbol with the accent and so made the identity a function of a theme setting.

Scroll ownership is a tested property rather than a stylesheet detail: the document does not
scroll, the content region does, and the sidebar's navigation region scrolls alone and only when it
must. HQ uses the same shell geometry and the same material system as the tenant experience — one
product, not two — distinguished by a persistent PLATFORM badge, which is D18's "distinguishable in
the UI" made literal.

**Deferred, recorded rather than hidden:** the boards' page composition is applied to HQ but not
retro-fitted to every existing capability page, which still use the same skeleton at lower fidelity.
Dark values are correct and measured, but were reconciled to the brand sheet rather than authored
surface by surface as D8 describes. Neither blocks a client build; both are cosmetic debt.

---

## B — Platform / HQ

**ADR-013 is ACCEPTED and implemented** — Option D with identity Shape 1. No role gained
`BYPASSRLS`, no policy was weakened, `resolve_permissions` still filters `Global` grants out, and
the entire cross-tenant surface remains the three read-only projections the ADR enumerates.

### Surfaces, all built

| Surface | What an operator can do |
|---|---|
| Overview | Counted clients, people, changes and security events across the platform |
| Clients | List, create, open for administration, enter as a tenant user |
| Client overview | Counts per surface, and a "where to start" path that names what is missing |
| People | Search, invite (provisions the identity), assign or clear a role, suspend, restore, revoke |
| Roles | Create, grant, revoke, compose, and see **direct** grants beside the **resolved** set |
| Organizations | Create, rename, re-parent, inspect the hierarchy |
| Modules | Enable and disable per client, with dependency refusals surfaced |
| Operations | Undelivered events, SLA clocks, breaches, sync exceptions, recent changes, security events, provider binding status |
| Client settings | Tenant-scoped configuration, with narrower scopes shown read-only |
| Platform audit | Cross-client metadata with privileged actions marked |
| Platform settings | Platform tenant record, operator roster, installed capabilities — read-only, because nothing here has a write path that exists |

### How they are built

Every mutation is a registered command executed through `executeCommand`; every list is a
registered query through `executeQuery`. No page touches Prisma, none constructs an actor, and none
decides authorization. The operator's authority inside a client is an ordinary membership with an
ordinary role, so the same resolver that refuses a tenant user refuses an operator who lacks a
grant — there is no `if (isOperator)` in the administration path.

`src/server/platform/administration.ts` holds the twelve commands and six queries. It is not a
capability: capabilities model business behaviour, while these administer the platform's own
primitives, and putting them behind a capability activation switch would be backwards — HQ is how
capabilities get turned on.

### Workflows — walked through the interface, zero SQL

`e2e/hq.spec.ts`, all passing:

| | Workflow | Evidence |
|---|---|---|
| **A** | create client → enable module → create organization → create role → grant permission → invite person → assign role | Passes. Every step is a click; nothing is seeded |
| **B** | operator opens a client → people → organizations → roles → performs a permitted operation → the action appears in the platform audit marked **Operator** | Passes |
| **C** | create two clients → a person exists only in the first → open the second → that person is not there | Passes. Not because a filter excludes them: the query runs inside one tenant scope and the other client's rows are unreachable from it |
| **D** | an unauthenticated visitor cannot reach HQ; an operator whose active context is a client cannot either | Passes. Operator authority is not ambient |

`src/test/hq-administration.test.ts` asserts the same properties at the runtime level — 16
assertions, weighted toward refusals: an ordinary tenant user is refused every administrative
command **and** every administrative read, a self-composing role is refused, a duplicate grant is
refused, an organization cannot be moved inside its own subtree, and an operator cannot revoke their
own membership.

### The audit-marker mismatch, fixed rather than redefined

The previous implementation reported `is_operator` when the actor held platform-tenant membership
**anywhere**, so a person's historical tenant-user actions were retroactively relabelled privileged
the moment they became an operator. ADR-013 answer 12 asks a narrower question, and the fix answers
that one: an action was taken with operator authority when the actor's membership **in that client**
carries the operator role. No schema change; migration
`20260827020000_operator_audit_marker`.

### Known behaviour worth stating

Administering a client grants the operator a membership in it (ADR-013's "authority to enter"), so
an operator's own context switcher grows as they work. That is the mechanism functioning, not a
leak — the switcher lists memberships the person genuinely holds — but it means the default context
after sign-in is whichever tenant sorts first when no choice is stored. The e2e fixture now pins its
context explicitly rather than depending on that ordering.

---

## C — Client foundation

Unchanged and still proven. A throwaway capability exercised every contribution point — entity, own
storage with its own RLS policy, commands, query, five states across every `StateCategory`, a
per-edge transition guard, a `before_save` hook whose refusal rolled the whole command back, tenant
configuration, custom fields, events, audit, SLA clocks, a notification, a declared schedule, and a
UI route — and the measurement taken with it present was:

```
git diff --stat src/server/platform/ prisma/schema.prisma   →   empty
```

Ten assertions passed. The probe was then deleted in full: code, route, tests, registry line, and a
migration dropping the table and every registration row. Evidence is commit `c7c5c3f`; removal is
`68e8b83`.

---

## Outstanding — none of it blocks the gate

| # | Item | Nature |
|---|---|---|
| 1 | Phase 0.10 deployment verification | **Blocked on infrastructure:** `vercel deploy` returns `Not authorized`; the CLI session needs a human login. Deployment configuration, not architecture |
| 2 | `DIRECT_URL` in the Vercel Preview environment | **Security.** It carries the `postgres` role, which has `rolbypassrls = true`. Runtime never needs it — only `prisma migrate` does. Remove it from Preview |
| 3 | Demo removal and the real bootstrap admin (D21) | `prisma/bootstrap-operator.ts` exists; `seed.ts` still carries the demo credential |
| 4 | QO-2 (what "suspend client" does), QO-4 (production credential owner) | Product decisions, still open |
| 5 | Board composition on capability pages; per-surface dark authoring | Cosmetic debt (verdict A deferral) |
| 6 | Provider bindings — storage, job runner, notification transport | Deliberately unbound. A provider chosen without a requirement is a guess encoded into the foundation |

---

## What happens next

The correct next action is **not** "what should we build next?"

It is: *here is a real operational requirement — build it as a capability on the existing Verity
foundation, and do not modify platform primitives unless you can prove the requirement cannot be
satisfied through existing contracts.*

The foundation is proven, the operator layer above it is built and usable, and both are bound to
tests that fail if they stop holding. Verity is waiting for a requirement.
