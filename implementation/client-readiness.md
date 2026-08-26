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
| **A — Visual / product readiness** | **YES, with one deferral** | ADR-012 applied; both themes verified live; scroll ownership proven by test; 63 e2e assertions green |
| **B — Platform / HQ readiness** | **PARTIAL — NO** | Operator security model accepted and built; clients can be created and entered with no SQL; **people, roles and organizations still have no HQ screen** |
| **C — Client foundation readiness** | **YES** | Gate 9 proven by a built probe with an empty platform diff, then deleted |

```
A = YES (deferral recorded)
B = NO
C = YES
        ↓
CLIENT BUILD: NOT YET APPROVED
```

**One verdict blocks the gate, and it is the honest one to block on.** A client cannot be onboarded
end to end today because nobody can be invited or given a role through HQ. Everything the client
build depends on *structurally* — isolation, authorization, the runtime, the operator boundary,
capability composition — is proven.

---

## Evidence

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | clean |
| Unit + integration | `npm run test` | **296 passed / 296**, 22 files, **0 skipped** |
| Build | `npm run build` | succeeds, 18 routes |
| End to end | `npx playwright test` | **63 passed**, 15 skipped (mobile project skips the desktop-shell specs by design) |
| Migrations | `npx prisma migrate deploy` | 28 applied, none pending |
| Gate 9 diff | `git diff --stat src/server/platform/ prisma/schema.prisma` (with probe present) | **empty** |

---

## A — Visual / product

**Done.** ADR-012 is in force: the brand sheet's `#00D1B2` is the default accent, neutrals are the
sheet's, semantic success was retuned away from the accent hue so status and theme cannot read as
one signal, and the mark is monochrome everywhere — including the favicon, the app icon and the
lockup, which had painted the symbol with the accent and so made the identity a function of a theme
setting.

Scroll ownership is now a property with a test rather than a stylesheet detail: the document does
not scroll, the content region does, and the sidebar's navigation region scrolls alone and only when
it must. Three new assertions in `e2e/responsive.spec.ts` cover the case that decides it — a short
viewport with the header and account card still fixed.

Verified live in both themes at the running application, not only in the boards.

**Deferred, recorded rather than hidden:** the boards' page composition (stat row, wide panel,
filter bar, paginated dense table) is applied to HQ but not retro-fitted to every existing
capability page, which still use the same skeleton at lower fidelity. Dark values are correct and
measured, but were reconciled to the brand sheet rather than authored surface by surface as D8
describes. Neither blocks a client build; both are cosmetic debt with a named owner.

---

## B — Platform / HQ

**ADR-013 is ACCEPTED** — Option D with identity Shape 1. The decisive finding: of the seven things
HQ must do, only three genuinely cross tenants, and those need metadata and counts rather than
client rows. The other four need the *authority to enter* a tenant and then ordinary scoped
operation.

**What that bought.** There is no cross-tenant write path at all. No role gained `BYPASSRLS`, no
policy was weakened, and `resolve_permissions` still filters `Global` grants out — operator
authority is an ordinary membership with ordinary permissions, so the resolver is untouched. The
entire cross-tenant surface is three read-only `SECURITY DEFINER` projections, each with a pinned
`search_path`, a fixed column set and an invocation log.

**Built and working:**

| Surface | State |
|---|---|
| Operator authority, fail-closed | Built. Five assertions in `operator-boundary.test.ts` |
| HQ shell with a persistent PLATFORM badge (D18) | Built |
| Platform overview — counted, no invented metrics | Built |
| Clients — list, create, enter | Built. A client was created through the UI with **zero SQL** |
| Platform audit with operator actions distinguished | Built |

**Not built, and this is what makes B a NO:**

| Missing | Consequence |
|---|---|
| People — invite, assign role, revoke | `provisionIdentity()` is built and tested; nothing calls it from HQ. Workflow A cannot complete |
| Roles and permissions — create, compose, view resolved set | Changing access still means SQL |
| Organizations — create, re-parent, inspect | The hierarchy scoping depends on can only be seeded |
| Modules — enable/disable per client | Activation exists; no screen |
| Operations, platform settings | Not started |
| Suspend / activate a client (QO-2) | Not built; the decision is still open |

