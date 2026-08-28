# Verity HQ Audit Report & Completion Plan

*   **Date**: 2026-08-28
*   **Target File**: `HQaudit.md`
*   **System Status**: Dynamic Operator Shell partially implemented; Core Capability gating and Industry Pack systems exist as design specifications awaiting phase completion.

---

## Part 1: Current State Audit of Verity HQ

An audit of the codebase (`src/app/(hq)`, `src/server/actions/hq.ts`, and `src/server/platform/operator.ts`) reveals the current implementation status of HQ's features:

### 1. Existing Features (Functional)
*   **Platform Overview (`/hq`)**: Functional overview screen pulling real counts (Client Count, Members, 30d Changes, 30d Security Events) from secure, read-only platform projection functions. No fake or mock statistics.
*   **Client Management (`/hq/clients`)**: 
    *   List and search client tenants.
    *   Create new client form (saves to database with timezone).
*   **Client Workspace Navigation (`/hq/clients/[tenantId]`)**: A sub-navigation rail housing:
    *   **Modules**: Functional toggling for core capabilities (e.g. Workforce, Location, scheduling).
    *   **Organizations**: Nested organizational unit CRUD using RLS bounds.
    *   **Roles**: Role provisioning and granular entity permission assignment (e.g., `verity.location.location`).
    *   **People**: Invite flows and role bindings.
    *   **Settings**: Save key-value settings parameters local to the client.
*   **Security & Gatekeeping**:
    *   **Context Verification**: Operates under **ADR-013**. `requireOperator()` halts unauthorized users. Attempts to visit `/hq` while inside a client context will trigger an immediate redirect back to `/`.
    *   **Non-Ambient Authorization**: All mutations run via client command pipelines where operator credentials are re-validated server-side using `operatorActorFor(tenantId)`.

### 2. Gap Analysis (Missing vs. Verity Vision)
While the base pages are functional, several high-level platform control primitives remain in the specification/design phase:

| Gap Area | Specification | Current Codebase Status |
| :--- | :--- | :--- |
| **Industry Packs** | `PLA-PCK-001` / `002` | Declarative pack definitions (`Security Patrol Pack`, etc.) do not yet exist in the DB or registry. Only manual capability toggles are present. |
| **Dependency Safeguards** | `PLA-CAP-003` | Activating a capability does not enforce prerequisite checks (e.g., enabling `Scheduling` without checking if `Workforce` is active first is currently permitted in the UI). |
| **Custom Field Schemas UI** | `PLA-EXT-002` | Schema registry exists in the Prisma schema (`CustomFieldSchema`), but there is no operator UI in HQ to add custom field extensions to client models. |
| **Gating Control & Suspension**| `QO-2` | No UI toggle or backend execution path to "suspend" a client workspace to freeze all operational endpoints. |

---

## Part 2: Implementation Plan to Complete HQ

To elevate HQ to the full Verity vision, the following roadmap is proposed:

### Milestone 1: Capability Dependency Safeguards (Fast Win)
*   **Goal**: Prevent client misconfigurations in the Modules tab by enforcing capability dependencies.
*   **Changes**:
    *   Update the Module toggle server actions to read dependencies (defined in the capability registration files).
    *   Refuse activation of dependent capabilities in the backend if prerequisites are missing.
    *   Update `/hq/clients/[tenantId]/modules` to display visual dependency badges (e.g. *Requires: Workforce*).

### Milestone 2: Dynamic Custom Field Schema Registry (Extensibility)
*   **Goal**: Enable operators to extend core entities for clients without writing code.
*   **Changes**:
    *   Add a **Custom Fields** sub-tab under Client Settings.
    *   Build a schema generator UI: choose Entity (e.g., `WorkOrder`), select Field Type (`String`, `Number`, `Boolean`, `Select`), define name, and toggle "Required".
    *   Connect the form to write directly to the `custom_field_schema` database table.

### Milestone 3: Declarative Industry Packs (Scaling Onboarding)
*   **Goal**: Replace manual client setup with one-click industry templates.
*   **Changes**:
    *   Create a JSON-based registry of Industry Packs (e.g., `facilities_management.json`, `security_patrol.json`).
    *   Add a **Packs** toggle dashboard in the Client view.
    *   On activation, execute `PLA-PCK-002`: automatically activate all prerequisite capabilities, seed default roles and permissions, and insert custom field schemas.

### Milestone 4: Client Suspension Control (Administrative Gating)
*   **Goal**: Allow operators to lock out a client workspace instantly.
*   **Changes**:
    *   Add a "Suspend Tenant" toggle to the Client Details header.
    *   Update the authorization runtime wrapper to throw `E_SUSPENDED` if the tenant's activation status is not `Active`.

---

## Part 3: Verification Plan

### Automated Tests
1. **Dependency Gating**: Validate that toggling a dependent capability without its prerequisite throws a validation error.
2. **Context Switching**: Ensure all actions inside `/hq` re-verify that the active tenant is `isPlatform: true`.
3. **Audit Completeness**: Assert that all pack activations and custom field edits record an audit event flagged with the `Operator` tag.

### Manual Verification
1. Onboard a new client through the HQ UI.
2. Apply a blueprint pack (e.g. Facilities Management) and verify that custom fields are successfully injected into the schema catalog and default roles appear under the Roles tab.
3. Suspend the client and confirm that standard users trying to access their dashboard receive a suspended redirect/notification.
