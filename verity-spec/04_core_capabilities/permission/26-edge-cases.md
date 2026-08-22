# Verity Master Platform Specification

## permission/26-edge-cases.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/permission.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Validation failures and overlap resolutions.

This document details the `permission` capability specs for the `26 Edge Cases` contract.

### REQ-PERMISSION-26EDGECASES-001
*   **Requirement**: The capability manages `PermissionRule` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/ir_model_access.py`

### REQ-PERMISSION-26EDGECASES-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PERMISSION-26EDGECASES-003
*   **Requirement**: Mutations are restricted to actions: `grant_permission, revoke_permission`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PERMISSION-26EDGECASES-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
