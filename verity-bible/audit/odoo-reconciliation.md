# ODOO RECONCILIATION REGISTRY
## Systematic Translation of Odoo Concepts into Verity Primitives

This document maps major Odoo-derived concepts and details how they are kept, adapted, remodeled, or discarded in the Verity platform architecture.

---

## 1. Odoo Concept Reconciliation Matrix

### 1. `res.partner` (Odoo Contacts)
*   **Problem Solved:** Represents customers, vendors, and contact addresses.
*   **Odoo Representation:** Hierarchical parent-child contacts with different address types.
*   **Verity Equivalent:** **`Party`** primitive.
*   **Reconciliation:** `REMODEL` [FACT]. We retain the contact card details but separate user login credentials into a dedicated `User` table, and scheduling profiles into `Resource`, eliminating Odoo's dual-record sync errors.

### 2. `hr.employee` (Odoo Staff)
*   **Problem Solved:** Represents employees, skills, and HR details.
*   **Odoo Representation:** Links to `resource.resource` and user logins.
*   **Verity Equivalent:** **`Party`** + **`Resource`** + `EmployeeProfile`.
*   **Reconciliation:** `ADAPT` [FACT]. We discard the separate employee name field and inherit it directly from `Party` (Role = WORKER), linking it to `Resource` for scheduling.

### 3. `project.task` (Odoo Project Tasks)
*   **Problem Solved:** Represents project deliverables, assignees, and deadlines.
*   **Odoo Representation:** Standard tasks linked to projects.
*   **Verity Equivalent:** **`Work`** (Work Order) primitive.
*   **Reconciliation:** `REMODEL` [FACT]. We generalise Odoo's tasks into the universal `Work` primitive. This allows the same entity to represent a security patrol, a cleaning visit, or a technical repair.

### 4. `mrp.production` (Odoo Manufacturing Orders)
*   **Problem Solved:** Tracks shop floor production steps.
*   **Odoo Representation:** Workorders, raw material BOM lists, and machinery center routing.
*   **Verity Equivalent:** Discarded (Out of Scope) [FACT].
*   **Reconciliation:** `EXCLUDE` [FACT]. Verity is optimized for service-driven organizations. We exclude physical raw materials manufacturing.

### 5. `sale.order` (Odoo Sales Orders)
*   **Problem Solved:** Tracks customer purchase intent and pricing.
*   **Odoo Representation:** Sales quotes and order lines.
*   **Verity Equivalent:** `SalesOrder` (Billing/Sales Capability).
*   **Reconciliation:** `ADAPT` [FACT]. We strip the complex ledger journal accounts from the sales order itself, keeping it strictly operational.

### 6. `account.move` (Odoo Invoices & Journal Entries)
*   **Problem Solved:** Double-entry financial bookkeeping.
*   **Odoo Representation:** Invoices, journal entries, and lines.
*   **Verity Equivalent:** Excluded from Core, managed via integrations or Billing capability.
*   **Reconciliation:** `REPLACE` [FACT]. Verity is an operational platform, not a general ledger system. We generate invoices but delegate bookkeeping to specialized integrations (e.g., QuickBooks).
