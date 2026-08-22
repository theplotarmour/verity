# VERITY MASTER BIBLE — PRIMITIVE VALIDATION
## Deep Structural Validation of Primary Primitives

This document contains the deep validation of Verity’s four primary primitives (`WORK`, `PARTY`, `RESOURCE`, `LOCATION`) mapping them against the required 17-point structural checklist.

---

## 1. Primitive: WORK [DECIDED]

1.  **Definition:** The canonical execution unit representing a single committed service obligation at a specific site. We distinguish `Work` from other concepts:
    *   *Task:* A small sub-step checklist item within a single Work Order.
    *   *Activity:* Timeline log tracking history (e.g., email sent, phone call logged).
    *   *Request:* Incoming triage ticket representing uncommitted customer signals.
    *   *Appointment:* A scheduled time-locked calendar lock on a Resource.
    *   *Project:* A structural container of parent-child related Work Orders.
2.  **Ownership:** Mapped to the tenant `Organization`. Within the tenant, it is owned by the specific target `Location` where the work is performed.
3.  **Lifecycle (ADR-003):** `Draft` $\rightarrow$ `Scheduled` $\rightarrow$ `In-Progress` $\rightarrow$ `Pending-Verification` $\rightarrow$ `Completed` (execution terminal). Separately, the administrative closure transitions Completed $\rightarrow$ `Closed`.
4.  **States:**
    *   `Draft`: Created, awaiting detail mapping and dispatching.
    *   `Scheduled`: Resource assigned, date/time slot locked.
    *   `In-Progress`: Worker checked in, actively executing.
    *   `Pending-Verification`: Work finished, awaiting supervisor review.
    *   `Completed`: Verified and approved by supervisor (operational terminal state).
    *   `Cancelled`: Withdrawn mid-lifecycle.
    *   `Closed`: Administratively/commercially closed (read-only lock; invoicing is one possible path, not the definition of Closed).
5.  **Transitions:**
    *   `create` $\rightarrow$ `Draft`
    *   `assign` $\rightarrow$ `Scheduled`
    *   `check_in` $\rightarrow$ `In-Progress` (Precondition: Session resource = Assigned resource).
    *   `submit` $\rightarrow$ `Pending-Verification` (Precondition: Evidence uploaded).
    *   `verify` $\rightarrow$ `Completed` (Precondition: Supervisor role).
    *   `close` $\rightarrow$ `Closed` (Precondition: Administrative/business review complete; enforces INV-002 lock).
6.  **Actors:** Schedulers (assigners), Workers (executors), Supervisors (verifiers), Clients (requestors).
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

## 2. Primitive: PARTY [DECIDED]

1.  **Definition (ADR-001):** The single canonical entity representing any human or corporate participant (identity boundary). We decouple capability role-based profiles from the platform Party primitive:
    *   *User:* Stores credentials and passwords. A `User` is linked to a `Party` (role = worker/manager).
    *   *Organization:* Represents the workspace tenant.
    *   *Domain Roles:* Capabilities (like CRM and Workforce) define separate domain-specific profiles (e.g. `Prospect` and `Employee`) with their own lifecycles that map back to the stable platform Party contract.
2.  **Ownership:** Scoped globally to the Platform database, mapped to Organizations via `TenantMembership` records.
3.  **Lifecycle (ADR-001):** Identity lifecycle: `Invited` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Archived`.
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

## 3. Primitive: RESOURCE [DECIDED]

1.  **Definition (ADR-002):** A capacity-constrained operating unit available for scheduling (e.g. human workers, physical tools/machinery). Whether Crews/Teams, Rooms/Spaces, and Capacity Pools are modeled directly as Resources or composite groups is deferred to scheduling capability design.
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

## 4. Primitive: LOCATION [DECIDED]
 
1.  **Definition (ADR-004):** An operational spatial context where work occurs or assets reside. We explicitly decouple:
    *   `Place`: Real-world spatial/physical identity.
    *   `Address`: Address representation for communication.
    *   `Location`: The operational spatial region/context.
    *   `Geofence`: Spatial policy/constraint (radius, coordinates).
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
