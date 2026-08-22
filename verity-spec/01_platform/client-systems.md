# Verity Master Platform Specification

## 01_platform/client-systems.md

## Provenance
*   **Primary Sources**: None
*   **Verity Bible Authority**: [verity-bible/volume_1_constitution_philosophy.md](file:///D:/Code/verity/verity-bible/volume_1_constitution_philosophy.md) (Section 6: Anti-Vision - No low-code toy), [verity-bible/_synthesis/verity-canonical-update.md](file:///D:/Code/verity/verity-bible/_synthesis/verity-canonical-update.md)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Client System Boundaries

A **Client System** is the final deployed operational software instance for a specific customer. It represents the top layer of composition:

$$\text{Client System} = \text{Platform Core} + \text{Activated Capabilities} + \text{Industry Packs} + \text{Client Extensions}$$

---

## 2. Client Extension Isolation

To prevent customer-specific modifications from corrupting the core platform codebase and breaking the upgrade path, strict isolation rules are enforced.

### PLA-CLI-001: Separate Extension Directory
*   **Description**: Client-specific frontend components, custom reports, or proprietary API proxy connectors must reside in an isolated `src/extensions/client-[client_name]/` directory. Core source files under `src/core/` and `src/capabilities/` must never be modified to support a single customer.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### PLA-CLI-002: Loose Coupling via Events and Hooks
*   **Rule**: Client-specific business logic must be triggered exclusively by subscribing to the platform's Event Bus or registering sandboxed callback functions in the Action Hook Registry (as defined in `01_platform/extensions.md`).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### PLA-CLI-003: Dynamic Layout Injectors
*   **Rule**: Custom form fields or customized dashboard buttons requested by a client are injected dynamically into the experience shells at runtime based on the tenant's configuration metadata. Direct layout overrides in the core HTML/TSX codebase are prohibited.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
