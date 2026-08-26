# ADR-013 — Global HQ Operator Security Model

## PROPOSAL FOR REVIEW — NOT A DECISION

**Date:** 2026-08-26
**Status:** **PROPOSED — awaiting product-owner selection.** No mechanism has been chosen.
**Authorization:** none. No cross-tenant code exists or may be written until this is approved and
the ADR is finalized as `verity-spec/17_decisions/adr/adr-013.md`.

Per QB-3 the option comparison is presented **before** a mechanism is selected. Per QB-4 the
operator identity question is compared rather than assumed.

---

## 1. The problem, stated exactly

INV-001 requires strict tenancy isolation. It is enforced by PostgreSQL RLS: `withTenant()` sets
`verity.tenant_id` transaction-locally via `set_config`, every policy reads it, and with no scope
set queries return nothing and writes are rejected. The runtime role `verity_app` is
`NOSUPERUSER NOBYPASSRLS` — **verified 2026-08-26** — so it genuinely cannot see past a policy.

`verity.resolve_permissions` **deliberately filters `Global`-scoped grants out**. `CLAUDE.md`
records why: PLA-AUT-002 defines cross-tenant platform administration, but honouring it means
bypassing the RLS that enforces INV-001, so a `Global` row may exist without silently taking
effect.

**Consequently there is today no path — none — by which any authenticated actor reads across
tenants.** That is a correct fail-closed default, and it is exactly what D15–D18 now require us to
open, deliberately and narrowly.

### 1.1 What Global HQ actually needs

Separating these matters, because they have very different security weights:

| # | Need | Spans tenants? | Weight |
|---|---|---|---|
| N1 | List / search all clients | **Yes** — but only tenant metadata: id, name, status, created | Low |
| N2 | Create a client (tenant + root org + first operator grant) | Writes outside any existing tenant | Medium |
| N3 | Administer *inside* one client — people, roles, orgs, modules, config | **No** — one tenant at a time | Low |
| N4 | Switch operating context between clients | No — sequential, one at a time | Medium |
| N5 | Suspend / activate a client | Single tenant, but platform-authorized | Medium |
| N6 | Platform-wide operational view — failures, health, provider status | **Yes** — aggregate across tenants | **High** |
| N7 | Platform audit including privileged operator actions | **Yes** | **High** |

**N3 and N4 — the bulk of HQ's screens — need no cross-tenant read at all.** They need the
*authority to enter* a tenant, then ordinary tenant-scoped operation. Only N1, N6 and N7 genuinely
span tenants, and N1 needs only non-sensitive metadata.

This asymmetry is the most important finding in this document, and it is what makes a narrow
solution possible.

---

## 2. Options

### Option A — Operator tenant + authorized context switching

Operator authority is a membership in a dedicated platform tenant. Administering a client means
**switching `withTenant()` to that client**, after an authorization check that the actor holds
operator authority. Every query still runs inside exactly one tenant scope. Cross-tenant *reads*
never occur; N1 is served by one narrow `SECURITY DEFINER` function returning tenant metadata only.

- **RLS:** never bypassed for N2–N5. The GUC is set to the target tenant and policies apply
  normally. One definer function for N1.
- **Tenant context:** explicit and single-valued. The operator selects a client; that selection is
  re-verified server-side, exactly as `setActiveMembership` already re-verifies membership.
- **Audit:** the action lands in the target tenant's stream (visible to the client) and in a
  platform stream, flagged as operator-originated.
- **Blast radius:** **small.** Worst case is entering a tenant one should not have; caught by the
  authorization check and visible in audit. A bug cannot leak tenant A's rows into a tenant B
  query, because no query ever spans two tenants.
- **Cost:** N6 (platform-wide aggregates) needs either N sequential scoped queries or its own
  additional definer function. N7 likewise.
- **Reuse:** very high. `withTenant`, `resolve_permissions`, `TenantMembership`, the command
  pipeline and audit all work unchanged.

### Option B — Operator authority orthogonal to tenancy, with `SECURITY DEFINER` reads

