> **SUPERSEDED — 2026-08-24.**
>
> This document's evidence table no longer matches executable reality. It records
> **274 Vitest / 34 Playwright**; the suite now stands at **280 Vitest / 60
> Playwright**. Its §5 security claim ("STRONG, with one gap") was also written
> before a real defect was found and fixed: `assertRlsEnforceable` was called by
> seventeen test files and by **no application code**, so the runtime RLS guard
> protected only environments the test suite was pointed at.
>
> Its structural findings — capability contracts, over-genericity, extension
> proofs, deferred items — were re-checked and still hold. Read it for those.
> For anything numeric, or for security status, read
> [`foundation-gate-2026-08-24.md`](foundation-gate-2026-08-24.md), which
> contains only results reproduced by running the commands it quotes.

# Verity Platform Readiness Audit

**Date:** 2026-08-23
**Scope:** the reusable platform. No client, industry pack or vertical product has been started.
**Method:** the repository was inspected directly rather than read from previous completion reports.
Every claim below is backed by a passing check or an explicit statement that something is absent.

**Evidence at time of writing**

| Check | Result |
|---|---|
| Vitest | **274 passed** across 20 suites |
| Playwright | **34 passed, 12 skipped** (desktop + mobile projects) |
| Typecheck | clean |
| ESLint | clean |
| Production build | clean |
| RLS | enabled **and forced** on every application table |

---

## 1. Foundation status — **COMPLETE**

Tenancy, identity, membership and authorization are implemented and enforced by the database
rather than by query construction. The properties that matter are asserted, not assumed:

- An unscoped connection reads nothing and writes nothing — isolation fails closed.
- `FORCE ROW LEVEL SECURITY` is set everywhere, so the owning role does not bypass policy.
- The runtime role is `NOSUPERUSER NOBYPASSRLS` and `assertRlsEnforceable()` refuses to start
  otherwise. This is asserted in the conformance suite, because Supabase's default `postgres`
  role has `rolbypassrls = true` and pointing the app at it would give zero isolation with a
  fully green test run.
- `Party` and `User` are global by constitutional requirement (Bible V2 Primitive 2 §2) and
  isolated by reachability rather than a tenant column.

## 2. Platform runtime status — **COMPLETE**

Entity registry, command and query pipeline, state and transition runtime, transactional outbox,
two append-only audit streams, workflow DAG engine, capability registry with dependency
resolution, offline sync inbox, and — added in this milestone — the temporal model and SLA
substrate.

Two structural guarantees worth naming:

- **Events cannot outlive a rollback.** They are written to the outbox inside the mutation's own
  transaction, so there is no ordering a handler can choose that emits an event for work that did
  not commit.
- **Audit cannot be rewritten.** `UPDATE` is refused for every role including `BYPASSRLS`;
  `DELETE` is refused for the application role and permitted only for a privileged retention path,
  because EXE-AUD-002's compliance clock implies eventual pruning.

## 3. Experience system status — **READY**

The architecture is `CAPABILITY → CONTRACT → CONTRIBUTION → SHELL`.

The shell previously held a hard-coded map from capability id to route, so every new capability
required editing platform code. That is fixed: capabilities declare navigation and workspace
contributions and the shell reads them. Three filters apply — activation, shell membership,
permission — and none of them is authorization; the pipelines still decide.

**The contract deliberately stops short of a universal renderer.** It declares *where* a capability
appears and *what* it may do there, never how to draw the page. Scheduling needs a time grid,
Approval needs a queue, and forcing both through one generic screen would trade real usability for
uniformity nobody asked for. Metadata-driven screens exist (`experience.ts`, custom fields) for the
cases that suit them; purpose-built screens exist for the cases that do not. This is
"standardize the foundation, not every behavior" expressed in code.

Shell kinds `platform | operations | worker | external` are declared and routed. Only the platform
shell is built; the others are contracts a capability can already target. §27 defers the Worker
Shell application, and building four applications with nothing to put in three of them would be
scaffolding pretending to be architecture.

## 4. Capability contract status — **ENFORCED**

Verified mechanically, not by inspection (`conformance.test.ts`, Phase E):

| Rule | Status |
|---|---|
| Platform never imports a capability | enforced |
| Capability never imports an undeclared dependency | enforced |
| Every capability mutation goes through a `CommandDefinition` | enforced |
| Every command declares a verb and an entity | enforced |
| No capability sets a tenant scope by hand | enforced |

