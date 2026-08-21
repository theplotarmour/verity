# VERITY MASTER BIBLE — VOLUME II
## Meta-Model, Core Primitives & Configuration Philosophy

This volume defines the conceptual schema of Verity: the dynamic Meta-Model that enables composability, the universal primitives that represent business reality, and the rules of configuration and extension.

---

## 1. The Verity Meta-Model Specification
Verity's architectural core is built on a unified, highly consistent meta-model:

*   **Capability:** A self-contained, domain-specific slice of business functionality (e.g., `Scheduling`, `Billing`, `CRM`). It encapsulates all its Entities, Actions, States, Permissions, and Events.
*   **Entity:** A structured data model representing a physical or logical object in the domain. Every Entity belongs to exactly one Capability.
*   **Field:** An attribute of an Entity with strict validation, naming, and type rules.
*   **Relationship:** A semantic link between Entities (one-to-one, one-to-many, many-to-many).
*   **Action:** A mutating transaction that changes the state of one or more Entities. Actions are the only way to write to the database. They enforce preconditions, validate inputs, check permissions, and emit events.
*   **State:** A static status representation of an Entity. An Entity must always exist in exactly one valid State.
*   **Transition:** An allowed movement from one State to another, triggered exclusively by an Action.
*   **Event:** An immutable, historical fact emitted by a Capability when an Action completes. Events are broadcast to the platform's Event Bus.
*   **Rule:** A deterministic logical assertion that validates data or enforces policy constraints.
*   **Workflow:** A sequence of Actions and State transitions coordinating multiple Entities and Capabilities to complete a business outcome.
*   **Role:** A collection of permissions representing an archetype of authority in the workspace.
*   **Workspace:** A customized screen layout and action queue optimized for a specific Role.

---

## 2. Core Primitives Specification

Every industry-specific concept in Verity is built on top of these 10 universal primitives. They must never be duplicated or bypassed.

---

### Primitive 1: WORK (Work Order) [FACT]
The central execution unit of committed obligations.

1.  **Definition:** The canonical execution unit representing a single committed service obligation at a specific site. We distinguish `Work` from other concepts:
    *   *Task:* A small sub-step checklist item within a single Work Order.
    *   *Activity:* Timeline log tracking history (e.g., email sent, phone call logged).
    *   *Request:* Incoming triage ticket representing uncommitted customer signals.
    *   *Appointment:* A scheduled time-locked calendar lock on a Resource.
    *   *Project:* A structural container of parent-child related Work Orders.
2.  **Ownership:** Owned by the tenant Organization, scoped to a specific target Location (site).
3.  **Lifecycle:** `Draft` $\rightarrow$ `Scheduled` $\rightarrow$ `In-Progress` $\rightarrow$ `Pending-Verification` $\rightarrow$ `Completed` (or `Cancelled`/`Closed`).
4.  **States:** 
    *   `Draft`: Created, awaiting detail mapping and dispatching.
    *   `Scheduled`: Resource assigned, date/time slot locked.
    *   `In-Progress`: Worker checked in, actively executing.
    *   `Pending-Verification`: Work finished, awaiting supervisor review.
    *   `Completed`: Verified and approved by supervisor (terminal for execution).
    *   `Cancelled`: Withdrawn mid-lifecycle.
    *   `Closed`: Invoiced and archived (read-only lock).
5.  **Transitions:**
    *   `create` $\rightarrow$ `Draft`
    *   `assign` $\rightarrow$ `Scheduled`
    *   `check_in` $\rightarrow$ `In-Progress` (Precondition: Session resource = Assigned resource).
    *   `submit` $\rightarrow$ `Pending-Verification` (Precondition: Evidence uploaded).
    *   `verify` $\rightarrow$ `Completed` (Precondition: Supervisor role).
    *   `close` $\rightarrow$ `Closed` (Precondition: Invoicing complete).
6.  **Actors:** 
    *   *Dispatcher:* Assigns resource, sets scheduled times.
    *   *Worker:* Executes the work, uploads evidence.
    *   *Supervisor:* Verifies outcomes, handles overrides.
    *   *Client:* Receives progress notifications, signs off on completion.
7.  **Relationships:**
    *   `belongs_to` Customer `Party`.
    *   `assigned_to` capacity `Resource`.
    *   `located_at` target `Location`.
    *   `monitored_by` active `SLA`.
    *   `contains` one-to-many `Documents` (blueprints, manuals, check-in photos).
