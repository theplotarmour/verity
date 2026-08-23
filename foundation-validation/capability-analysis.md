# Hypothetical Capability Analysis

Eight capabilities modelled against the platform foundation. None is implemented; none should be.
For each, the six questions from the foundation acceptance test.

A recurring answer appears throughout and is stated once here rather than eight times:

- **Reused by all of them**: Tenant, Organization, Party, User, TenantMembership, Role, Permission,
  EntityDefinition, StateDefinition, TransitionDefinition, the command pipeline, the event outbox,
  both audit streams, CustomFieldSchema, ConfigParameter, the workflow engine, and the experience
  descriptors. This is the point of a foundation: the shared answer is long and the per-capability
  answer is short.
- **Needed by all of them, and now enforced**: row-level scoping (PLA-AUT-004). An
  Organization-scoped grant reaches the actor's node and its descendants, which is what every
  "sees only their own site" requirement below reduces to.

---

## 1. Security Operations

Guard patrols, checkpoint scans, incident reports, post orders.

| Question | Answer |
|---|---|
| Platform primitives reused | Work lifecycle via states/transitions; Evidence as an entity with the audit stream; scheduled patrols via workflow Trigger nodes |
| Inside the capability | Patrol route modelling, checkpoint proximity logic, incident severity escalation rules |
| Configuration | Patrol frequency, grace periods, escalation thresholds — all `ConfigParameter` at Tenant or Organization scope |
| Extension | Client-specific incident attributes (`site_hazard_class`, `client_ref`) as custom fields |
| New reusable capability | **Evidence** (GPS, photo, signature capture) is genuinely reusable — Field Service, Facilities and Drone Inspection all want it. It should be built once as a capability, not inside this one |
| Core modification | **No.** Row-level scoping is required so a guard sees only their assigned site |

---

## 2. Staffing

Shift rostering, availability, swaps, timesheets.

| Question | Answer |
|---|---|
| Platform primitives reused | Party/User/Membership for the workforce; Role for skill-based assignment; state machine for shift lifecycle; workflow for swap approval |
| Inside the capability | Rostering algorithm, availability windows, overtime and fatigue rules |
| Configuration | Shift lengths, break rules, overtime multipliers, swap approval thresholds |
| Extension | Union agreement fields, regional labour-law attributes |
| New reusable capability | **Scheduling** — the availability/conflict engine is wanted by Field Service, Facilities and Medical Equipment Maintenance too |
| Core modification | **No**, but blocked on **ADR-002**. Rostering a *crew* rather than a person is exactly the open Resource question. The capability can be built for individuals today and extended when ADR-002 resolves |

---

## 3. Facilities

Cleaning and maintenance across multi-site portfolios.

