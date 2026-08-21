# VERITY REFERENCE CORPUS — VOLUME 1
## Business Systems: Odoo, ERPNext, SuiteCRM & OpenProject

This volume documents our architectural findings and concept extractions from mature business platforms, establishing what Verity retains, remodels, or discards.

---

## 1. Odoo
*   **Domain Focus:** ERP, Sales, MRP, Inventory, HR, Projects.
*   **Target Extract:** Domain breadth, validation rules, field edge cases.

### A. Concept Comparison & Mappings:
*   *Odoo `res.partner`:* Remodeled. Verity extracts the contact card details and unifies customer, vendor, and address identities into the **`Party`** primitive.
*   *Odoo `hr.employee`:* Discarded. Employees are modeled in Verity as a **`Party`** containing a worker user role, mapped to a **`Resource`** calendar profile.
*   *Odoo `project.task`:* Adapted. Generalized in Verity into the **`Work`** primitive to support multi-vertical service operations.

### B. Invariants Discovered:
*   `res.partner` addresses must support hierarchy (`parent_id`) to map employees to corporate company offices.
*   Monetary transactions must be bound to a base currency (`res.currency`) to prevent unit calculation errors across locations.

### C. Edge Cases & Operational Reality:
*   *Recycled SIM Cards:* In Indian field operations, workers onboarded by phone number often leave, and their numbers are recycled. Verity implements a 30-day SIM-recycling cooling period to prevent data access leaks.

---

## 2. ERPNext
*   **Domain Focus:** Open-source ERP.
*   **Target Extract:** Decoupled business capabilities and document ledger states.

### A. Concept Comparison & Mappings:
*   *ERPNext `Doctype`:* Maps to Verity’s meta-model schema definitions.
*   *ERPNext `Warehouse`:* Remodeled. Mapped to Verity’s **`Location`** primitive with inventory tracking enabled.

### B. Invariants Discovered:
*   Double-entry stock ledgers: every stock reduction in location A must correspond to an equal stock addition in location B.

### C. Edge Cases & Operational Reality:
*   *Stock Reconciliations:* Physical warehouse counts often mismatch database records. Verity handles this via dedicated `stock_count` adjustment actions rather than forcing manual SQL overrides.

---

## 3. SuiteCRM
*   **Domain Focus:** Enterprise Relationship Management.
*   **Target Extract:** CRM relationship hierarchies and pipeline forecast lifecycles.

### A. Concept Comparison & Mappings:
*   *SuiteCRM Accounts vs. Contacts:* Unified in Verity under the **`Party`** primitive. Customer Accounts are mapped to organizations, and Contacts are mapped to individuals linked via relationships.

### B. Invariants Discovered:
*   A lead or opportunity pipeline must progress through sequential validation gates before spawning a customer invoice.

---

## 4. OpenProject
*   **Domain Focus:** Collaborative Work Planning.
*   **Target Extract:** Work breakdown hierarchies, time tracking, and Gantt charts.

### A. Concept Comparison & Mappings:
*   *OpenProject Work Package:* Maps to Verity’s **`Work`** primitive, supporting parent-child task nesting.
*   *OpenProject Timeline:* Maps to Verity’s **`Schedule`** dispatcher timeline.

### B. Invariants Discovered:
*   Parent tasks must automatically sum the estimated hours and progress percentages of their child sub-tasks.
*   A child task's schedule boundaries must fall within its parent task's date boundaries.
