# Verity Master Platform Specification

## role/23-configuration.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/role.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Scope settings and default profiles.

This document details the `role` capability specs for the `23 Configuration` contract.

### REQ-ROLE-23CONFIGURATION-001
*   **Requirement**: The capability manages `Role, RoleComposition` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_groups.py`

### REQ-ROLE-23CONFIGURATION-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-ROLE-23CONFIGURATION-003
*   **Requirement**: Mutations are restricted to actions: `create_role, compose_role, delete_role`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-ROLE-23CONFIGURATION-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