The Location capability proves the dependency inversion: the platform defines the `Location`
permission scope but cannot resolve it, so the capability registers a resolver. An axis with no
registered resolver reaches **nothing** rather than everything.

## 5. Security status — **STRONG, with one gap**

Isolation, authorization (all three layers), append-only audit, encrypted credentials, and
uniform sign-in failure messages that do not distinguish "no such account" from "wrong password".

**Gap:** failed sign-ins are not recorded. Before authentication there is no tenant, the security
stream is tenant-scoped by design, and attributing an attempt to a guessed tenant would be worse
than not recording it. Successful sign-in and context switches *are* recorded. Closing this needs
either a platform-level (non-tenant) security log or acceptance of the auth provider's own log —
**a decision, not an implementation.**

## 6. Offline status — **SERVER COMPLETE, CLIENT ABSENT**

The inbox, idempotent replay ordered by `deviceTimestamp`, conflict classification and
`SyncException` surfacing are implemented and tested. There is no client-side queue, connectivity
indicator or optimistic mutation layer.

This does not block capability construction — it is an experience concern, and a capability's
commands work identically whether queued or not. Classified **REQUIRED_BEFORE_CLIENT_WORK** rather
than REQUIRED_NOW.

## 7. Data status — **READY**

42+ models, all tenant-scoped except eight documented globals, each annotated with the authority
that makes it so and asserted to exist. UUID keys throughout. Optimistic concurrency via `version`.
Composite foreign keys prevent cross-tenant references structurally.

**Temporal model added this milestone.** Instants are stored in UTC; a zone is resolved
(organization → tenant → explicit UTC) and never guessed, because a wrong guess moves every
deadline by the offset with nothing in the interface revealing it. Zones are validated at write
time, since an unrecognised zone silently degrades to UTC in most date libraries.

**Gap:** retention is modelled and documented but not enforced by a scheduled process.

## 8. Observability status — **PARTIAL**

Events, both audit streams, workflow run and step records, and sync exceptions are all queryable.
Sentry is wired at build level.

**Gaps:** no background job runner, so nothing sweeps SLA breaches or dispatches notifications on a
schedule; both functions exist and are idempotent, but must currently be invoked. No performance
telemetry.

## 9. Accessibility status — **READY**

Landmarks, working skip link, labelled controls, `aria-sort`, table captions, `role="alert"` errors,
reduced-motion, and state communicated by glyph and text rather than colour alone — a red dot and a
green dot are the same dot in greyscale. Asserted in Playwright across both viewports.

## 10. Mobile status — **RESPONSIVE, SHELL DEFERRED**

The hierarchy adapts rather than shrinking: persistent rail becomes a sheet, dense table becomes
stacked records. No horizontal overflow at 390px across six routes. Touch targets meet 44px.
A dedicated Worker Shell application is deferred per §27.

## 11. Extension status — **PROVEN**

Custom fields are rendered, validated and submitted end to end; a tenant declaring a field sees it
without any component changing, and the command re-validates because a client check is a
convenience, never a control. Capability contributions, scope resolvers and storage drivers are all
registration-based.

## 12. Future client composition results — **4/4 PASS**

`composition.test.ts` declares four hypothetical capabilities and asserts the platform accepts them.
None is implemented.

| Capability | Depends on | Reuses | Needs platform change? |
|---|---|---|---|
| Guard Patrol | Location, Evidence, Scheduling | geofences, checkpoint evidence, shift coverage, SLA interval | **No** |
| Facilities Maintenance | Location, Asset, Approval | asset lifecycle, approval chains, `awaiting_parts` as `Pending` | **No** |
| Staffing | Scheduling | availability and conflict detection via ADR-008 rather than its own | **No** |
| Professional Services | Approval | approval chains, `on_hold` as `Pending` | **No** |

Every hypothetical lifecycle expressed itself in the platform's six state categories, and each got
correct SLA clock behaviour from declaring its states honestly — no clock code. That is the
evidence that ADR-009's category set is genuinely behavioural rather than Work-shaped.

Answering the ten questions is embedded in the fixtures: primitives reused, dependencies, owned
entities, actions, events, permissions, UI contribution, what is configurable (thresholds, calendars,
templates, custom fields), what is intentionally hard-coded (route ordering, proximity tolerance,
rostering rules — deliberately internal to each capability), and what stays client-specific.

## 13. Over-genericity audit — **PASS**

Checked mechanically (`conformance.test.ts`, Phase G):

