# Verity Master Platform Specification

## 17_decisions/unresolved.md

This document contains the register of active, unresolved design decisions for the Verity platform.

---

### DEC-BIBLE-001: Party Lifecycle Initial State
*   **Decision ID**: DEC-BIBLE-001
*   **Question**: What should be the initial state of the canonical `Party` lifecycle?
*   **Context**: `concept-inventory.md` defines the lifecycle starting at `Prospect`, while `primitive-validation.md` / `volume_2_metamodel_primitives.md` define it starting at `Invited`.
*   **Affected Concepts**: `Party`, `User`, `Membership`, `CRM`
*   **Evidence**: Odoo uses `res.partner` directly (which has no strict state-machine, but has an active boolean). Keycloak uses User registration / invitation flows.
*   **Evidence Location**: Keycloak UserModel registration state; Odoo Partner active flag.
*   **Options**:
    *   *Option A*: Initial state is `Prospect`. Pros: matches CRM Lead conversion workflow. Cons: confusing for employees/contractors.
    *   *Option B*: Initial state is `Invited`. Pros: fits workforce registration and identity invites. Cons: CRM prospects are not "invited".
*   **Recommendation**: Branch the initial state depending on the Party role definition: CRM profiles start as `Prospect`, workforce profiles start as `Invited`.
*   **Status**: `DECISION_REQUIRED`
*   **Owner**: Product Owner
*   **Resolution**: Pending review.
*   **Supersedes**: None
*   **Superseded By**: None
*   **Confidence**: `HIGH`

---

### DEC-BIBLE-002: Resource Representation Scope
*   **Decision ID**: DEC-BIBLE-002
*   **Question**: Should `Resource` encompass composite spaces, crews, and teams directly, or represent single actors?
*   **Context**: `concept-inventory.md` includes "team" and "space" in `Resource` definitions. `primitive-validation.md` restricts `Resource` to representing 1:1 human `Party` or physical `Asset`.
*   **Affected Concepts**: `Resource`, `Asset`, `Party`
*   **Evidence**: Cal.com availability models allow team/collective hosting. Odoo HR maps resources to employees or equipment.
*   **Evidence Location**: Cal.com EventType/Host DB structure; Odoo resource.resource model.
*   **Options**:
    *   *Option A*: Standalone crews are first-class Resources with their own calendar profiles. Pros: easier top-level booking. Cons: calendar double-booking conflicts across members are hard to trace.
    *   *Option B*: Resources strictly represent a single human or physical Asset; crews are composite groups of child resources. Pros: clear conflict boundaries. Cons: requires group aggregation logic during dispatch query.
*   **Recommendation**: Option B. Keep Resource as a single actor, handle crew booking through the group composition layer.
*   **Status**: `DECISION_REQUIRED`
*   **Owner**: Product Owner
*   **Resolution**: Pending review.
*   **Supersedes**: None
*   **Superseded By**: None
*   **Confidence**: `HIGH`

---

### DEC-BIBLE-003: Terminal State Path of Work Orders
*   **Decision ID**: DEC-BIBLE-003
*   **Question**: How is the terminal state path and archiving logic structured for `Work`?
*   **Context**: `concept-inventory.md` has the path ending at `Completed -> Closed`. `primitive-validation.md` separates `Completed` (execution terminal) and `Closed` (financial archive lock).
*   **Affected Concepts**: `Work`, `SLA`, `Invoice`
*   **Evidence**: Odoo work orders close when production completes. Invoices transition project tasks.
*   **Evidence Location**: odoo/addons/mrp/models/mrp_workorder.py
*   **Options**:
    *   *Option A*: Straight path `Draft -> Scheduled -> In-Progress -> Pending-Verification -> Completed -> Closed`. Pros: simpler model. Cons: violates RLS / audit immutability invariants if invoice state is mixed with execution.
    *   *Option B*: `Completed` is terminal for workforce verification. `Closed` is a decoupled financial state triggering INV-002 read-only lock.