8.  **Evidence:** Action `submit` requires evidence validation:
    *   GPS coordinate match with Location geofence.
    *   Min 1 photo upload showing completed work.
    *   Customer signature capture if billing is service-based.
9.  **Assignment:** Linked to a `Resource`. A Work Order can only be assigned to a Resource whose calendar has availability and whose skill tags cover the Work Order qualifications.
10. **Scheduling:** Binds the Work Order to a start and end Datetime on the Resource scheduler.
11. **SLA:** Resolves to resolution timer rules.
    *   *Start:* Transition to `Scheduled` or `In-Progress`.
    *   *Pause:* State = `Draft` or when blocked by external material dependencies.
    *   *Breach:* Current time $>$ `sla_deadline_at` while state $\neq$ `Completed`.
    *   *Stop:* State = `Completed`.
12. **Exceptions:**
    *   *No-Show:* Automated rule runs if check-in is late by grace minutes $\rightarrow$ state moves back to `Draft` for dispatch, alerts supervisor.
    *   *Incomplete Work:* Worker submits `Partially Completed` status with reasons $\rightarrow$ spawns a secondary child Work Order.
13. **Authorization:** Schedulers can write and assign. Workers can only modify status to `In-Progress` and `Pending-Verification`. Supervisors can run the `verify` action.
14. **Events Emitted:**
    *   `work_order.job.created`, `work_order.job.assigned`, `work_order.job.started`, `work_order.job.completed`, `work_order.job.cancelled`.
15. **Audit:** Records previous status, new status, modifier ID, coordinates, and timestamp on every transition.
16. **Extensions:** Supports dynamic JSONB schema extensions for checklist templates.
17. **Composition:** Composes with billing and scheduling to create invoice line drafts.

---

### Primitive 2: PARTY [FACT]
The universal identity actor.

1.  **Definition:** The single canonical entity representing any human or corporate participant. We distinguish `Party` from other concepts:
    *   *User:* Stores credentials and passwords. A `User` is linked to a `Party` (role = worker/manager).
    *   *Organization:* Represents the workspace tenant.