**Workflows, honestly scored:** A (onboarding) — **partial**, create client and operator access work,
invite and role assignment do not exist. B (inspection) — **partial**, an operator can enter a client
and read it. C (switching integrity) — **structurally guaranteed**: no query spans two tenants, so
there is no path along which one client's rows reach another's result; the *screens* to walk it end
to end are not all there. D (privilege boundary) — **proven**, both at the database level and in
`requireOperator()`, which records a security event rather than silently refusing.

**One nuance worth recording rather than leaving to be discovered.** The platform audit marks a row
as operator-originated when the actor *holds* operator authority, not when they *acted* as an
operator. For the bootstrapped installation that means historical tenant-user actions by the same
person now read as operator actions. It over-reports rather than under-reports, which is the safer
direction, but it is not exactly what ADR-013 answer 12 describes and should be tightened before a
real client relies on that column.

---

## C — Client foundation

**Gate 9 is proven, by building.** A throwaway capability exercised every contribution point —
entity, own storage with its own RLS policy, commands, query, five states across every
`StateCategory`, a per-edge transition guard, a `before_save` hook whose refusal rolled the whole
command back, tenant configuration, custom fields validated against the tenant's declarations,
events, audit, SLA clocks, a notification, a declared schedule run under an ordinary tenant scope,
contributed navigation and a UI route.

The measurement, taken with the probe present:

```
git diff --stat src/server/platform/ prisma/schema.prisma   →   empty
```

Nothing in the platform changed to make it possible. Registration was one line in the capability
registry, which `PLATFORM-FREEZE.md` names explicitly as additive rather than a platform change. The
probe owned its table through raw SQL rather than a Prisma model, so the proof stays strict rather
than becoming "no change except the change".

Ten assertions passed. The probe was then **deleted in full** — code, route, tests, registry line,
and a migration dropping the table and every registration row — because PLATFORM-FREEZE forbids a
demonstration capability surviving. The evidence is commit `c7c5c3f`; the removal is `68e8b83`.

One thing the probe corrected: a first draft assumed a `Pending` state starts the SLA clock. It does
not. Waiting for someone to pick work up is not the same as being late with it, and the substrate
had it right.

---

## Outstanding, in the order it blocks things

| # | Item | Blocks |
|---|---|---|
| 1 | HQ People, Roles, Organizations | **Verdict B.** Workflow A cannot complete without them |
| 2 | Phase 0.10 deployment verification | Deployment evidence. **Blocked on infrastructure:** `vercel deploy` returns `Not authorized` — the CLI session has expired and needs a human login |
| 3 | `DIRECT_URL` in the Vercel Preview environment | **Security.** It carries the `postgres` role, which has `rolbypassrls = true`. A credential that bypasses row-level security has no place in a deployed environment; runtime never needs it, only `prisma migrate` does |
| 4 | Demo removal and the real bootstrap admin (D21) | Production readiness. `prisma/bootstrap-operator.ts` exists; `seed.ts` still carries the demo credential |
| 5 | QO-2 (what "suspend client" does), QO-4 (production credential owner) | HQ client lifecycle, deployment |
| 6 | Operator audit marker precision | Audit fidelity, before a client relies on it |
| 7 | Board composition on capability pages; per-surface dark authoring | Cosmetic debt (verdict A deferral) |

---

## What a developer may and may not do today

**May not:** start a client build. The gate has not returned CLIENT BUILD APPROVED.

**May, safely:** finish HQ's remaining administrative screens using the same contracts the built ones
use — `runCommand`, `provisionIdentity`, `resolvePermissions`, `withTenant` — because the operator
model those screens sit on is decided, built, and bound to tests that fail if it stops holding.

The foundation underneath is not in question. What is missing is the operator layer above it, and
the missing part is screens over contracts that already exist and are already proven.
