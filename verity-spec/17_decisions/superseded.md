# Verity Master Platform Specification

## 17_decisions/superseded.md

This document contains the register of historical, superseded design decisions for the Verity platform.

---

### DEC-HIST-001: Separation of Employee and Partner Tables
*   **Decision ID**: DEC-HIST-001
*   **Question**: Should Verity retain Odoo's split tables for partners (`res.partner`) and employees (`hr.employee`)?
*   **Context**: Odoo stores employee HR details separately from partner communication info.
*   **Affected Concepts**: `Party`, `Resource`, `User`
*   **Evidence**: Odoo addons/hr/models/hr_employee.py
*   **Evidence Location**: odoo/addons/hr/models/hr_employee.py
*   **Options**:
    *   *Option A*: Retain split tables.
    *   *Option B*: Unify under the single canonical `Party` primitive.
*   **Recommendation**: Option B.
*   **Status**: `SUPERSEDED`
*   **Owner**: Product Owner
*   **Resolution**: Resolved by INV-003 (Unified Party Identity) and ADR-001 (decoupling role lifecycle).
*   **Supersedes**: None
*   **Superseded By**: INV-003, ADR-001
*   **Confidence**: `HIGH`

---

### DEC-HIST-002: Linear Completed-Closed Flow
*   **Decision ID**: DEC-HIST-002
*   **Question**: Should Work Orders treat Completed and Closed as a single linear path ending at Closed?
*   **Context**: Linear execution models mix financial archiving constraints with workforce completions.
*   **Affected Concepts**: `Work`, `SLA`, `Invoice`
*   **Evidence**: Odoo MRP workorder stages.
*   **Evidence Location**: odoo/addons/mrp/models/mrp_workorder.py
*   **Options**:
    *   *Option A*: Straight path ending at Closed.
    *   *Option B*: Decoupled Completed (execution terminal) and Closed (archiving lock).
*   **Recommendation**: Option B.
*   **Status**: `SUPERSEDED`
*   **Owner**: Product Owner
*   **Resolution**: Resolved by ADR-003.
*   **Supersedes**: None
*   **Superseded By**: ADR-003
*   **Confidence**: `HIGH`

---

### DEC-HIST-003: Unified Location and Address Model
*   **Decision ID**: DEC-HIST-003
*   **Question**: Should mailing addresses be embedded directly in geofenced site Locations?
*   **Context**: Spec designs unified coordinates and street addresses into the same entity.
*   **Affected Concepts**: `Location`, `Address`
*   **Evidence**: Odoo res.partner address models; WMS stock.location.
*   **Evidence Location**: Odoo res.partner address models; WMS stock.location.
*   **Options**:
    *   *Option A*: Unified Location/Address model.
    *   *Option B*: Decoupled spatial/operational models.
*   **Recommendation**: Option B.
*   **Status**: `SUPERSEDED`
*   **Owner**: Product Owner
*   **Resolution**: Resolved by ADR-004.
*   **Supersedes**: None
*   **Superseded By**: ADR-004
*   **Confidence**: `HIGH`

---

### DEC-HIST-004: Organization as Multi-Tenancy Boundary
*   **Decision ID**: DEC-HIST-004
*   **Question**: Is Organization the database-level isolation boundary?
*   **Context**: Spec designs used Tenant and Organization interchangeably, mixing security boundaries with branch hierarchies.
*   **Affected Concepts**: `Tenant`, `Organization`
*   **Evidence**: Keycloak Realms (tenancy) vs Groups (OUs).
*   **Evidence Location**: Keycloak Realms; Odoo res.company structure.
*   **Options**:
    *   *Option A*: Organization equals Tenant.
    *   *Option B*: Tenant is root isolation, Org is branch hierarchy.
*   **Recommendation**: Option B.
*   **Status**: `SUPERSEDED`
*   **Owner**: Product Owner
*   **Resolution**: Resolved by ADR-005.
*   **Supersedes**: None
*   **Superseded By**: ADR-005
*   **Confidence**: `HIGH`

---

### DEC-HIST-005: Task Checklist Naming Collision
*   **Decision ID**: DEC-HIST-005
*   **Question**: Should Work Order sub-steps be named Task?
*   **Context**: Collision with independent schedulable Project Tasks.
*   **Affected Concepts**: `Work`, `Task`, `ChecklistItem`
*   **Evidence**: Odoo MRP checklist items.
*   **Evidence Location**: erpnext/projects/doctype/task/task.json
*   **Options**:
    *   *Option A*: Retain Task naming.
    *   *Option B*: Rename checklist sub-steps to ChecklistItem.
*   **Recommendation**: Option B.
*   **Status**: `SUPERSEDED`
*   **Owner**: Product Owner
*   **Resolution**: Resolved by ADR-006.
*   **Supersedes**: None
*   **Superseded By**: ADR-006
*   **Confidence**: `HIGH`