2.  **Ownership:** Scoped globally to the Platform database, mapped to Organizations via `TenantMembership` records.
3.  **Lifecycle:** `Invited` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Archived`.
4.  **States:** `Invited`, `Active`, `Suspended`, `Archived`.
5.  **Transitions:**
    *   `accept_invite` $\rightarrow$ `Active`.
    *   `suspend` $\rightarrow$ `Suspended`.
    *   `archive` $\rightarrow$ `Archived`.
6.  **Actors:** Tenant Administrators, Platform Support.
7.  **Relationships:**
    *   `owns` many-to-many `TenantMemberships`.
    *   `associated_with` zero-or-one `Resource` profile.
8.  **Evidence:** Verified email or phone (via OTP verification).
9.  **Assignment:** Assigned to roles inside specific Tenants (e.g. guard, site inspector).
10. **Scheduling:** Roster availability is defined on their linked `Resource` profile.
11. **SLA:** N/A.
12. **Exceptions:** SIM card phone number recycling grace periods. If a worker profile is suspended, their phone registration is locked for 30 days.
13. **Authorization:** Access levels are defined at the `TenantMembership` level (Scopes: Global, Tenant, Site).
14. **Events Emitted:** `party.profile.updated`, `party.membership.revoked`.
15. **Audit:** Changes to contact details and permissions are written to the security log.
16. **Extensions:** Metadata JSONB field for custom attributes.
17. **Composition:** Composes with user logins to authorize execution.

---

### Primitive 3: RESOURCE [FACT]
The capacity-constrained scheduling unit.

1.  **Definition:** A capacity-constrained unit available for shift/work allocation. We distinguish `Resource` from:
    *   *Employee:* HR contract record (salary, leaves).
    *   *Asset:* Physical equipment model.
2.  **Ownership:** Scoped to a specific Location or Tenant Organization.
3.  **Lifecycle:** `Active` $\rightarrow$ `In-Maintenance` $\rightarrow$ `Inactive`.
4.  **States:** `Available`, `Booked`, `In-Maintenance`, `Inactive`.
5.  **Transitions:**
    *   `schedule_work` $\rightarrow$ `Booked` (Precondition: Availability calendar is clear).
    *   `release_schedule` $\rightarrow$ `Available`.
6.  **Actors:** Dispatcher, Scheduling Engine.
7.  **Relationships:**
    *   `represents` either a human `Party` or a physical `Asset`.
    *   `bound_to` Location branch context.
8.  **Evidence:** Qualification and certification logs.
9.  **Assignment:** Can be assigned to `ShiftSchedules` and `Work Orders`.
10. **Scheduling:** Evaluated via a weekly timeline matrix (day-of-week, start_time, end_time, buffer_duration).
11. **SLA:** SLA calculations on response time map to the Resource's shift schedule.
12. **Exceptions:** Shift swaps, unplanned leaves, and overtime policies.
13. **Authorization:** Schedulers edit scheduling allocations.
14. **Events Emitted:** `scheduling.resource.booked`, `scheduling.resource.conflict`.
15. **Audit:** Roster edits, shift reassignments, and calendar locks.
16. **Extensions:** Custom skill tag matching arrays (e.g., `["ELECTRICIAN", "HIGH_VOLTAGE"]`).
17. **Composition:** Multi-resource booking (Crews).

---

### Primitive 4: LOCATION [FACT]
The hierarchical geofenced spatial boundary.

1.  **Definition:** A physical coordinate region where operations occur. We distinguish `Location` from:
    *   *Warehouse:* Storage stock location. A warehouse is a `Location` with inventory capability turned on.
2.  **Ownership:** Tenant Organization.
3.  **Lifecycle:** `Setup` $\rightarrow$ `Active` $\rightarrow$ `Decommissioned`.
4.  **States:** `Setup`, `Active`, `Decommissioned`.
5.  **Transitions:**
    *   `activate` $\rightarrow$ `Active`.
    *   `decommission` $\rightarrow$ `Decommissioned`.
6.  **Actors:** Managers, Site Admins.
7.  **Relationships:**
    *   `parent_of` sub-locations (building $\rightarrow$ floor $\rightarrow$ room).
    *   `hosts` many `Assets`.
8.  **Evidence:** Geofence coordinates (lat, lng, radius in meters).
9.  **Assignment:** Binding workforce shift check-ins to geofence compliance.
10. **Scheduling:** Operating hours calendar (e.g. open from 09:00 to 18:00).
11. **SLA:** Travel distance and location-transit times are computed relative to the Location address.
12. **Exceptions:** GPS drift on check-in. Bypassed only through supervisor overrides.
13. **Authorization:** Location boundaries can only be edited by Tenant Administrators.
14. **Events Emitted:** `sites.location.created`, `sites.location.updated`.
15. **Audit:** Track geofence border changes and supervisor bypass history.
16. **Extensions:** Floor map uploads and custom gate access instructions.
17. **Composition:** Aggregating sites into city/regional branch clusters.

---

## 3. Duplicate Resolution & Unification Rules

We establish strict rules to resolve Odoo's architectural duplicates:

1.  **Contacts vs. Customers vs. Employees:**
    *   *Rule:* We forbid duplicate records. An individual is mapped exactly once as a `Party`. If they are hired, a `Resource` profile and `EmployeeProfile` are added. If they buy services, a `CustomerProfile` is attached. They retain the same `partyId` across all modules.
2.  **Tasks vs. Activities:**
    *   *Rule:* We separate history from delivery. Simple follow-up checks are stored as `ActivityLogs` (timeline elements). Structural deliverables with states and SLAs are stored as `Work Orders`.
3.  **Tickets vs. Service Requests:**
    *   *Rule:* Incoming signals from customer portals, helpdesks, or phone lines are registered as `Requests`. A `Request` has a triage phase. Once confirmed, it is closed and spawns a `Work Order` for execution.
4.  **Schedules vs. Shifts vs. Appointments:**
    *   *Rule:* A `Shift` is the time profile template. A `ShiftSchedule` maps a human resource to a `Shift` on a date. An `Appointment` is a time slot lock booked by a customer. Both consume `Resource` capacity.
5.  **Locations vs. Warehouses:**
    *   *Rule:* A warehouse or storage location is simply a `Location` entity that has inventory tracking enabled. We do not maintain a separate `stock.location` database table.
