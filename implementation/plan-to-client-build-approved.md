# Plan to CLIENT BUILD APPROVED

**Date:** 2026-08-26
**Question this answers:** what, exactly, has to be true before a developer can be handed a client
requirement — and what proves it.
**Relationship to other documents:** this is the *execution path* through
`work-plan-2026-08-26.md`. That document defines the phases, decisions D1–D26 and the acceptance
criteria; this one orders the remaining work, names the evidence for each step, and states which
steps are blocked on a product-owner decision rather than on effort.

**Rule carried forward unchanged:** no acceptance criterion may be weakened, removed, or
reinterpreted to make the project appear ready. A step is done when its check passes, not when its
code exists.

---

## 0. Where the project actually stands

| Verdict (work plan §13) | Today | Why |
|---|---|---|
| **A — Visual / product** | **NO**, close | Tokens, palette, mark and scroll architecture are done (ADR-012, `phase-1-visual-system.md`). Five items remain, all verification or authoring, none structural |
| **B — Platform / HQ** | **NO** | HQ does not exist. No `(hq)` route, no operator model, `verity.resolve_permissions` still filters `Global` grants out by design |
| **C — Client foundation** | **NOT PROVEN** | The capability probe that would prove gate 9 has never been built. The claim is currently DEMONSTRATED, not PROVEN |

What *is* proven and must not be re-litigated: tenant isolation under a `NOBYPASSRLS` runtime role,
all three authorization layers, the command/state/event/audit runtime, migrations from an empty
database with no manual step, 291 passing tests with 0 skipped.

---

## 1. Decisions only the product owner can make

Work below is blocked on these. Each has a recommendation so that a one-word answer unblocks it.

| # | Decision | Blocks | Recommendation |
|---|---|---|---|
| **QB-3** | Review the ADR-013 option comparison before a mechanism is selected, or approve the ADR once written? | Step 3.1 — determines one review checkpoint or two | Review the comparison. The three candidates differ materially in blast radius |
| **QB-4** | Do HQ operators live in a dedicated operator tenant, or does an operator flag sit orthogonal to tenancy? | Step 3.1 — the identity shape ADR-013 builds on, and it touches INV-003 | Decide inside ADR-013 with both shapes compared, not pre-decided here |
| **QO-2** | What does "suspend client" do — block sign-in, or freeze writes and leave reads working? | Step 4.3 | Block sign-in; freezing writes leaves a half-live tenant whose audit trail is hard to read |
| **QO-3** | Do HQ operator actions inside a client tenant appear in that client's own audit trail, or only the platform's? | Step 3.1, step 4.9 | Both. Transparency is cheaper to build now than to retrofit |
| **QO-4** | Who owns the production admin credential path, and is it decided now or at deployment? | Step 6.4 | Decide before step 6.4 runs, not after |
| **QD-3** | Density: comfortable only, or a comfortable/compact toggle? | Step 2.2 | Comfortable only; revisit if an operator surface proves too sparse |

Two further decisions are **already answered** and are recorded so they are not re-asked: QB-1 (the
accent — answered by the instruction to apply the brand sheet, ratified in ADR-012) and QB-2 (the
success/accent collision — resolved in ADR-012 §4).

---

## 2. Track 1 — Close Phase 0 and Phase 1

Runs first. Needs no product-owner decision except QD-3, and does not depend on ADR-013.

### 2.1 — Finish Phase 0.10 (deployment baseline)

Currently incomplete: the preview deployed and built, but Vercel's stored `DATABASE_URL` was stale,
so no authenticated runtime evidence was captured.

| Step | Check |
|---|---|
| Confirm Preview `DATABASE_URL` resolves and the app connects | A signed-in preview page renders data with no `PrismaClientInitializationError` |
| Confirm the runtime role is `verity_app`, not the migration role | `assertRlsEnforceable()` passes at startup; a bypassing role refuses to boot, so a serving app is definitionally correct |
| **Remove `DIRECT_URL` from the Preview environment** | `vercel env ls preview` no longer lists it. Verify `prisma generate` still succeeds first — if the schema requires the variable at generate time, supply a non-privileged placeholder rather than the `postgres` credential |
| Representative read + non-destructive command work | Named routes render; one command executes and writes an audit row |
| No credential material client-side | Bundle, rendered HTML and network responses contain no connection string |
| Record the limitation verbatim | `phase-0-10-preview-smoke.md`: verified against the existing database, not an isolated staging environment |

> **Security note, stated plainly.** `DIRECT_URL` carries the `postgres` role, which has
> `rolbypassrls = true`. A credential that bypasses row-level security has no place in a deployed
> environment: it is exactly the condition INV-001 exists to prevent. Runtime never needs it — only
> `prisma migrate` does. Removing it from Preview is part of this step, not a follow-up.