| Question | Answer |
|---|---|
| Platform primitives reused | Organization hierarchy for site portfolios (PLA-ORG-001 nesting is a direct fit); Work lifecycle; recurring schedules via workflow triggers |
| Inside the capability | Service-level definitions, area/zone modelling, inspection scoring |
| Configuration | Cleaning frequencies, quality thresholds, SLA windows |
| Extension | Building-specific attributes (floor count, access codes) |
| New reusable capability | **Location** (ADR-004's `Place`/`Address`/`Location`/`Geofence` split) — needed identically by Security Operations and Field Service |
| Core modification | **No.** Organization nesting and downward visibility (PLA-ORG-002) already model a portfolio |

---

## 4. Field Service

Dispatch, travel, on-site work, parts.

| Question | Answer |
|---|---|
| Platform primitives reused | Work state machine; assignment through Membership and Role; offline sync inbox for technicians with no signal; Evidence for proof of work |
| Inside the capability | Dispatch optimisation, travel-time estimation, parts consumption |
| Configuration | Travel-rate assumptions, dispatch radius, SLA clocks per service type |
| Extension | Equipment-specific service attributes |
| New reusable capability | **Scheduling**, **Location**, **Evidence** — all shared, none of them Field Service's private property |
| Core modification | **No.** This is the capability the offline sync engine was designed for; Bible V5 §2's conflict rules were written with exactly this shape in mind |

---

## 5. Professional Services

Project delivery, timesheets, milestone billing.

| Question | Answer |
|---|---|
| Platform primitives reused | `Task` as the project-level milestone (GOV-TER/ADR-006 reserves the term for precisely this); state machine for project phases; workflow for approval chains |
| Inside the capability | Project planning, milestone dependency, utilisation calculation |
| Configuration | Billing rates, approval thresholds, utilisation targets |
| Extension | Client-specific project metadata |
| New reusable capability | **Approval** — a generic multi-step approval chain wanted by Staffing, Finance and Procurement alike |
| Core modification | **No.** Bible V5 §3's billing boundary already says the billing engine listens to operational events rather than blocking them, which this capability follows |

---

## 6. Drone Inspection — *demonstrated*

Flight planning, aerial survey, regulatory filing.

| Question | Answer |
|---|---|
| Platform primitives reused | Demonstrated in full: entity registry, four-state lifecycle, command pipeline, event outbox, Activity audit, custom fields, configuration, workflow engine, navigation and form descriptors |
| Inside the capability | Flight planning, airspace rules, telemetry ingestion |
| Configuration | `drone.max_altitude_m`, enforced as a command precondition — a real business rule with no code change |
| Extension | `airframe`, `max_altitude_m`, `airspace_class` as tenant custom fields |
| New reusable capability | **Evidence** again — aerial imagery is the same primitive as a site photograph |
| Core modification | **No — verified, not assumed.** `git status` confirms no file under `src/server/platform`, `src/components` or `prisma` changed to support it |

---

## 7. Fleet Management

Vehicles, servicing, compliance, drivers.

| Question | Answer |
|---|---|
| Platform primitives reused | Asset lifecycle via state machine; Party/User for drivers; workflow for service-due automation; audit for compliance history |
| Inside the capability | Odometer tracking, service-interval logic, compliance-document expiry |
| Configuration | Service intervals, inspection frequencies, document expiry warnings |
| Extension | Vehicle attributes — **note**: as custom fields, never as core columns. Forbidden pattern #3 exists precisely because VEDA put `vehicleBrandId` and `vehicleModelId` into a core sales table |
| New reusable capability | **Asset** — shared with Medical Equipment Maintenance and Facilities |
| Core modification | **No**, but ADR-002 again: a vehicle is a schedulable non-human resource |

---

## 8. Medical Equipment Maintenance

Calibration, servicing, regulatory traceability.

| Question | Answer |
|---|---|
| Platform primitives reused | Asset lifecycle; append-only audit — the infinite retention of EXE-AUD-001 is a regulatory requirement here, not a convenience; Evidence for calibration certificates |
| Inside the capability | Calibration schedules, tolerance calculations, regulatory report generation |
| Configuration | Calibration intervals, tolerance bands, certification bodies |
| Extension | Device class, regulatory identifiers |
| New reusable capability | **Asset**, **Evidence**, **Scheduling** |
| Core modification | **No.** The immutability guarantee the audit stream already enforces by trigger is what makes this domain viable — and it holds even against a `BYPASSRLS` role, which is what a regulator would actually ask about |

---

## Foundation-ready assessment

| | Condition | Status |
|---|---|---|
| A | New capability registered without changing unrelated infrastructure | **Met** — demonstrated. Note: registration includes a migration, so installation is a deploy-time event |
| B | New entities without modifying the platform ontology | **Met** — demonstrated with a table and lifecycle the platform had never seen |
| C | New workflows without rewriting the engine | **Met** — demonstrated with two registered node handlers and a conditional edge |
| D | New permissions without changing the authorization architecture | **Met** — new Verb+Entity+Scope grants need no change, and all three layers are enforced: entity-level (PLA-AUT-003), row-level via organization subtree (PLA-AUT-004), field-level omission (PLA-AUT-005) |
| E | New events without modifying event infrastructure | **Met** — the capability emitted its own event name into the shared outbox |
| F | New specialized UI without rewriting the shell | **Met** — navigation and forms were generated from metadata alone |
| G | New client configuration without forking a capability | **Met** — a configuration value acted as a business rule |
| H | Capabilities depending on each other through declared contracts | **Met** — dependency resolution and its reverse are enforced by trigger |
| I | Capabilities purpose-built internally without contaminating the core | **Met** — all domain specifics lived in the capability's own table, custom fields and handlers |
| J | Client systems reusing capabilities built for previous clients | **Met structurally** — activation is per tenant with versions pinned. Unproven in practice until a second client exists |

## Recommended next decisions

1. ~~Implement PLA-AUT-004 row-level scoping.~~ **Done.** Both remaining layers are enforced.
2. ~~Resolve ADR-002 (Resource scope).~~ **Done** — ADR-008 adopts a single-unit `Resource` with
   `ResourceGroup` compositions, decided on the evidence in this document.
3. **Build Evidence, Location, Scheduling, Asset and Approval as shared capabilities** before any
   client work. Each was independently demanded by three or more of the eight; building them inside
   the first client would guarantee the second client forks them. ADR-008 fixes the shape
   `Scheduling` and `Asset` must take, so they can now be built without re-litigating it.

Every `Location`-scoped permission grant currently reaches nothing, by design, because `Location`
does not exist as an entity yet. It fails closed rather than widening to the tenant, and building
the Location capability is what activates it.
