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

## 2. Primary Primitives (The 17-point Structural Checklist)

Every industry-specific concept in Verity is built on top of these primary primitives. They must never be bypassed.

---

### Primitive 1: WORK [DECIDED]

1.  **Definition:** The canonical execution unit representing a single committed service obligation. We distinguish `Work` from:
    *   *Request:* An incoming intake ticket containing uncommitted customer signals.
    *   *Task:* A small sub-step checklist item within a single Work Order (no independent lifecycle).
    *   *Activity:* Timeline log tracking history (e.g., email sent, phone call logged).
    *   *Appointment:* A scheduled time-locked calendar lock on a Resource.
    *   *Project:* A structural container of parent-child related Work Orders.
2.  **Ownership:** Owned by the Tenant `Organization`, scoped to a specific target `Location`.
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
6.  **Actors:** Schedulers (assigners), Workers (executors), Supervisors (verifiers), Clients (requestors).
7.  **Relationships:**
    *   `belongs_to` Customer `Party`.
    *   `assigned_to` capacity `Resource`.
    *   `located_at` target `Location`.
    *   `monitored_by` active `SLA`.
    *   `contains` one-to-many `Documents` (blueprints, manuals, check-in photos).
8.  **Evidence:** Action `submit` requires evidence validation:
    *   GPS coordinate match with Location geofence (if enabled).
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
16. **Extensions:** Uses the `ChecklistTemplate` entity containing a dynamic questions JSON array (specifying ID, type, label, required status, and skip logic) to render field checklist tasks. Technician responses are saved to a decoupled `ChecklistResponse` entity mapping answer data back to the template.
17. **Composition:** Composes with billing and scheduling to create invoice line drafts.

---

### Primitive 2: PARTY [DECIDED]

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

### Primitive 3: RESOURCE [DECIDED]

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
10. **Scheduling:** Governed by a linked `Schedule` entity (reusable named weekly patterns in UTC, converted to local offsets at evaluation). Supports temporary absences (`OutOfOfficeEntry`) with automatic substitute delegation (`toResourceId`), and uses `AssignmentReservation` with a `releaseAt` TTL to prevent concurrent scheduling overlaps.
11. **SLA:** SLA calculations on response time map to the Resource's shift schedule.
12. **Exceptions:** Shift swaps, unplanned leaves, and overtime policies.
13. **Authorization:** Schedulers edit scheduling allocations.
14. **Events Emitted:** `scheduling.resource.booked`, `scheduling.resource.conflict`.
15. **Audit:** Roster edits, shift reassignments, and calendar locks.
16. **Extensions:** Custom skill tag matching arrays (e.g., `["ELECTRICIAN", "HIGH_VOLTAGE"]`).
17. **Composition:** Multi-resource booking (Crews).

---

### Primitive 4: LOCATION [DECIDED]

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

## 3. Decoupled Resource Modeling

The `Resource` primitive acts as an abstraction layer representing schedulable capacity. It has strict rules of operation:

### A. Non-Human Resources
*   **Vehines, Machines, Rooms:** When a physical machine or tool is scheduled, it is represented as a `Resource` profile linked to a physical `Asset` record. It maintains its own calendar of locked availability.
*   **Crews and Teams:** A group of resources can be clustered into a single parent `Resource` (Crew). Schedulers book the Crew, which automatically locks the capacity calendars of all member Resources.

### B. Shared Resource Allocation
*   If a Resource is shared across multiple branches or Locations under the same Tenant Organization, its primary availability calendar tracks conflicts. Schedulers in Branch A cannot assign the Resource during a time slot already locked by Branch B.

### C. Availability, Shifts, and Delegated Substitution
*   **Weekly Templates:** Weekly availability is defined on a `Schedule` entity, storing weekly repeating intervals (days of week, start/end time) in UTC. Timezone offsets are resolved at query time to compute local availability slots.
*   **Absences and Holidays:** Specific date overrides and `OutOfOfficeEntry` records block the base Schedule.
*   **Delegated Substitution:** When a worker creates an `OutOfOfficeEntry`, they can specify a `toResourceId` substitute. Unassigned Work Orders scheduled in their territory during the absence are automatically routed to the substitute resource.


---

## 4. Location Nesting Specification

A `Location` represents any operational space. It supports arbitrary depth nesting via parent-child relations:

```text
  Branch A (Parent Location)
      └─► Site A (Child Location)
            └─► Building A (Grandchild Location)
                  └─► Floor 3 (Area Location)
                        └─► Zone 4 (Zone / Bin / Rack Location)
```

### Location Types:
1.  **Physical Location:** A geographical coordinate region with geofence constraints (Site, Branch).
2.  **Service Location:** A client site address where service work is executed.
3.  **Organizational Location:** An internal office, branch, or team base.
4.  **Inventory Location:** A storage warehouse, depot, or vehicle stock space.
5.  **Employee Home Location:** A reference coordinate used to calculate travel times and route dispatching.
