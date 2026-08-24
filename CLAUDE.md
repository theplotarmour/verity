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

## Experience System — approved visual direction (ADR-011)

Verity's approved visual system is **premium Apple-like minimalism combined with restrained,
purposeful glassmorphism**. The product-owner-supplied Verity reference boards are the visual
target; `verity-app-ui-mockups/` is the identity authority.

- **Do not flatten the UI into generic opaque enterprise-SaaS surfaces.** A sidebar plus opaque
  cards plus hairline borders is the failure mode, not the goal.
- **Brand and accent are separate systems.** The Verity mark is a fixed asset and is never
  recoloured by the interface. The Experience *accent* is configurable — ten approved presets
  (Warm Sand Gold, Champagne, Verity Mint, Ocean Blue, Slate Blue, Indigo, Violet, Emerald,
  Rose, Graphite) plus custom hex — and **defaults to Warm Sand Gold `#D4A017`** because that is
  the brand's colour. The reference boards render in Verity Mint; that is a preset, not a
  rebrand. Semantic colours are independent of both: accent is brand, semantic is meaning.
- **Never hard-code an accent.** Everything derives from `--accent-seed` through `color-mix` in
  `globals.css`. Adding a component needs no accent work; changing the accent needs no component
  work. Contrast is computed in `src/server/platform/accent.ts`, never assumed — white does not
  work on every accent.
- **Glass must be purposeful, accessible, performant and hierarchical.** Apply it by material
  level, never indiscriminately. Dense tables, long-form text, high-density forms, semantic
  status and destructive confirmation stay solid.
- **Never trade accessibility for appearance.** If glass drops text below WCAG AA against the
  *composited* result, change the material — not the requirement.
- **Light and dark are two material interpretations of one system**, not two designs.
- When implementation conflicts with the approved reference, preserve the reference's material
  hierarchy unless doing so violates accessibility, performance, or an explicit higher-order
  product rule.

Anti-regression: do not flatten glass into opaque cards without a stated reason, do not replace
gold with teal, do not reintroduce scarlet, do not remove atmospheric depth, do not turn the
shell into generic SaaS, do not apply glass indiscriminately.

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
8. `.verity-glass` as a class name, and glass applied as **decoration** — indiscriminate
   blur, ornamental transparency, low-contrast text over glass. Structural glass is now
   permitted and expected: see **ADR-011**, which supersedes the stricter reading of
   Bible V4 §1.B that this line previously carried
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
- **ADR-007** Party de-duplication is resolved by invitation + verification: provisioning creates an `Invited` Party with *unverified* contacts and never looks across tenants; identity is linked only when the person verifies a contact channel. Uniqueness is enforced over verified contacts only. `provisionIdentity()` correctly does not de-duplicate.
- **ADR-008** `Resource` is a single schedulable unit backed by exactly one `Party` or `Asset`. Crews, pools, rooms-as-sets and capacity groups are `ResourceGroup` compositions, not a parallel type. Availability and conflict detection run against Resources only. Supersedes ADR-002.
- **ADR-009** `StateCategory` is closed at `Draft | Pending | Active | Blocked | Completed | Cancelled` — behavioural, not domain. SLA clocks read `category` only, never `key` or `label`. Only `Completed` and `Cancelled` may be terminal.
- **ADR-010** The spec `Status` field records **provenance**, not ratification. Only `[UNKNOWN_REASON: INTENTIONALLY_DEFERRED]` (6 uses) withholds permission to implement; every other value is permissive. See `verity-spec/00_governance/status-taxonomy.md`.
- **ADR-011** Glass is a **controlled material system**, not a decoration. Translucency is
  permitted on persistent surfaces where it establishes depth and hierarchy, bound by six
  constraints (composited-contrast AA, capped blur layers, hierarchy-first, light/dark parity,
  reduced-transparency honoured, content over effect). Dense tables, long-form text, forms,
  semantic status and destructive confirmation stay solid. Supersedes the *interpretation* of
  Bible V4 §1.B recorded in `globals.css` and the shell audits — not §1.B's text.

## Identity shape (already decided, do not re-litigate)

