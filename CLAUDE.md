# Verity — Claude Code Project Memory

## What this is

Verity is a **module-driven business operating platform** for service-driven organizations.
It is a **platform substrate**, not a product for any one industry. Internal admins assemble
reusable capabilities, packs, and system templates into configured tenant workspaces.

Core architectural principle (Authority: Bible V1 §3.A) — **standardize the foundation, not every behavior**:

```
STANDARDIZED PLATFORM FOUNDATION
    -> PURPOSE-BUILT REUSABLE CAPABILITIES
    -> INDUSTRY / DOMAIN PACKS
    -> CONFIGURATION
    -> CONTROLLED CLIENT EXTENSIONS
```

Do not drift to either extreme (everything configurable / everything hard-coded).

## Current objective: VERITY PLATFORM FOUNDATION READY

We are **not** building for a client yet. We are building the operating-system substrate
to the point where it can receive arbitrary future capabilities and client systems
**without redesign of the foundation**.

**Not in scope now**: CRM, Sales, Procurement, Inventory, Security Operations, Staffing,
Facilities, Field Service, Maintenance, Commerce, Finance, Work Order as a finished business
capability, any industry pack, any client-specific module, any polished product UI.

`Party` is the first vertical slice **only as a platform proving slice** — it exercises
Tenant -> Organization -> Party -> User -> Membership -> Role -> Permission -> Entity ->
Command -> State -> Event -> Audit. Keep it minimal and foundational. Do not grow it into
CRM, workforce, or customer management.

The milestone is **PLATFORM FOUNDATION READY** — never "Party Complete", "Work Order
Complete", or "First Client Complete".

### Foundation-ready definition

Foundation is ready only when a new capability can be registered, new entities / workflows /
permissions / events / specialized UI / client configuration introduced, and cross-capability
dependencies declared — each **without** modifying unrelated platform infrastructure, the
platform ontology, the workflow engine, the authorization architecture, the event
infrastructure, the application shell, or forking a reusable capability. Capabilities built
for one client must be reusable by the next.

### Build priority (in order)

1. Clean repository / bootstrap
2. Tenant isolation
3. Identity / membership
4. Authorization
5. Canonical entity runtime
6. Command / query infrastructure
7. State / transition infrastructure
8. Event / audit infrastructure
9. Rules / workflow infrastructure
10. Configuration / capability / extension infrastructure
11. Required data / sync infrastructure
12. Minimal experience shell / runtime
13. Foundation conformance tests
14. Hypothetical future-capability validation

## Authority order

```
Explicit Verity Decision / ADR  ->  Verity Bible (verity-bible/)
    ->  Master Platform Specification (verity-spec/)
    ->  Implementation Handoff (implementation/)
    ->  Reference evidence  ->  Legacy VEDA code (lowest, forensic only)
```

Conflict resolution: **Safety > Truth > Coherence > Usefulness > Simplicity > Flexibility > Polish**.

Read before implementing: `implementation/00-build-charter/`, then
`implementation/02-foundation-build-order/`, then the relevant `verity-spec/` section.
Read `verity-spec/17_decisions/adr/` only for the subsystem you are touching.

**Research evidence, not implementation authority** — do not read as normal context:
`odoo-prd/`, and the Odoo / Frappe / Temporal / n8n / Keycloak / Cal.com reference material
under `verity-bible/reference/`. Consult only for explicit provenance investigation, and say
so when you do.

Every concrete technology choice must cite its authority using one of:
`Authority: Bible V[N], [section]` | `Authority: Bible Synthesis, ADOPTED/ADAPTED` |
`Authority: Spec [REQ-ID]` | `Authority: DEC-[N]` | `Authority: EXISTING INFRASTRUCTURE` |
`Authority: IMPLEMENTATION DECISION REQUIRED`.

## Constitutional invariants (non-negotiable)

- **INV-001** Strict tenancy isolation — every read/write filtered by tenant; no cross-tenant foreign keys.
- **INV-002** Read-only closed states — a closed Work Order is permanently locked; rework spawns a child.
- **INV-003** Unified Party identity — one Party record per person/business; no split tables.
- **PRN-001** Least surprise / explainable automation.
- **PRN-002** Progressive disclosure of complexity.

Tenant context is derived from the authenticated authorization context, **never** from a
client-supplied request payload (Spec PLA-TEN-006, `[DECIDED]`).

## Database connection roles (INV-001 depends on this)

PostgreSQL does **not** enforce row-level security for a role that is `SUPERUSER`
or has `BYPASSRLS` — `FORCE ROW LEVEL SECURITY` does not change that. Such a
connection has no tenant isolation at all while every policy remains present and
every test still passes. Supabase's default `postgres` role has `rolbypassrls = true`
and must never carry application traffic.

