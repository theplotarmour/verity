# Verity Master Platform Specification

## 01_platform/configuration.md

## Provenance
*   **Primary Sources**: `reference/frappe/concept-inventory.md` / `reference/novu/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model - Rules, Section 2: Primitive 1 - SLA)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Multi-Scope Configuration Registry

Verity parameters are managed hierarchically. A configuration value can be defined at multiple scopes, with the narrowest scope overriding the broader ones.

### PLA-CFG-001: Configuration Scopes
*   **Description**: Configuration values are evaluated in order of narrowest to broadest precedence:
    1.  **Resource/User Level**: Preferences specific to a worker.
    2.  **Organization Level**: Branch-specific settings.
    3.  **Tenant Level**: General tenant-wide business rules.
    4.  **Global System Level**: Default platform behaviors.
*   **Entity Mapping**:
    *   `ConfigParameter`: `key` (String), `value` (JSON), `scope` (global | tenant | organization | user), `scope_id` (UUID, optional).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 2. Dynamic Templates Model

### PLA-CFG-002: Operational Templates
*   **Description**: Custom forms, notifications, and print formats are stored as declarative Templates inside the database, avoiding hardcoded markup in backend files.
*   **Categories**:
    *   `ChecklistTemplate`: Dynamic checklists containing validation rules, types, and logic flow (as specified in Formbricks reference).
    *   `NotificationTemplate`: Messaging layouts utilizing handlebars formatting (as specified in Novu reference).
    *   `DocumentTemplate`: HTML/CSS layouts used to compile PDFs (e.g. Work Order receipts, invoices).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### PLA-CFG-003: Template Scoping and Visibility
*   **Rule**: Templates are owned by the Tenant. An Organization branch can configure which template is active for a specific Service Type, overriding the default Tenant-level template.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
