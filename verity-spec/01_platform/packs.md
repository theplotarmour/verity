# Verity Master Platform Specification

## 01_platform/packs.md

## Provenance
*   **Primary Sources**: None
*   **Verity Bible Authority**: [verity-bible/volume_1_constitution_philosophy.md](file:///D:/Code/verity/verity-bible/volume_1_constitution_philosophy.md) (Section 5: The Verity North Star), [verity-bible/_synthesis/verity-canonical-update.md](file:///D:/Code/verity/verity-bible/_synthesis/verity-canonical-update.md)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Industry Pack Definition

An **Industry Pack** (e.g. `Security Operations Pack`, `Facilities Management Pack`) is a declarative configuration manifest that groups relevant Capabilities, custom fields schemas, roles, checklist templates, and dashboard layouts to satisfy a vertical domain.

---

## 2. Manifest Structure

### PLA-PCK-001: Declarative Pack Manifest
*   **Description**: A Pack is defined as a JSON/YAML configuration file containing:
    *   `pack_id` (String): Unique identifier (e.g. `verity.pack.security_patrol`).
    *   `required_capabilities` (Array of Strings): Prerequisite Capabilities (e.g., `Workforce`, `Scheduling`, `Audit`).
    *   `default_roles` (Array of objects mapping roles to permission scopes).
    *   `custom_field_schemas` (Array of custom attributes to inject).
    *   `default_templates` (Array of Checklist and Document templates).
*   **Status**: `[UNKNOWN]`

---

## 3. Deployment and Composition

### PLA-PCK-002: Pack Activation
*   **Rule**: When an Industry Pack is activated for a Tenant:
    1.  The system validates that the tenant has active subscription rights for all `required_capabilities`.
    2.  The system automatically generates the defined `default_roles` and binds permissions.
    3.  The system registers the defined `custom_field_schemas` in the active metadata catalog.
    4.  The system installs the defined default checklists and documents.
*   **Status**: `[UNKNOWN]`

### PLA-PCK-003: Overlap Resolution
*   **Rule**: If a Tenant activates both Pack A and Pack B, and both define custom fields with the same name on the same entity (e.g. `WorkOrder.zone`), the system merges the schemas. If field types conflict (e.g. string vs. integer), the activation fails until the schema conflict is resolved in the tenant override configuration.
*   **Status**: `[UNKNOWN]`