### 2.2 — Close Phase 1

| # | Work | Check |
|---|---|---|
| 1 | Live visual review, both themes, at 1440 / 1024 / 390 | Screenshots captured and compared against `light theme.webp` and `dark theme.webp`; each deviation recorded with its reason |
| 2 | Author dark deliberately per surface (D8) — background, surfaces, glass, borders, text, accent, semantic, controls, tables, charts, navigation, overlays | Each dark value has a recorded reason; no inversion filter anywhere in the tree |
| 3 | Sidebar overflow matrix | The six cases pass: 1440, 1024, 390, short viewport, large nav set, small nav set. No scrollbar when navigation fits |
| 4 | Glass placement matrix written | Every glass surface has purpose, token, contrast behaviour and per-theme implementation; no decorative default usage |
| 5 | Board composition applied to capability pages | Stat row, wide panel, filter bar, paginated dense table, using `design/reference/verity-inventory.html` as the composition reference. **No inventory domain is built** (QD-2) |
| 6 | E2E re-run | `brand`, `accessibility`, `responsive`, `shell` specs green against the new tokens |
| 7 | Regression | `npm run typecheck`, `npm run test` (0 skipped), `npm run build` all green |

**Exit:** Phase 1 acceptance table in the work plan passes in full. Verdict A can then be answered.

---

## 3. Track 2 — ADR-013, the operator security model

**Blocks everything in Track 3. Nothing cross-tenant may be written before it is accepted.**

### 3.1 — Select and ratify the mechanism

`implementation/adr-013-proposal.md` already compares the candidates. This step selects one and
promotes it to `verity-spec/17_decisions/adr/adr-013.md`.

The ADR must answer all twelve questions in work plan §6.3 explicitly, and must satisfy:

| Constraint | Meaning |
|---|---|
| Explicit | Operator authority is never implicit and never inherited from a tenant role |
| Audited | Every privileged action is distinguishable from an ordinary tenant action in the log |
| Fail-closed | Denial is the default on every path, including error paths |
| Isolation preserved | The chosen design must keep tenant isolation working, not disable it for administrators (D17) |
| Distinguishable | Tenant-scoped and global administration remain separate concepts in code, in the UI and in audit records (D18) |

**Exit:** ADR-013 status `ACCEPTED`, owner recorded. QB-3 determines whether that takes one review
or two.

---

## 4. Track 3 — Build HQ

Sequential after 3.1. Each sub-step uses the existing command/query/state runtime — **no parallel
CRUD layer for HQ** — and each ends with its workflow reachable through the UI with zero SQL.

| # | Surface | Done when |
|---|---|---|
| 4.1 | Operator security implementation | ADR-013's mechanism implemented; tenant user attempting a global operation is rejected with a security event; `Global` grants take effect **only** through the sanctioned path |
| 4.2 | HQ shell | `hq-shell-spec.md` implemented: global workspace, client switcher, navigation, adaptive sidebar, command surfaces, profile/settings |
| 4.3 | Clients / Tenants | List, search, create, configure, activate, **suspend** (per QO-2), inspect, enter/switch context, view enabled modules |
| 4.4 | People | List, search, invite, provision identity via `provisionIdentity()`, assign role, change role, revoke membership, deactivate/restore, inspect memberships |
| 4.5 | Roles and permissions | Create, edit, compose, grant, revoke, choose scope, and view the **resolved** permission set |
| 4.6 | Organizations | Create, edit, re-parent, inspect hierarchy; downward visibility (PLA-ORG-002) and sibling isolation (PLA-ORG-003) each verified by test |
| 4.7 | Modules | View available, enable/disable per client, view status, configure |
| 4.8 | Operations | System activity, failed operations, health, provider/binding status |
| 4.9 | Audit | Audit trail, security events, privileged-action distinction (per QO-3) |
| 4.10 | Platform settings | Safe configuration, appearance defaults, legitimately exposed operational controls |

### 4.11 — Authentication and demo removal (D21, D22)

There is no auth bypass to remove; what exists is a seed fixture.