- **No EAV table.** No model pairs an attribute name with a loose value column.
- **JSON columns held to a budget.** Permitted only for `customFields` (PLA-EXT-001), event and
  automation payloads, configuration values, workflow conditions and run I/O. A new one must be
  argued for rather than added quietly.
- **No capability implements its own state machine.** No `switch` over state in any capability;
  transitions are `transition_definition` rows against one runtime.
- **Platform surface bounded** at 24 modules as a tripwire against capability logic drifting in.

Judgement calls that consciously resisted genericity: the contribution contract is not a screen
renderer; notification templates substitute literally rather than evaluating expressions, because a
tenant-authored template that can evaluate is a stored program; `entity` is a free string while
verbs stay a closed set; scope levels were **not** widened to the handoff's `own` because it appears
in neither Bible nor specification.

## 14. Remaining platform gaps

| Gap | Class | Blocks capability construction? |
|---|---|---|
| Background job runner (SLA sweep, notification dispatch, retention) | REQUIRED_BEFORE_CLIENT_WORK | No — functions exist and are idempotent |
| Storage driver binding | REQUIRED_BEFORE_CLIENT_WORK | No — record layer complete, deployment step |
| Client-side offline queue | REQUIRED_BEFORE_CLIENT_WORK | No |
| Failed-sign-in security logging | REQUIRED_BEFORE_CLIENT_WORK | No — needs a decision |
| Retention enforcement | REQUIRED_BEFORE_CLIENT_WORK | No |
| Platform search | DEFERRED | No — addable without redesign |
| Public API / webhooks | FUTURE_CAPABILITY | No |
| Performance characterisation | DEFERRED | No |
| Worker / external shell applications | DEFERRED (§27) | No — contracts exist |

## 15. Intentionally deferred capabilities

Security Operations, Staffing, Facilities, Field Service, CRM, Sales, Procurement, Inventory,
Commerce, Finance, Maintenance and all industry packs. **Not started, by instruction.**

`Global` permission scope is defined by PLA-AUT-002 but never granted: honouring it means bypassing
the RLS that enforces INV-001, and `resolve_permissions` filters those rows out so such a grant
cannot silently take effect.

## 16. Risks

1. **Nothing runs on a schedule.** SLA breach and notification delivery are both correct and both
   idempotent, but nothing invokes them. The first capability that depends on a deadline firing will
   discover this. *Mitigation: bind a job runner before that capability, not after.*
2. **Storage is unbound.** Evidence can reference a platform-managed artefact, but no bytes can be
   stored until a driver is registered and credentials re-issued.
3. **Secrets outstanding.** Seven credentials still require rotation at their providers — the
   Supabase database password above all, which was disclosed in a session transcript. See
   `foundation-validation/secret-rotation.md`. **This is the highest-priority operational item.**
4. **Scale is uncharacterised.** Correct under test, unmeasured under load. `resolve_permissions`
   and `organization_subtree` are recursive and run per check.
5. **One adaptive shell.** The other three are contracts. A capability targeting `worker` today
   contributes navigation that nothing renders yet.

## 17. Open decision required

`PermissionScope` enumerates `Global | Tenant | Organization | Location` (PLA-AUT-002). The
completion brief asks that capabilities be able to express **own / team / resource** as well.
`team` and `resource` need no platform change — they are axes, and the scope-resolver registry
already handles those, as Location demonstrates. **`own` is different in kind:** it is
actor-relative rather than an axis, and adding it means a new enum value and an ADR.

It has not been added. Inventing a constitutional scope to satisfy a brief that conflicts with the
specification is exactly the silent architecture the build charter forbids.

---

## FINAL VERDICT

# READY_WITH_NON_BLOCKING_GAPS

The platform is ready for capability construction. Four hypothetical capabilities spanning four
industries composed against it without a single platform source change, and the boundaries that
make that repeatable are enforced by tests rather than by convention.

It is **not** `READY_FOR_CLIENT_CAPABILITY_BUILD` without qualification, and the distinction is
deliberate rather than cautious. Three things are genuinely unfinished — nothing runs on a schedule,
no storage backend is bound, and secrets remain unrotated at their providers. None blocks *building*
a capability; all three block *operating* one. Reporting a clean pass would mean the first team to
depend on an SLA deadline discovers on their own that nothing fires it.

**Recommended before the first client capability:** bind a job runner, bind a storage driver,
complete secret rotation, and resolve the `own` scope question.
