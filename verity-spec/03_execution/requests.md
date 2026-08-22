# Verity Master Platform Specification

## 03_execution/requests.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/crm-lead.md` / `reference/suitecrm/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Primitive 1: WORK - Request definition)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Request Semantics

A **Request** is an uncommitted intake ticket representing a service request or issues logged by a customer, tenant, or automated monitoring hook. 

### EXE-REQ-001: Separation from Work
*   **Rule**: Requests represent unverified intent and exist outside the workforce scheduling board. They do not reserve resource capacity or generate SLA clock deadlines until converted into committed Work Orders.
*   **Status**: `[FACT]`

---

## 2. Request Lifecycle & Evaluation

```text
  Intake (New Request) ──► In-Review ──┬──► Converted (Spawns Work Order)
                                       │
                                       └──► Rejected / Cancelled
```

### EXE-REQ-002: Request States

#### 1. New
*   **Trigger**: Customer submits form via B2B/B2C portal, or alert hook triggers API.
*   **Transitions**: Move to `In-Review` on dispatcher lookup.
*   **Status**: `[FACT]`

#### 2. In-Review
*   **Operational Action**: Dispatcher evaluates feasibility, checks customer credit/contract bounds, and validates site location coordinates.
*   **Transitions**: `convert` $\rightarrow$ `Converted`, `reject` $\rightarrow$ `Rejected`.
*   **Status**: `[FACT]`

#### 3. Converted
*   **Action**: System generates a committed Work Order. Copy details (Customer, Location, Problem description, Target dates) to the new `WorkOrder` record.
*   **Status**: Terminal. Mapped as child linkage: `Request.work_order_id`.
*   **Status**: `[FACT]`

#### 4. Rejected
*   **Action**: Request is archived. Requires an explicit reason select code (e.g. out of service bounds, duplicated, unpaid debt balance).
*   **Status**: Terminal.
*   **Status**: `[FACT]`
