# Task Plan 103 — Payload CMS as Control-Plane Infrastructure: Comparative Architecture Analysis (Proposed ADR)

**Status:** RATIFIED (partial, 2026-09-08) — the "reject Payload as
tenant-scoped control-plane dependency" conclusion (sections 15-16, first
bullet) is now `verity-spec/17_decisions/adr/adr-019.md`, ACCEPTED. The
native-implementation-shape conclusion (section 16, second bullet) is
explicitly **not** ratified by that ADR and remains open, pending
`104_verity_native_configuration_extension_architecture.md`'s five open
questions. See ADR-019 §"What is explicitly not settled by this ADR."

**Date:** 2026-09-08

**Trigger:** Stop condition per `CLAUDE.md` ("a new platform primitive
appears necessary" / "a security boundary is unclear") — this document
exists to classify the gap and lay out options, not to decide or build.
**No code changes accompany this document.**

---

## 1. Context & decision trigger

The product owner asked whether Payload CMS should be adopted to accelerate
Verity's configuration/control-plane layer — custom fields, dynamic forms,
workflow and approval definitions, document/email templates, module and
navigation configuration, industry templates — rather than building that
layer natively as planned (`CLAUDE.md` build-priority item 10,
"Configuration / capability / extension infrastructure," currently
**unbuilt**).

This is not a fresh question. Payload was already audited in this project's
R&D program (`taskplans/03_payload_audit.md`) against a working commit of
`payloadcms/payload`, and cross-referenced against ten other reference
systems in `taskplans/14_capability_matrix.md`. Those documents already
carry directional verdicts (ADOPT / ADAPT / INSPIRE / REJECT / DEFER per
Payload feature) but were never formalized as a platform ADR weighing a
full "adopt Payload as control plane" option against the native path. This
document closes that gap using the existing audit evidence rather than
re-deriving it, and adds the scoring discipline the product owner asked
for.

Two prior decisions bound everything below and are not reopened here:

- **`taskplans/17_verity_gap_analysis.md`** already resolved the *custom
  fields* sub-question at P0: `additionalDetails Json` columns validated at
  the API boundary with Zod (the DIGIT Works pattern), not a
  collections/fields engine. This is Option A's starting point, already
  ratified in spirit.
- **`taskplans/14_capability_matrix.md`** already directs multi-tenancy to
  "logical partition via `tenant_id` + RLS" and explicitly **REJECT**s
  Payload's multi-database-adapter model. Option B below has to be judged
  against that standing rejection, not argued from scratch.

---

## 2. Verity architectural invariants in play

Any option is evaluated against these, unchanged and non-negotiable:

- **INV-001 (strict tenancy isolation).** Enforced today by Postgres RLS
  plus `withTenant()` setting `verity.tenant_id` transaction-locally via
  `set_config`, over the `verity_app` role (`NOSUPERUSER NOBYPASSRLS`).
  With no scope set, reads return nothing and writes are rejected — fails
  closed. This mechanism is Prisma-only by construction (`src/server/platform/tenancy.ts`,
  `assertRlsEnforceable()`).
- **Prisma/Postgres is system of record** for transactional data (Bible
  V1). No second write path to tenant-scoped tables is authorized today.
- **Single identity model, no parallel authority path.** ADR-017: every
  actor — human or AI — executes through the same `ActorContext`, the same
  `enforcePolicy()` gate, regardless of `PolicyChannel`. There is no
  service-account or elevated path. A second framework with its own
  access-control functions is, by definition, a second gate.
- **Canonical vocabulary.** Command / State / Event / Query / Projection
  are fixed meanings (`CLAUDE.md`, "Command / state / event vocabulary").
  Payload has no native concept of any of these; it has documents,
  collections, and hooks.
- **Auditability.** Every mutation traces to actor, authorization, scope,
  state transition, and event (`CLAUDE.md` "Security rule"). Whatever
  writes tenant-relevant configuration must produce the same kind of trail
  Verity's own command pipeline produces today.
- **Foundation-phase scope lock.** Per `CLAUDE.md`, item 10 in the build
  order has not started; items 1–9 are still in progress. Nothing in this
  document is a license to start item 10 early, regardless of which option
  wins.

---

## 3. Option A — Native Configuration/Extension Infrastructure

Build the control plane inside `src/server/platform/` and
`src/server/capabilities/`, on primitives that already exist
(`entity.ts`, `capability.ts`, `config.ts`, `workflow.ts`, `policy.ts`,
`command.ts`, `state.ts`).

- **Custom fields**: already directed — `additionalDetails Json` per
  entity, Zod-validated at the API boundary, queried via Postgres JSONB
  operators/indexes. No new engine.
- **Entity metadata / dynamic forms**: a metadata table (`FieldDefinition`:
  entity key, field key, type, validation rule, visibility rule) read by a
  generic form renderer component — conceptually Payload's field-config
  idea, implemented as data, not as a second framework (per the audit's
  own "ADOPT: Declarative Collection Schema Concept").
- **Workflows / approvals**: modeled as data rows consumed by the existing
  `workflow.ts` / `state.ts` runtime — condition → action → approver
  chains, not a new execution engine.
- **Admin UI**: hand-built CRUD screens over the metadata tables, inside
  the existing Next.js app shell — using the same auth, same RSC/route
  conventions, same accent/glass design system already governing the rest
  of Verity's UI (ADR-011/012). No second admin app to theme or secure.
- **Versioning**: shadow-table pattern for config history (the audit's own
  "ADAPT: Shadow Table Versioning"), append-only, consistent with how
  `Activity`/`DomainEvent` already work.
- **Migrations**: standard Prisma migrations; no second migration system.

This is strictly additive to the platform substrate already being built —
it is item 10 of the roadmap, not a new item.

---

## 4. Option B — Payload as Control Plane

Payload runs as a second application layer inside (or beside) Verity, with
Postgres as shared infrastructure but Drizzle-managed tables of its own,
owning collections for custom fields, workflow/approval definitions, forms,
templates, and industry-template catalogs; Verity's Prisma layer remains
authoritative for domain transactions only.

**Payload's exact responsibilities (if adopted):** collection/field
schema definition, its own admin UI rendering, its own REST/GraphQL/Local
API for the config data it owns, its own hooks (`beforeChange`/
`afterChange`) for config-side validation, its own media/document storage
for templates, its own versions/drafts tables.

**Verity's exact responsibilities (unchanged):** all tenant-scoped domain
data (Party, Order, Invoice, Payment, ChecklistItem, Evidence, Contract,
etc.), all authentication and session issuance, all `ActorContext`
resolution, all `enforcePolicy()` decisions, all domain events/audit.

**Tenancy boundary:** Payload's `access` functions would need to receive
Verity's resolved tenant/actor context and enforce scoping *in
application code*, collection by collection, field by field — there is no
RLS-equivalent for Drizzle-managed tables unless one is built by hand, and
building it by hand means re-implementing INV-001's enforcement a second
time in a different query layer, with a different failure-closed
guarantee (or, worse, none). A missed `access.read` clause on one
collection is a silent cross-tenant leak with no database-level backstop
— exactly the failure mode INV-001's "fails closed" design exists to rule
out at the Prisma/RLS layer.

**Auth integration:** feasible — Payload supports custom auth strategies,
so it could defer entirely to Verity's session/JWT rather than run its own
user collection. This part of Option B is not the hard part.

**Database topology:** shared Postgres instance, disjoint table sets
(Payload's Drizzle-managed tables vs Prisma-managed tables) is workable
without conflict — this is not the objection. The objection is the access-
control plane, not the storage engine.

**API boundary:** Verity's runtime would call into Payload's Local API
(in-process, no HTTP hop) to read/write configuration; Payload's own
REST/GraphQL surfaces would need to be disabled or placed behind the same
auth/tenant gate Verity's own routes use, or they become a second,
unaudited ingress into config data.

**Deployment:** one more Node process/build target to containerize,
version, and keep compatible with the pinned Next.js 16 release Verity
already tracks closely enough to read `node_modules/next/dist/docs/`
before touching framework-sensitive code.

---

## 5. Option C — Bounded Hybrid / Adapter

Payload is introduced, but **never as the authority for anything
tenant-scoped**. It is confined to genuinely content-shaped, non-tenant,
or platform-global data only:

- Marketing/public site content
- Platform-level document/email *templates* (the template text itself,
  not a tenant's filled instance of it — filled instances remain Verity
  domain data)
- SOP/knowledge-base articles
- The **catalog** of industry/system templates a tenant can choose from
  (read-only reference data, not a tenant's configuration of one)
- Internal admin tooling content that has no per-tenant variance

Everything a tenant can configure per-organization — custom fields on
their entities, their workflow/approval rules, their feature flags, their
navigation — stays in Option A's native path, because that is precisely
the data INV-001 must scope and Payload cannot scope without duplicating
RLS.

The adapter is "bounded" specifically by this rule: **if a row's correct
value depends on `tenant_id`, it is never a Payload row.** This is
checkable per-table at review time, not a matter of trust.

---

## 6. Ownership matrix

| Capability | Owner (A: Native) | Owner (B: Payload control plane) | Owner (C: Bounded hybrid) |
|---|---|---|---|
| Users / identity | Verity | Verity | Verity |
| Tenants / tenant isolation | Verity (RLS) | Verity (RLS) — Payload tables outside its reach | Verity (RLS) |
| Party / Order / Invoice / Payment / Evidence / Contract | Verity | Verity | Verity |
| Custom fields on tenant entities | Verity (JSONB + Zod) | Payload collections (per-tenant scoping risk) | Verity (JSONB + Zod) |
| Workflow/approval *definitions* (tenant-owned) | Verity | Payload (per-tenant scoping risk) | Verity |
| Feature/module/navigation config (tenant-owned) | Verity | Payload (per-tenant scoping risk) | Verity |
| Document/email **template text** (platform-global) | Verity (simple table) | Payload | Payload |
| SOP / knowledge base | Verity (simple table) | Payload | Payload |
| Industry template **catalog** (read-only reference) | Verity | Payload | Payload |
| Marketing/public content | N/A (out of app) | Payload | Payload |
| Media for the above | Verity's existing S3 wrapper (`taskplans/41`) | Payload storage plugin | Payload storage plugin, scoped to non-tenant assets |
| Audit trail | Verity `Activity`/`DomainEvent` | Split across two systems unless bridged | Verity, with Payload's own hooks writing into Verity's audit sink |

---

## 7. Threat / security model — the second tenant-access enforcement surface

This is the load-bearing section, per the requested weighting.

- Today: **one** enforcement surface for tenant data (Postgres RLS +
  `withTenant`), verified by `assertRlsEnforceable()` at startup and by an
  isolation test. It fails closed — no scope set means no data, not "all
  data."
- Option B: **two** enforcement surfaces — RLS for Prisma-owned tables,
  hand-written `access` functions for every Payload collection that ever
  touches tenant-relevant configuration. The second surface fails **open**
  by default (a collection with no `access.read` override is world-
  readable in Payload unless explicitly locked down), which is the
  opposite failure mode from RLS's fail-closed default. Reviewing "did
  every collection get its access function right" is a permanent, growing
  audit burden that scales with every future collection — a category of
  bug Verity's RLS design was specifically built to make structurally
  impossible.
- Option A: **zero** new enforcement surfaces. Config rows live in
  Prisma-managed, RLS-covered tables like everything else.
- Option C: **one** enforcement surface for anything a tenant can affect;
  Payload's surface exists but only ever guards non-tenant data, so a bug
  there leaks platform-global content (bad, but not an INV-001 breach) —
  categorically different blast radius than Option B.

This also interacts with ADR-017 directly: Option B's Payload `access`
functions are a second authorization decision point outside
`enforcePolicy()`, for at least the config data it owns. That is a second
authority path in substance, even if Payload's session comes from Verity's
JWT — the *decision logic* ("can this actor read this collection") is
Payload's own, not Verity's `enforcePolicy()`. ADR-017 was written to
foreclose exactly this shape of exception.

---

## 8. Operational complexity

| | A: Native | B: Payload control plane | C: Bounded hybrid |
|---|---|---|---|
| Upgrades | One framework (Next.js) to track | Two frameworks to keep compatible (Payload pins specific Next.js ranges) | Two frameworks, smaller blast radius |
| Deployment | One process | One process, larger — Payload initializes inside the same Next.js app, but adds its own admin bundle/build step | Same as B, scoped smaller |
| Observability | Existing Sentry/OTel wiring covers everything | Needs Payload-side instrumentation bridged into the same pipeline | Same as B, smaller surface |
| Backups | One schema, one migration history (Prisma) | Two migration histories (Prisma + Payload/Drizzle) to keep in sync for a restore | Two histories, but Payload's tables carry no transactional data — lower restore stakes |
| Failure modes | Config outage = platform outage (same as today) | Payload down != Verity core down if isolated correctly, but adds a new failure domain to reason about | Same isolation benefit as B, narrower scope of what breaks |

---

## 9. Developer experience

- **A**: consistent with the rest of the codebase — same ORM, same
  command/state/event vocabulary, same test patterns. Cost: the admin UI
  and metadata-driven form renderer have to be built by hand; no canned
  admin panel on day one.
- **B**: Payload's admin panel and TypeScript-first config are genuinely
  pleasant and fast to start with, but every engineer now needs a working
  mental model of *two* systems, and has to know at a glance which one
  owns a given piece of data — a classification error here is exactly the
  security defect in §7, not just a style nit.
- **C**: same upside as B for the bounded surface, without asking every
  engineer touching tenant data to reason about Payload at all.

---

## 10. Performance

- **A**: single query path, no cross-framework translation layer.
  JSONB queries on `additionalDetails` are indexable (GIN) and fast at
  Verity's expected scale.
- **B**: Payload's Local API avoids an HTTP hop when called in-process,
  which mitigates the naive "two services" performance fear — the real
  cost is not latency, it is the security/maintenance surface above.
- **C**: same as B, but on non-tenant reads only, which are typically
  cacheable more aggressively (template text, SOPs, catalogs change
  rarely).

---

## 11. Multi-tenancy

Already decided at the platform level (`taskplans/14_capability_matrix.md`):
shared database, `tenant_id` + RLS, no per-tenant schema, no multi-database
adapters. Option B does not change this decision for Prisma-owned data; it
introduces a second, tenant-unaware storage layer that would need bespoke
scoping to participate in the same guarantee. Option A and C both leave the
existing multi-tenancy decision fully intact and unextended in risk.

---

## 12. Rs.10L-30L enterprise customization implications

The commercial thesis — "sell configuration, not bespoke development" —
is not actually decided by which option wins here. What it needs is:

- A metadata-driven admin surface non-engineers can use to add fields,
  set validation, define approval chains, and pick an industry template.
- That surface can be Option A's hand-built admin UI or Option B/C's
  Payload-rendered admin UI — both can present the same experience to an
  implementation consultant. Payload gets there faster on day one;
  native gets there with less structural risk and no dependency on an
  external project's roadmap for features Verity's specific vocabulary
  needs (Command/State/Event framing, which Payload has no concept of and
  would have to be bridged by hand regardless of which option is chosen).
- The enterprise thesis is served by *item 10 existing at all*, not by
  which framework renders its forms. Delaying item 10 to relitigate
  Payload adoption is a bigger risk to the enterprise-customization thesis
  than either option's technical shape.

---

## 13. Build-vs-buy economics

- Payload does not need to be "bought" — it's MIT-licensed, so this is a
  build-vs-adopt-dependency question, not a licensing cost question.
- The real cost of "buy" (Option B) is the ongoing tax of keeping a second
  framework's access-control model provably as strict as RLS, forever, as
  new collections are added — a recurring engineering cost, not a one-time
  integration cost.
- The real cost of "build" (Option A) is the up-front admin-UI and
  metadata-engine work item 10 already budgets for in the roadmap. This
  is scoped, known work, not speculative.
- Per the original audit's own conclusion (`03_payload_audit.md` section
  8): adopt the *concepts* (declarative schema, local-API-style server
  helper), not the dependency. That extraction cost is far smaller than
  either full adoption or full reimplementation of Payload's entire
  surface area.

---

## 14. Reversibility / lock-in

- **A**: fully reversible in the trivial sense — it's Verity's own code,
  changeable at will.
- **B**: schema shape, admin UI, and hooks all become Payload-shaped.
  Un-adopting later means migrating collections back into Prisma models
  and rebuilding the admin UI natively anyway — most of Option A's cost,
  paid a second time, after the fact.
- **C**: lock-in is bounded to non-tenant content, which is cheap to
  migrate later if ever needed (templates, SOPs, catalog text) — low
  stakes either way.

---

## 15. Decision criteria and scoring matrix

Weights as specified by the product owner; scores 1-5 (5 = best) against
each option, grounded in sections 6-14 above.

| Criterion | Weight | A: Native | B: Payload control plane | C: Bounded hybrid |
|---|---|---|---|---|
| Tenant isolation/security | 25% | 5 | 1 | 4 |
| Architectural coherence | 15% | 5 | 2 | 3 |
| Extensibility/configurability | 15% | 3 | 5 | 4 |
| Implementation velocity | 10% | 2 | 4 | 3 |
| Long-term maintenance | 10% | 5 | 2 | 3 |
| Enterprise customization | 10% | 3 | 4 | 4 |
| Performance/scalability | 5% | 5 | 3 | 4 |
| Developer experience | 5% | 3 | 4 | 4 |
| Reversibility/lock-in | 5% | 5 | 2 | 3 |
| **Weighted total** | 100% | **4.10** | **2.75** | **3.60** |

The ranking is not close, and it is not close specifically because tenant
isolation is weighted highest and Option B scores lowest exactly there —
the one criterion the product owner correctly said should dominate.

---

## 16. Recommendation

This ADR carries two claims of different strength, and they must not be
conflated:

- **Settled by this analysis:** Payload is rejected as a tenant-scoped
  control-plane *dependency*. This follows directly from §§7 and 15 —
  Option B fails the highest-weighted criterion by construction, and
  nothing in a future design pass changes that, because the failure is
  structural (a second access-control authority, fail-open by default)
  rather than a matter of effort or polish.
- **Still a hypothesis, not yet settled:** that Option A's *specific
  shape* — a `FieldDefinition`/`FormDefinition`-style generalized metadata
  engine — is the right size for item 10. Rejecting Payload does not by
  itself prove the native design is minimal; it only proves the
  alternative is unacceptable. `taskplans/104_verity_native_configuration_extension_architecture.md`
  exists to prove or correct the native shape before either half of this
  ADR is ratified. Until 104 exists and is reviewed, treat §3's specifics
  as a sketch, not a spec.

What this document does retain from the Payload audit is not Payload
itself — it is a set of architectural *patterns*, independent of whether
Payload the dependency is ever installed:

**Adopt conceptually (informs 104's design, not this ADR's ratification):**
declarative schema/configuration-as-data; metadata-driven forms; a
reusable local server API/service abstraction (Payload's `payload.find()`/
`payload.create()` pattern, adapted); field/document-level authorization
*as a concept* (re-expressed through `enforcePolicy()`, never a parallel
gate); hooks/lifecycle concepts (re-expressed through the existing
Command pipeline, not a bolted-on hook runner); the version/draft model;
plugin/extension architecture (Verity's own `capability.dependencies`
mechanism already does this natively); generated/admin-driven CRUD
patterns; a media abstraction (Verity already has one, `taskplans/41`);
configurable admin views.

**Do not inherit, under any option:** Payload's database ownership;
Drizzle as a second query authority; Payload auth as an authority;
Payload access control as an authorization authority; Payload's multi-DB
abstraction; Payload's collection model wholesale; a second
tenant-isolation mechanism.

1. **Reject Option B outright.** Payload as authoritative control plane
   for any tenant-configurable data introduces a second, weaker-by-default
   tenant-access enforcement surface against INV-001, and a second
   authorization decision point against ADR-017. Neither invariant has an
   exception clause, and this proposal does not manufacture one.
2. **Direct further design work toward Option A**, but do not treat its
   implementation shape as fixed by this document — see
   `104_verity_native_configuration_extension_architecture.md` for the
   sizing question ("what is the minimum native platform required,"
   not "how do we rebuild Payload"), once items 1-9 are actually done —
   not before, per the existing build order. This was already the
   direction implied by
   `17_verity_gap_analysis.md`'s custom-fields decision; this ADR extends
   the same reasoning to workflows, approvals, and admin UI.
3. **Hold Option C as a legitimate future candidate**, strictly bounded to
   content that is never tenant-scoped (marketing content, template text,
   SOPs, the read-only industry-template catalog) — and only if, once
   Option A's admin tooling is actually being built, its velocity proves
   to be a real bottleneck worth a second dependency for that narrow
   surface. Not decided now; not blocking anything now.
4. **Formally re-affirm, not re-litigate, the original audit's ADOPT/ADAPT
   items** from `03_payload_audit.md` section 8 as implementation guidance
   for Option A when item 10 starts: declarative field-schema-as-data,
   a local server-side helper analogous to Payload's `payload.find()`/
   `payload.create()`, adapted field-level access-check signatures, and
   shadow-table versioning for config history.

---

## 17. Consequences

- Item 10 remains scoped as native platform work; no new external
  dependency is added to the build.
- `03_payload_audit.md` and `14_capability_matrix.md` are not superseded —
  this document formalizes their verdict at the ADR level and closes the
  "should Payload become the control plane" question they left implicit.
- If a future session proposes Option C in practice, it must show, per
  table, that no column depends on `tenant_id` before that table can be
  Payload-owned — this document is the citable authority for that review
  gate.
- No timeline commitment is made for item 10 itself; that remains gated by
  completion of items 1-9 per `CLAUDE.md`'s build order.

## What was rejected

- **Payload as authoritative control plane (Option B)** — rejected per
  sections 7 and 15-16: fails the highest-weighted criterion by
  construction.
- **Doing nothing / leaving item 10 undesigned** — rejected because the
  product owner's question surfaced a real, unresolved gap
  (`CLAUDE.md`'s own "Open — do not solve silently" list does not yet
  name this decision; it should, once ratified) and leaving it open
  invites the same question to resurface without a citable answer.
- **Immediate adoption of Option C** — rejected for now as premature: no
  bottleneck has yet been observed because Option A's admin tooling does
  not exist yet to be slow. Revisit only with evidence.

---

## Explicit boundary

**Nothing in this document authorizes implementation.** This is a
proposed ADR for product-owner review. If ratified, it should be
committed as `verity-spec/17_decisions/adr/adr-019.md` (status ACCEPTED),
with `CLAUDE.md`'s "Accepted decisions currently in force" section and its
"stale past ADR-012" note updated in the same pass, per
`verity-adr-gate`. Until then, this file is the complete record and no
code, schema, or dependency change should cite it as authority.