- `DATABASE_URL` -> `verity_app` (`NOSUPERUSER NOBYPASSRLS`), the runtime connection.
- `DIRECT_URL` -> `postgres`, used only by `prisma migrate`.
- `assertRlsEnforceable()` in `src/server/platform/tenancy.ts` refuses a bypassing role
  at startup and in the isolation test. Do not weaken or bypass it.
- Migrations run as `postgres`; `ALTER DEFAULT PRIVILEGES` grants each new table to
  `verity_app` automatically, so no post-migration grant step is needed.
- Tenant scope is applied by `withTenant()`, which sets the `verity.tenant_id` GUC
  transaction-locally via `set_config`. With no scope set, queries return nothing and
  writes are rejected — isolation fails closed.

## Canonical terminology (Spec GOV-TER-001..017) — use these words only

| Use | Never |
|---|---|
| `Organization` (tenant boundary) | — |
| `Party` | `client_obj`, `contact_entity` |
| `User` (1:1 with Party) | — |
| `Work` (Work Order) | `job_card`, `task`, `ticket_item`, `event_run` |
| `ChecklistItem` | `Task` (reserved for project-level milestones) |
| `Location` (site) | `branch`, `depot`, `factory_outlet` |
| `Resource` | `employee_row`, `tool_entry` |
| `Request` (uncommitted intake) | — |
| `Activity` (change / comms log) | — |
| `Asset` (physical equipment) | — |
| `Contract` (agreement with SLA terms) | — |
| `Evidence` (immutable field data) | — |

## Forbidden patterns — legacy VEDA, grep-able, never write these

This repository is greenfield. Legacy VEDA lives only in git tag `veda-legacy-final` and is
non-authoritative. No `legacy_archive/` in the active tree. Never resurrect VEDA schemas,
workflows, routes, or terminology, and never add a compatibility layer for them.

1. `factoryId` / `factory_id` — use `tenantId` / `organizationId` (Spec PLA-TEN-001)
2. `Department` as a production stage (CAD/Cutting/Stitching/QC/Packing) — use dynamic state machines
3. SalesOrder automotive columns: `vehicleBrandId`, `vehicleModelId`, `vehicleYear`, `seatType`, `hasArmrest`, `headrestCount` — use custom fields (Spec PLA-EXT-001)
4. `ItemType` enum values: `RAW_MATERIAL`, `SEMI_FINISHED`, `FINISHED_PRODUCT`, `CONSUMABLE`, `PACKAGING`, `SPARE_PART`, `MACHINERY`, `TOOL`, `ASSET` — use extensible taxonomies
5. `SpecRefTarget` enum: `VEHICLE_BRAND`, `VEHICLE_MODEL`, `VEHICLE_GENERATION`, `DESIGN`, `COLOR`
6. `SystemRole` enum: `OWNER`, `CO_OWNER`, `MANAGER`, `SUPERVISOR`, `WORKER`, `STORE_MANAGER` — use dynamic Verb+Entity+Scope permissions
7. Entities `ProductionBatch`, `BomMode`, `QCTemplate`
8. `.verity-glass` / glassmorphism as UI identity (banned, Bible V4)
9. Routes `/owner`, `/worker`, `/inspector`, `/supervisor`, `/verity` (legacy role-based routing)
10. `@@map` to VEDA schema naming

Also forbidden: franchise/pack framing from the old product (`facility_management`,
`franchise_qsr`, `franchise_retail` as hardcoded pack keys), MES/manufacturing concepts, and
any requirement written because it is "common in ERP/SaaS" rather than traced to the spec.

## Accepted decisions currently in force

- **ADR-001** Party is a bare identity primitive. `Prospect` / `Invited` lifecycles belong to CRM / Workforce capabilities, not the platform.
- **ADR-003** `Completed` (execution terminal) is decoupled from `Closed` (administrative closure). INV-002 locks on `Closed`.
- **ADR-004** `Place`, `Address`, `Location`, `Geofence` are four distinct concepts. Geofences are policies, not Locations.
- **ADR-005** `Tenant` is the root data-isolation boundary; `Organization` is a nested business-unit hierarchy inside a Tenant. RLS is one *mechanism* for tenant isolation, not the product invariant.
- **ADR-006** Work sub-steps are `ChecklistItem`. `Task` is reserved for project-level milestones.

## Open — do not solve silently