Operator authority is independent of membership. `resolve_permissions` is extended to honour
`Global` scope for operators. Cross-tenant reads go through explicitly declared `SECURITY DEFINER`
functions, one per use case.

- **RLS:** bypassed **inside each definer function**. Security rests on every function being narrow,
  correct, and audited. Each one is a deliberate hole in INV-001.
- **Tenant context:** ambiguous by construction — an operator has authority everywhere, so "which
  tenant am I acting in" becomes application state rather than a database fact. That is precisely
  the condition PLA-TEN-006 was written to prevent.
- **Audit:** must be built into each function; a function that forgets is silently unaudited.
- **Blast radius:** **large.** One flawed definer function leaks across every tenant simultaneously.
  The surface grows with each new HQ screen.
- **Cost:** N6 and N7 are natural and efficient.
- **Reuse:** lower. Introduces a second authorization path alongside role/permission resolution —
  the same "second model to keep in sync" that `CLAUDE.md` rejected for field permissions.

### Option C — A second database role with `BYPASSRLS`

A `verity_operator` role carrying `BYPASSRLS`, used on a separate connection for HQ.

- **RLS:** entirely disabled on that connection. `FORCE ROW LEVEL SECURITY` does not help — a
  bypassing role ignores policies while every policy still appears present and every test still
  passes.
- **Blast radius:** **maximum.** Any code path that reaches the operator client loses all isolation
  with no visible symptom.
- **Verdict:** **presented so it is on the record, and recommended against.** It directly
  contradicts `CLAUDE.md`'s standing rule that a bypassing role must never carry application
  traffic, and it recreates the exact failure mode `assertRlsEnforceable()` exists to catch.

### Option D — Hybrid: Option A discipline, plus a closed set of read-only platform projections

Option A governs all authority and all mutations. In addition, a **small, enumerated, read-only**
set of `SECURITY DEFINER` functions serves N1, N6 and N7 — returning platform metadata and
aggregates, never client business rows.

- **RLS:** never bypassed for any write, nor for any client business data read. Bypassed only inside
  a fixed, reviewable set of read-only projections whose result shape is constrained by the function
  signature itself.
- **Tenant context:** unchanged from A — single-valued and explicit for everything operational.
- **Audit:** mutations audited by the existing pipeline; each projection logs its own invocation.
- **Blast radius:** **contained.** The cross-tenant surface is a countable list of read-only
  functions, each reviewable in isolation, none capable of writing.
- **Cost:** each new platform-wide view needs a deliberate function rather than an ad-hoc query —
  which is a feature: it makes widening the surface a visible act.

---

## 3. Comparison

| Criterion | A | B | C | D |
|---|---|---|---|---|
| RLS bypassed for writes | No | Yes | Yes | **No** |
| RLS bypassed for client business reads | No | Yes | Yes | **No** |
| Cross-tenant surface | 1 function | grows per screen | entire connection | **fixed, read-only** |
| Tenant context unambiguous | Yes | No | No | **Yes** |
| Audit guaranteed by construction | Yes | Per function | No | **Yes for mutations** |
| Fails closed | Yes | Per function | **No** | **Yes** |
| Reuses existing runtime | High | Medium | Low | **High** |
| Serves N6 / N7 well | Poorly | Well | Well | **Well** |
| Blast radius | Small | Large | Maximum | **Contained** |
| Second authorization model introduced | No | Yes | Yes | **No** |

**Recommendation for review: Option D.** It keeps Option A's property that authority and mutation
never bypass isolation, while accepting a bounded, read-only, enumerable exception for the three
needs that genuinely span tenants. Option A alone is safest but makes N6 and N7 awkward enough that
pressure to widen it later is predictable — and a mechanism widened under pressure is worse than one
scoped honestly at the start.

**This is a recommendation, not a selection.** Awaiting approval per QB-3.

---

## 4. QB-4 — where operator identity lives

### Shape 1 — dedicated Verity operator / platform tenant

