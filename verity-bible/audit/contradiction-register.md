# VERITY CONTRADICTION & DUPLICATION REGISTER
## Explicit Unification & Decoupling Matrix

This document maps all duplicate, overlapping, and contradictory concepts found in the Odoo-derived reference specifications and defines how the Verity model unifies them.

---

## 1. Concept Unification & Mapping Matrix

### A. Party vs. User vs. Resource
*   *The Conflict:* Odoo stores employees in `hr.employee` and user accounts in `res.users`, both pointing to `res.partner` records. This creates three disjoint tables for a single human actor, leading to data synchronization bugs and credential mismatch errors.
*   *The Verity Unification [FACT]:*
    *   A single `Party` record represents the real-world identity.
    *   A `User` record holds credentials and maps $1:1$ to a `Party`.
    *   A `Resource` record maps to a `Party` (for human workers) or an `Asset` (for equipment) to manage calendar capacity.
*   *Lifecycle Owner:* `Party` owns the identity lifecycle. `Resource` owns the scheduling capacity.

### B. Work vs. Task vs. Activity
*   *The Conflict:* Odoo uses `project.task` for structural deliverables, `mail.activity` for simple actions, and `mrp.workorder` for shop floor steps. This scatters the operational record.
*   *The Verity Unification [FACT]:*
    *   `Work` (Work Order) is the single canonical execution primitive representing committed obligations.
    *   `Task` is a checklist item contained inside a `Work` order (no independent lifecycle).
    *   `Activity` is a non-mutating logging record tracking history on any target entity.

### C. Request vs. Work
*   *The Conflict:* Support tickets, service requests, and maintenance alerts are represented by different models in Odoo, blurring the boundary between intake and scheduling.
*   *The Verity Unification [FACT]:*
    *   `Request` is the triage/intake primitive.
    *   `Work` is the execution primitive.
    *   A `Request` must go through validation and approval before spawning a `Work` order.

### D. Resource vs. Asset
*   *The Conflict:* Capacity scheduling in Odoo mixes human resources and physical tools, making calendar conflicts difficult to trace.
*   *The Verity Unification [FACT]:*
    *   `Asset` represents physical inventory items that require maintenance and depreciative tracking.
    *   `Resource` represents schedulable capacity.
    *   An `Asset` maps to a `Resource` profile when it is booked on a schedule.

### E. Location vs. Site vs. Address
*   *The Conflict:* Address fields are duplicated across partners, sites, and stock locations.
*   *The Verity Unification [FACT]:*
    *   `Location` is the unified spatial primitive, supporting parent-child hierarchies. An address is a structural field of a `Location`.

### F. Document vs. Attachment
*   *The Conflict:* Odoo separates basic file uploads from document management systems.
*   *The Verity Unification [FACT]:*
    *   `Document` represents the physical file metadata.
    *   `Attachment` joins a `Document` to any database entity.
