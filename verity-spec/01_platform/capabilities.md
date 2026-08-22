# Verity Master Platform Specification

## 01_platform/capabilities.md

## Provenance
*   **Primary Sources**: `reference/unleash/concept-inventory.md` / `reference/unleash/verity-implications.md` / `reference/n8n/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model Specification)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Capability Primitive Definition

A **Capability** is a self-contained, domain-specific module of business logic (e.g. `Workforce`, `Scheduling`, `Billing`). Every Capability encapsulates a set of Entities, Actions, States, Transitions, Rules, and Events.

---

## 2. Capability Registry and Discovery

### PLA-CAP-001: Capability Registration
*   **Description**: Every Capability must register its metadata in the global platform registry during server initialization.
*   **Metadata Schema**:
    *   `id` (String): Unique identifier (e.g. `verity.capability.scheduling`).
    *   `name` (String): Human-readable name.
    *   `dependencies` (Array of Strings): Required capability IDs.
    *   `entity_types` (Array of Strings): Entities owned by this capability.
    *   `version` (String): SemVer version of the capability logic.
*   **Status**: `[FACT]`

---

## 3. Dynamic Tenant-Level Activation

### PLA-CAP-002: Dynamic Activation Registry
*   **Description**: Capabilities are activated on a per-Tenant basis. An inactive capability's endpoints, UI menus, and event handlers are fully hidden and blocked for that tenant.
*   **Entity Mapping**:
    *   `TenantActivation`: `tenant_id` (FK to Tenant), `capability_id` (String), `activated_at` (DateTime), `status` (active | suspended).
*   **Status**: `[FACT]`

### PLA-CAP-003: Dependency Resolution on Activation
*   **Rule**: When a tenant administrator attempts to activate a Capability (e.g., `Scheduling`), the Activation Service validates that all prerequisite dependencies (e.g., `Workforce`) are already active for that tenant. If dependencies are missing, the activation is rejected.
*   **Status**: `[FACT]`

---

## 4. Gating and Feature Flags (Unleash-style)

### PLA-CAP-004: In-Memory Capability Verification
*   **Rule**: The application core uses local in-memory lookups to check if a tenant has a capability activated. Checking capability permissions must not trigger synchronous database queries during API routing.
*   **Status**: `[FACT]`