- **ADR-002 / DEC-BIBLE-002** Resource scope (single actor vs crews/pools/spaces) is `DECISION_REQUIRED` and intentionally deferred. Build so it can be incorporated cleanly; do not invent a final Resource architecture.
- **Spec status taxonomy is undefined.** `[UNKNOWN_REASON: FUTURE_CAPABILITY]` (1096 uses) and `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]` (722 uses) appear throughout `verity-spec/` but are defined nowhere. It is unresolved whether these mark ratified-but-unbuilt requirements or unratified ones. Escalate before relying on the status of a requirement.
- `implementation/02-foundation-build-order/vertical-slice-strategy.md` still lists `DEC-BIBLE-001` as open; it was resolved by ADR-001. The ADR wins.
- **The Bible is not editable.** One amendment (AMD-001, `factoryId` -> `tenantId`, Volume V §1.A.1 and Volume VI) was authorised by the product owner as a one-time edit and is already applied. Do not modify `verity-bible/` again without a fresh explicit instruction.

## Stop conditions — escalate, do not improvise

Stop and surface the issue when: a foundation invariant is ambiguous; two authorities
conflict; an unresolved ADR affects the work; a security boundary is unclear; a new platform
primitive appears necessary; a capability would require undocumented modification of the
platform core; the work would force a client-specific fork.

Classify the gap as **missing specification**, **conflicting specification**, **missing ADR**,
or **implementation decision required** — then continue only with work that is unblocked.
Never fill a gap with generic engineering knowledge, and never promote an implementation
choice into a constitutional rule.

Distinguish: product requirement / domain rule / architectural decision / implementation
decision. Implementation mechanics (file organization inside the approved structure, internal
helpers) are autonomous. Anything affecting product behavior is not.

## Security rule

Security is part of the foundation, never bolted on later. For every mutating operation
determine: actor, authorization, scope, preconditions, state mutation, audit, events, failure
behavior. Tenant isolation and authorization semantics hold from the first commit.
Never expose real secret values in documentation or code.

## Command / state / event vocabulary — do not blur

`Command` = request to perform an action. `State` = current business condition.
`Event` = fact that something happened. `Query` = read current state.
`Projection` = derived read representation. Never bypass the prescribed write path.

## Repository structure (target)

```
src/
  app/            (hq)/ (owner)/ (worker)/ (portal)/ shells + api/   [Bible V4]
  server/         platform/ (tenancy, auth, identity)
                  capabilities/ (one directory per capability)
                  runtime/ (entity, command, query, state, event)
  lib/ components/ui/ hooks/ types/ test/
prisma/           schema.prisma, migrations/
```

No UI or hooks in `src/server/`. No Prisma imports in `src/app/` (except API routes) or
`src/components/` — all DB access goes through `src/server/`. Unit tests sit beside their
source; integration tests in `src/test/`.

Stack (Authority: EXISTING INFRASTRUCTURE): Next.js 16.2.10, React 19.2.4, Prisma 6.12,
PostgreSQL, Supabase Auth, Vitest, Playwright. System of record is Prisma/Postgres
(Authority: Bible V1).

## Implementation loop

```
READ SPEC -> IDENTIFY REQUIREMENT IDS -> CHECK DEPENDENCIES -> IMPLEMENT -> WRITE TESTS
-> RUN TESTS -> SPEC-CONFORMANCE CHECK -> CHECK ARCHITECTURAL BOUNDARIES
-> CHECK FOR LEGACY CONTAMINATION -> TRACE TO SPEC -> COMMIT
```

Code compiling is not completion.

## Reporting vocabulary — keep these distinct

- **BUILT** — platform infrastructure actually implemented.
- **PROVEN** — foundation behavior validated by passing tests.
- **DEMONSTRATED** — a hypothetical capability modeled on the foundation (on paper).
- **NOT YET BUILT** — business capability intentionally unimplemented.

Never report hypothetical composition as implemented functionality.

Before declaring a milestone complete, answer: requirements implemented / not implemented;
tests; architecture conformance PASS or FAIL; legacy contamination NONE or FOUND; open
decisions; known deviations; ready for next milestone YES or NO.

## graphify

Knowledge graph at `graphify-out/` (structural only — document, heading, and cross-reference
edges; no semantic pass has been run).

- For questions about the corpus, run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for a focused subgraph. These return far less than `GRAPH_REPORT.md` or raw grep.
- Read `graphify-out/GRAPH_REPORT.md` only for broad review, or when query/path/explain do not surface enough.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

Bible **Volume 2 (Metamodel Primitives)** is the load-bearing document — 85% of all
spec-to-bible citations resolve there. Volume 5 (Operations & Security) is second.

## Commands

```bash
npm run typecheck
npm run test
npm run build
```

Next.js 16 has breaking changes from earlier versions — read `node_modules/next/dist/docs/`
before touching framework-sensitive code.