1. Rewrite `prisma/seed.ts` to contain no credential and create no Demo records.
2. Archive the demo platform identity — never hard-delete; the lifecycle ends at `Archived`.
3. Add `prisma/bootstrap-admin.ts` reading `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment,
   provisioning through `verity.provision_identity`, idempotent.
4. Guard it: refuse a non-local `DATABASE_URL` unless `ADMIN_ALLOW_REMOTE=1`. That makes D22 a
   mechanism rather than a convention.
5. Verify sign-in goes through real Supabase password verification and authorization comes from the
   permission system, with no hardcoded admin path.

### 4.12 — Interactive HQ usability audit

Real workflows, end to end, **no SQL at any step**:

- **A — onboarding:** create client → configure → enable module → create organization → invite
  person → assign role → that person signs in → sees correct navigation.
- **B — inspection:** operator opens a client → people → organization → permissions → performs a
  permitted operation → audit record generated.
- **C — switching integrity:** operator in client A → switch to client B → **no client A data
  remains visible**.
- **D — privilege boundary:** tenant user attempts a global operation → rejected → no leakage →
  security event recorded.

**Exit:** every administrative criterion in work plan §6 met without SQL, and A–D all pass.
Verdict B can then be answered.

---

## 5. Track 4 — Prove the client foundation

### 5.1 — The probe

Build a **throwaway** capability exercising every contribution point: entity · command · query ·
state with `StateCategory` mapping · permission · configuration · event · audit · SLA behaviour ·
scheduled work · notification · custom field · UI page · navigation contribution.

> **The proof is the diff.** `git diff --stat src/server/platform/ prisma/schema.prisma` must show
> **no change**. If the probe cannot be built without touching them, gate 9 fails and the gap is
> named now, before a paying client meets it.

Delete the probe on completion. `PLATFORM-FREEZE.md` forbids a fake client surviving as a demo.

### 5.2 — Conventions

Write `implementation/09-capabilities/`: directory layout, naming, where purpose-built code is
encouraged versus where configuration belongs, how a capability declares navigation and queues, how
client-specific tables and columns are owned, and the ADR threshold — what a capability decides
alone versus what needs a platform decision.

### 5.3 — Provider bindings

Bound by requirement, never guessed: storage driver (when a client stores a file), job runner (when
a client has a deadline), notification transport (when a client notifies a person). Each binding
cites the requirement that forced it.

**Exit:** all fifteen gates satisfied with named evidence. Verdict C can then be answered.

---

## 6. Track 5 — Full verification

No new functionality. Converts claims into proofs, and runs **after** HQ and the probe exist,
because a suite that passed before HQ proves nothing about HQ.

| # | Check | Command / evidence |
|---|---|---|
| 6.1 | Unit + integration | `npm run test` green, **0 skipped** |
| 6.2 | Types | `npm run typecheck` clean |
| 6.3 | Build | `npm run build` succeeds |
| 6.4 | Deployment | Reachable in a deployed environment; the production credential path verified as **not** the local one (D22, QO-4) |
| 6.5 | E2E | `accessibility`, `brand`, `responsive`, `shell` plus new HQ specs |
| 6.6 | Tenant isolation | Cross-tenant read returns nothing; cross-tenant write rejected; unset scope fails closed — re-run **after** HQ exists |
| 6.7 | Authorization | All three layers bound to assertions that fail if broken |
| 6.8 | Audit immutability | Audit rows cannot be updated or deleted; cross-tenant audit access rejected |
| 6.9 | Authentication | Real Supabase verification; no hardcoded admin path |
| 6.10 | Accessibility | AA across the locked palette, every surface, both themes |
| 6.11 | Global HQ | Operator authentication, client switching, cross-tenant access and denial, privileged audit trail, tenant-context integrity |

---

## 7. Sequence

```
TRACK 1  Phase 0.10 + Phase 1          ─┐  no ADR dependency
                                        │  runs in parallel with Track 2
TRACK 2  ADR-013 selected + accepted   ─┘  BLOCKS Track 3
              │
              ▼
TRACK 3  HQ built (4.1 – 4.12)
              │
              ▼
TRACK 4  Probe + conventions + providers
              │
              ▼
TRACK 5  Full verification (after HQ and probe exist)
              │
              ▼
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            HARD CLIENT BUILD GATE
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              │
              ▼
        Phase 5 — Kent's Restaurant  (ADR-014 first: DEC-001 vs the kitchen view)
```

Only Tracks 1 and 2 may run in parallel. Nothing else crosses the gate.

---

## 8. What "a real yes" means

Three verdicts, each answered with evidence rather than impression, recorded in
`implementation/client-readiness.md`:

```
A  Visual / product readiness      = YES
B  Platform / HQ readiness         = YES
C  Client foundation readiness     = YES
                    ↓
        CLIENT BUILD APPROVED
```

Any NO blocks Phase 5. A verdict may not be answered YES on the strength of code existing; each
cites the check that would fail if the property stopped holding.

---

## 9. The single most likely way this goes wrong

Not effort. **Sequencing.** Building HQ screens before ADR-013 selects a mechanism produces
cross-tenant code whose security model is decided by whatever the first screen happened to need —
and that decision is then load-bearing and expensive to reverse. Track 2 gates Track 3 for that
reason, and for no other.
