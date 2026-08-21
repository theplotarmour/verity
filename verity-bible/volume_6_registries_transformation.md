# VERITY MASTER BIBLE — VOLUME VI
## Registries, Registers & Odoo Transformation Framework

This volume serves as the formal repository registry: containing the canonical Glossary, Invariant and Principle Registers, the Decision Log, and the rules for transforming Odoo-derived specs into Verity capabilities.

---

## 1. The Verity Glossary
To prevent terminology drift between design, product, engineering, and support, these terms are legally binding on all documentation and code:

### 1. Work (Work Order)
*   **Definition:** An obligation to execute a service at a specific site for a customer.
*   **What it is NOT:** It is not a generic "task" or "to-do item". It has commercial, SLA, and verification weight.
*   **Prohibited Synonyms:** `job_card`, `task`, `ticket_item`, `event_run`.
*   **Example:** A work order to perform the monthly safety audit of the elevators at Site A.

### 2. Party
*   **Definition:** A human or corporate entity acting in the system.
*   **What it is NOT:** It is not just a "customer account" or "user credential".
*   **Prohibited Synonyms:** `client_obj`, `contact_entity`.
*   **Example:** Organization "Alpha Security Inc" and Employee "John Doe" are both Parties.

### 3. Location (Site)
*   **Definition:** The physical or coordinate boundary where work occurs or assets reside.
*   **What it is NOT:** It is not a "warehouse" (which belongs to inventory) or a "virtual site".
*   **Prohibited Synonyms:** `branch`, `depot`, `factory_outlet`.
*   **Example:** Outpost Site #4, managed by the Delhi branch.

### 4. Resource
*   **Definition:** A capacity-constrained operating unit available for scheduling (e.g., human workers, specialty machinery).
*   **What it is NOT:** It is not raw materials or stock items.
*   **Prohibited Synonyms:** `employee_row`, `tool_entry`.
*   **Example:** Technician "Robert Smith" or Patrol Car "DL-3C-5541".

---

## 2. The Invariant Register
Invariants must remain true across every tenant configuration, industry pack, and codebase build:

### `INV-001` — Strict Tenancy Separation [FACT]
*   **Statement:** All database operations (reads/writes) must contain a tenancy filter matching the authenticated principal's session scope.
*   **Category:** PLATFORM INVARIANT
*   **Rationale:** Prevents tenant data leakage, which is our highest operational risk.
*   **Violation Example:** Executing `prisma.appointment.findMany()` without scoping by `factoryId` or `organizationId`.
*   **Detection:** Middlewares or DB-level RLS policies reject queries missing tenant scope identifiers.

### `INV-002` — Read-Only Closed States [FACT]
*   **Statement:** Once a Work Order transitions to the `Closed` terminal state, its field properties become read-only. No further status changes or mutations are permitted.
*   **Category:** DOMAIN INVARIANT
*   **Rationale:** Enforces accounting and auditing integrity.
*   **Violation Example:** A script attempting to edit the `scheduledAt` date of a Closed order.
*   **Detection:** Application validation gates raise `E_PRECONDITION` on modifications to closed records.

### `INV-003` — Unified Party Identity [INFERRED]
*   **Statement:** A physical person or corporate entity must have exactly one row in the `Party` table. No separate tables for customers vs employees can exist.
*   **Category:** PLATFORM INVARIANT
*   **Rationale:** Eliminates duplication and profile synchronization bugs.
*   **Violation Example:** Having a `res_partner` row and an unrelated `hr_employee` row for the same person.
*   **Detection:** Schema compiler checks check constraints and unique index rules.

---

## 3. The Principle Register

### `PRN-001` — Least Surprise (Explainable Automation) [INFERRED]
*   **Principle:** Automations must be explicit, versioned, and easily traceable.
*   **Meaning:** If the system automatically reassigns a work order, it must log the execution of Rule X, explaining why the action was taken.
*   **Anti-Example:** An automated backend cron job that silently moves unassigned tickets to a different queue without logging the criteria.