`Party` and `User` are **global** tables with no `tenantId`. Authority: Bible V2
Primitive 2 §2 ("Scoped globally to the Platform database, mapped to Organizations
via TenantMembership records") and INV-003, which requires exactly one Party per
person even when they work for several tenants (PLA-IDE-004, the subcontractor).
Adding a `tenantId` to either would force one row per tenant and break INV-003.

Isolation for them is **reachability**, not a tenant column: a tenant sees an
identity only when that identity holds a `TenantMembership` in it. `TenantMembership`
is tenant-scoped and carries the ordinary RLS policy.

- Create identities only via `provisionIdentity()` (`src/server/platform/identity.ts`),
  which calls `verity.provision_identity` and writes Party + User + first membership
  atomically. Direct INSERT into `party` / `user` is denied by RLS, deliberately:
  Postgres applies SELECT policies to `INSERT ... RETURNING`, so a just-created
  identity is unreachable and the write fails.
- Never hard-delete an identity. Bible V2 Primitive 2 §3 ends the lifecycle at
  `Archived`. There is intentionally no deprovision path.
- The model is named `TenantMembership` after Bible V2 Primitive 2 §2/§7; the
  implementation handoff's shorter `Membership` is the same thing, and the Bible
  outranks it.
- No address field on Party — ADR-004 makes Address a separate concept.
- No credential material on User; Supabase Auth owns it, and `authUserId` references
  `auth.users`. Bible V2 Primitive 2 §1 says User "stores credentials and passwords",
  which predates the Supabase decision (EXISTING INFRASTRUCTURE) and is superseded
  in practice by implementation/03-platform-foundation/identity.md.

## Authorization shape (already decided, do not re-litigate)

Permissions are `Verb + Entity + Scope`. `Role` composes into other roles
(`RoleComposition`, spec's name — the handoff's `RoleInheritance` is the same
thing and the spec outranks it), and a parent inherits every permission its
children hold (PLA-AUT-001).

- `entity` is a free string, never an enum — a new capability must add entities
  without touching the platform ontology.
- Verbs are a closed set (PLA-AUT-003); a bespoke capability action is
  `ActionExecute` against a named entity.
- Scopes are `Global | Tenant | Organization | Location` (PLA-AUT-002, refining
  Bible V2 Primitive 2 §13 which omits Organization; ADR-005 requires it). The
  handoff's extra `own` scope appears in neither the Bible nor the spec and was
  deliberately NOT added.
- Flattening runs in the database (`verity.resolve_permissions`) so the recursive
  walk respects the same RLS boundary as any other read.
- Inheritance cycles are blocked by a database trigger, not by application code —
  a cycle would make resolution non-terminating, and resolution runs on every check.
- `TenantMembership.roleId` is nullable: a membership with no role grants nothing,
  so an unassigned membership fails closed.
- `authorize()` throws `ForbiddenError` (`code: "E_FORBIDDEN"`) rather than
  returning false, so forgetting to branch on the result cannot permit the action.
  MET-ACT-002 requires this on every command.

**All three layers are enforced.** Layer 1 `authorize()` decides whether the role
may touch the entity type; Layer 2 `assertRowInScope()` / `scopeFilter()` decides
which records are theirs (Organization scope resolves to the actor's node plus
descendants — PLA-ORG-002 downward visibility and PLA-ORG-003 sibling isolation
in one subtree); Layer 3 `redactFields()` removes restricted fields. The query
pipeline applies Layer 3 automatically to a top-level array result and offers
Layer 2 through `ctx.scope()`.

- Restricted fields are declared in `FieldPermission` and granted by an ordinary
  `Read` on the field-qualified key `<entityKey>#<fieldName>` — no separate
  numeric "level" ladder, which would be a second authorization model to keep in
  sync with the first.
- Redaction **omits** a field rather than nulling it; a null cannot be told apart
  from a genuinely absent value.
- A `Location`-scoped grant currently reaches **nothing**, because Location does
  not exist as an entity yet. It fails closed rather than widening to the tenant.

## Platform substrate added after the foundation (do not re-litigate)

- **Capability contributions** (`contribution.ts`) — a capability declares its own navigation and
  workspace queues. The shell must never hold a capability-to-route map again; that was the coupling
  this replaced. The contract declares *where* a capability appears, never how to draw its page.
- **Temporal model** (`temporal.ts`) — instants are UTC, zones are resolved (organization → tenant →
  explicit UTC) and never guessed. Zones are validated on write because an unrecognised zone silently
  degrades to UTC.
- **SLA substrate** (`sla.ts`) — clock transitions derive from `StateCategory`, never from state keys
  or labels. A capability that declares its states honestly gets correct SLA behaviour with no clock
  code. A resumed clock continues its budget; a record that ran over then completed keeps its breach.
- **Files** (`files.ts`) — two-phase upload; a confirmed file's key, checksum and size are frozen by
  trigger. No storage driver is bound; that is a deployment step, not a missing contract.
- **Notifications** (`notification.ts`) — suppressed notifications are recorded, not dropped.
  Templates substitute literally; an expression language would make a tenant template a stored program.
- **Custom fields** are rendered, validated and submitted end to end. The command re-validates
  server-side because a client check is a convenience, never a control.

## Open — do not solve silently

- `implementation/02-foundation-build-order/vertical-slice-strategy.md` still lists `DEC-BIBLE-001` as open; it was resolved by ADR-001. The ADR wins.
- **`Global` scope is defined but never granted.** PLA-AUT-002 defines cross-tenant platform administration, but honouring it means bypassing the RLS that enforces INV-001. `verity.resolve_permissions` filters `Global` grants out, so such a row can exist without silently taking effect. Wiring it up needs a security decision and an ADR.
- **Credential encryption key location is an implementation decision.** MET-AUT-003 requires an encrypted credential registry but does not say where the key lives. It is currently supplied per call from the application environment and never stored in the database, so a dump yields ciphertext alone. A managed KMS would be stronger and needs a platform decision.
- **`own` permission scope is an open decision.** PLA-AUT-002 enumerates `Global | Tenant | Organization | Location`. `team` and `resource` need no platform change — they are axes and the scope-resolver registry handles them. `own` is actor-relative, appears in neither Bible nor spec, and needs an ADR before it is added.
- **Nothing runs on a schedule.** SLA breach sweeps and notification dispatch are implemented and idempotent but nothing invokes them. Bind a job runner before a capability depends on a deadline firing.
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