The operator is an ordinary `Party` + `User` holding a `TenantMembership` in a platform tenant,
with a role granting operator permissions.

- **INV-003:** respected. One Party per person; an operator who is also a client user holds two
  memberships, which is the subcontractor case the invariant was written for.
- **Authentication:** unchanged — Supabase, then membership resolution.
- **RLS:** the platform tenant is an ordinary tenant with ordinary policies.
- **Tenant switching:** the existing signed `verity_active_membership` cookie and re-verification
  extend naturally; entering a client is a scoped elevation from the operator membership.
- **Permissions:** operator authority expressed in the existing `Verb + Entity + Scope` model with
  existing role composition.
- **Audit:** operator actions carry a real `userId` and a real membership.
- **Multi-operator growth:** natural. Roles inside the platform tenant give operator-level RBAC —
  support versus billing versus engineering — with no new machinery.

### Shape 2 — operator authority orthogonal to tenancy

A `PlatformOperator` record keyed on `userId`, outside the tenancy model.

- **INV-003:** respected — it does not split Party.
- **Authentication:** unchanged.
- **RLS:** the operator table sits outside tenancy and needs its own policy design.
- **Tenant switching:** needs a new context mechanism, since there is no membership to select.
- **Permissions:** **introduces a second authorization model** beside role/permission — the exact
  duplication `CLAUDE.md` rejected when it refused a numeric field-permission "level ladder" as "a
  second authorization model to keep in sync with the first".
- **Audit:** workable, but privileged actions carry no membership, so the audit row is
  structurally different from every other row.
- **Multi-operator growth:** needs its own role system, built from nothing.

**Recommendation for review: Shape 1.** It reuses every mechanism already proven, keeps one
authorization model, and makes operator RBAC free. Its cost is conceptual — a tenant that is not a
client — which D18 requires be made explicitly distinguishable in code, UI and audit regardless of
shape.

**Not selected. Awaiting approval per QB-4.**

---

## 5. The twelve questions the final ADR must answer

Carried from the work plan §6.3, to be answered against whichever option is approved:

1. How does a Verity HQ operator authenticate?
2. How is HQ operator authority represented?
3. How does a global operator intentionally select a tenant?
4. How does the selected tenant context become authoritative?
5. How does RLS remain effective?
6. How are cross-tenant reads performed?
7. How are cross-tenant mutations performed?
8. How are these actions audited?
9. How does the system fail closed?
10. How is accidental tenant leakage prevented?
11. How are global operators separated from ordinary tenant users?
12. How are privileged actions distinguished in audit logs?

---

## 6. Threat notes that apply to every option

- **Ambient authority is the primary risk.** If operator authority is implicit rather than
  selected per action, a mistaken click acts on the wrong client. Every option must make the
  active client explicit and re-verified server-side, never inferred from a request payload
  (PLA-TEN-006).
- **`SECURITY DEFINER` is a privilege boundary, not a convenience.** Any such function must pin
  `search_path`, take no dynamic SQL, return a fixed column set, and log its invocation. An
  unpinned `search_path` on a definer function is a privilege-escalation primitive.
- **A recreated role can silently regain BYPASSRLS.** Confirmed as a live concern by the
  2026-08-26 credential incident. `assertRlsEnforceable()` must keep running on the runtime path
  and must not be weakened for HQ.
- **Tests must prove denial, not only permission.** Workflow D — a tenant user attempting a global
  operation and being refused with no leakage — is as load-bearing as any positive test.
- **Client-visible transparency is a policy question, not a technical one.** Whether operator
  actions appear in the client's own audit trail is QO-3 and must be answered before the audit
  model is fixed.

---

## 7. What happens next

1. Product owner reviews §2–§4.
2. Product owner selects an option and an identity shape, or asks for a further option.
3. ADR-013 is written and finalized at `verity-spec/17_decisions/adr/adr-013.md` with the twelve
   answers.
4. **Only then** may cross-tenant implementation begin.

**No code has been written. No mechanism has been chosen. Phase 2 has not begun.**