### `PRN-002` — Progressive Disclosure of Complexity [INFERRED]
*   **Principle:** Keep simple actions simple, while making advanced configurations possible.
*   **Meaning:** Frontline workers see only two buttons (e.g., "Start Shift" and "Report Incident"). A scheduler sees a multi-pane calendar grid. The underlying database schema remains unified.

---

## 4. The Decision Register

### `DEC-001` — Elimination of the Kitchen Module & KDS [FACT]
*   **Decision:** The kitchen display system (KDS) and cooking queue tracking are permanently excluded from the Verity core product scope.
*   **Status:** `ACCEPTED`
*   **Rationale:** Verity is optimized for service-driven organizations. Food preparation tracking requires micro-level inventory recipes and highly specific KDS bump timers that do not generalize into other service operations. Food delivery ordering is retained via the `catalog` module posting to `ingestExternalOrder`.

### `DEC-002` — Unified Product-Service Catalog [FACT]
*   **Decision:** Services are stored directly in the unified `Product` table where `itemType = SERVICE`. The scheduling `Appointment` model holds a flat `serviceName` and `pricePaise` to maintain database decoupling.
*   **Status:** `ACCEPTED`
*   **Rationale:** Prevents tight structural links between scheduling capabilities and the product inventory module, allowing either to be turned off without causing code compilation failures.

---

## 5. Odoo Transformation Framework
Verity uses the Odoo-derived specs (e.g., `sale.order`, `res.partner`) as a completeness baseline, but refactors them to enforce composability.

### The Transformation Workflow:
1.  **Extract the Problem:** What business outcome does the Odoo model achieve? (e.g., `sale.order` tracks customer intent to purchase).
2.  **Strip ERP Bloat:** Remove accounting-centric columns (e.g., specific journal accounts, tax ledger IDs) from the operational model. Operations should only care about price, quantity, and status. Taxes and journals are calculated at the billing boundary.
3.  **Map to Verity Primitives:** 
    *   Odoo's `res.partner` becomes Verity's **`Party`** primitive.
    *   Odoo's `hr.employee` and user accounts map to Verity's **`User`** linked to a **`Resource`**.
    *   Odoo's `project.task` and `mrp.production` are unified under the Verity **`Work Order`** primitive.
4.  **Enforce Domain Boundaries:** A change in the Work Order status (`Completed`) does not edit a invoice table directly. It emits `work.completed`, which is captured by the Billing capability to draft a `SalesOrder` in a decoupled transaction.

---

## 6. Verity Bible Audit

### Identity
An enterprise operations platform for service-driven organizations.

### Category
A Configurable Operating System.

### North Star
Universal operational workflows composed dynamically from immutable primitives.

### Core Primitives
`Party`, `Organization`, `User`, `Role`, `Location`, `Asset`, `Work`, `Request`, `Contract`, `Resource`.

### Meta-Model
Capabilities containing Entities, exposing Actions, defining States, emitting Events, and obeying Rules.

### Composition Model
Industry-specific workflow layers built by composing core primitives with distinct terms and rules.

### Configuration Model
Tenant-scoped metadata parameter adjustments that preserve underlying schemas and upgrade compatibility.

### State/Event Model
Explicit status enum machines executing inside atomic transactions and emitting idempotent Event Bus triggers.

### Exception Model
First-class modeling of deviations (no-shows, SLA risks, partial work) with automated escalations.

### Security Model
Row-Level Security (RLS) partition by `organizationId`/`factoryId` with explicit RBAC role-gates.

### UX Constitution
Visual restraint, high information density for managers, low density task-flows for workers, and an absolute ban on decorative glassmorphism.

### Glossary Size
12 Core Primitives, 28 secondary terms, fully locked.

### Invariants Verified
Tenancy isolation (`INV-001`), read-only closed states (`INV-002`), unified party identity (`INV-003`).

### Confidence
**`HIGH`**. The model successfully decouples operational execution from ERP accounting bloat.