*   **Recommendation**: Option B. Verification by supervisor terminates work, invoice processing moves the record to `Closed` (locked).
*   **Status**: `DECISION_REQUIRED`
*   **Owner**: Product Owner
*   **Resolution**: Pending review.
*   **Supersedes**: None
*   **Superseded By**: None
*   **Confidence**: `HIGH`

---

### DEC-BIBLE-004: Decoupling of Address and Location
*   **Decision ID**: DEC-BIBLE-004
*   **Question**: Should physical addresses be structurally unified with operational Location site geofences?
*   **Context**: `concept-inventory.md` unifies addresses and geofences under `Location`. `primitive-validation.md` / `volume_2` unifies physical coordinates as `Location` and separates `Address` (Place profile).
*   **Affected Concepts**: `Location`, `Address`
*   **Evidence**: Odoo partner has address fields. WMS has stock locations with no mailing attributes.
*   **Evidence Location**: Odoo res.partner address models; WMS stock.location.
*   **Options**:
    *   *Option A*: Location includes street address, zip, and geofence radius. Pros: single table. Cons: duplicates identical address records across multiple parties/branches.
    *   *Option B*: Address is a separate communication card mapped to a Party or Location. Location represents the operational geofence region.
*   **Recommendation**: Option B. Enforce Place (GOV-TER-017) to decouple mailing coordinates from operational coordinates.
*   **Status**: `DECISION_REQUIRED`
*   **Owner**: Product Owner
*   **Resolution**: Pending review.
*   **Supersedes**: None
*   **Superseded By**: None
*   **Confidence**: `HIGH`

---

### DEC-BIBLE-005: Tenant vs Organization Boundaries
*   **Decision ID**: DEC-BIBLE-005
*   **Question**: How do we define the boundary between Tenant and Organization?
*   **Context**: `concept-inventory.md` calls `Organization` the tenant boundary. `volume_6` defines `Tenant` as the database isolation boundary, and `Organization` as a nested business unit under Tenant.
*   **Affected Concepts**: `Tenant`, `Organization`, `Location`
*   **Evidence**: Keycloak uses Realms for multi-tenancy. Groups are organizational units.
*   **Evidence Location**: keycloak/models/RealmModel.java; keycloak/models/GroupModel.java
*   **Options**:
    *   *Option A*: Tenant and Organization are the same boundary. Pros: simpler RLS. Cons: prevents multi-org parent-child routing.
    *   *Option B*: Tenant is the root isolation boundary, while Organization is a nestable hierarchy under Tenant.
*   **Recommendation**: Option B. Scopes data isolation at the Tenant layer, query filtering at the Organization/Branch layer.
*   **Status**: `DECISION_REQUIRED`
*   **Owner**: Product Owner
*   **Resolution**: Pending review.
*   **Supersedes**: None
*   **Superseded By**: None
*   **Confidence**: `HIGH`

---

### DEC-BIBLE-006: Checklist Item Naming
*   **Decision ID**: DEC-BIBLE-006
*   **Question**: Should the sub-steps of a Work Order be named `Task` or `ChecklistItem`?
*   **Context**: `concept-inventory.md` registers `Task` as the sub-step checklist. `volume_6` and terminology glossary reserve `Task` for project-level milestones, renaming sub-steps to `ChecklistItem`.
*   **Affected Concepts**: `Work`, `Task`, `ChecklistItem`
*   **Evidence**: Odoo MRP uses work order check lists. OpenProject uses tasks as parent items.
*   **Evidence Location**: erpnext/projects/doctype/task/task.json
*   **Options**:
    *   *Option A*: Checklist sub-steps are named `Task`. Pros: common in field operations. Cons: collision with Project milestones.
    *   *Option B*: Checklist sub-steps are named `ChecklistItem` (GOV-TER-003). Pros: prevents terminal schema confusion.
*   **Recommendation**: Option B.
*   **Status**: `DECISION_REQUIRED`
*   **Owner**: Product Owner
*   **Resolution**: Pending review.
*   **Supersedes**: None
*   **Superseded By**: None
*   **Confidence**: `HIGH`
