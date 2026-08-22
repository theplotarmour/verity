# Verity Master Platform Specification

## 02_meta_model/entities.md

## Provenance
*   **Primary Sources**: `odoo-prd/03-meta-model.md` (Core Model Types)
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model Specification - Entity)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Entity Primitive Definition

An **Entity** represents a logical or physical business concept in Verity. Every Entity has a defined owner (Capability) and falls into one of three structural classes mapping back to Odoo models.

---

## 2. Entity Classes

### MET-ENT-001: Persistent Entity
*   **Description**: Represents a permanent business record mapped to a physical database table.
*   **Operational Behavior**:
    *   State is persistent and mutable only via explicit Actions.
    *   Supports logical scoping by `tenant_id`.
    *   Fires business events on state mutation.
*   **Source Reference**: Mapped from Odoo `models.Model` definition.
*   **Status**: `[UNKNOWN]`

### MET-ENT-002: Transient Entity
*   **Description**: Represents temporary, session-scoped transactional states (e.g., a wizard modal workflow, csv import configuration, or payment checkout dialog).
*   **Operational Behavior**:
    *   Mapped to temporary tables.
    *   Excluded from the platform's long-term Event Bus (emits zero state events).
    *   Cleaned up periodically by a background autovacuum process (records older than 24 hours are deleted).
*   **Source Reference**: Mapped from Odoo `models.TransientModel`.
*   **Status**: `[UNKNOWN]`

### MET-ENT-003: Abstract Entity (Mixin)
*   **Description**: Acts as a functional interface or inheritance template. Does not map to a database table.
*   **Operational Behavior**:
    *   Used to share common fields, actions, or validation constraints across multiple persistent entities.
    *   *Examples*: `TrackableMixin` (timestamp audits), `NotificationRecipientMixin` (email/sms routing destinations).
*   **Source Reference**: Mapped from Odoo `models.AbstractModel`.
*   **Status**: `[UNKNOWN]`

---

## 3. Entity Registration Rules

### MET-ENT-004: Unique Entity Key
*   **Rule**: Every Entity must register a unique, namespace-qualified string key (e.g., `verity.work_orders.job_order`).
*   **Status**: `[UNKNOWN]`

### MET-ENT-005: Tenant Mapping Constraint
*   **Rule**: Every Persistent Entity (unless marked as a platform-wide system reference) must include a non-nullable `tenant_id` foreign key.
*   **Status**: `[UNKNOWN]`
