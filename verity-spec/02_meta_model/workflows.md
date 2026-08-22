# Verity Master Platform Specification

## 02_meta_model/workflows.md

## Provenance
*   **Primary Sources**: `odoo-prd/07-workflow-model.md` (Workflow Nodes and Activities)
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model - Workflow)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Workflow Primitive Definition

A **Workflow** is an orchestrated sequence of Actions and state changes coordinating multiple Entities and Capabilities to complete a defined business process (e.g. Lead Conversion $\rightarrow$ Account Creation $\rightarrow$ Quote Approval $\rightarrow$ Work Order Dispatch).

---

## 2. Execution and Orchestration

### MET-WKF-001: Transaction Boundaries
*   **Rule**: A workflow step must run within a single transaction boundary. If Step A (creating an Account) succeeds, but Step B (generating the Work Order) fails validation, the entire workflow transaction rolls back, leaving no half-created records in the database.
*   **Status**: `[UNKNOWN]`

### MET-WKF-002: Dynamic Routing Nodes
*   **Rule**: Workflows support conditional routing decisions based on data properties (e.g. if Work Order total exceeds \$5,000, route to `Awaiting VP Approval`, otherwise route to `Awaiting Scheduler Dispatch`).
*   **Status**: `[UNKNOWN]`

---

## 3. Workflow State Synchronization

### MET-WKF-003: Sub-Workflow Cascades
*   **Rule**: When a parent Workflow transitions status (e.g. Project marked `Completed`), the change must automatically evaluate and trigger transitions on children sub-workflows (e.g. complete open checklist tasks or alert assigned resources).
*   **Status**: `[UNKNOWN]`
