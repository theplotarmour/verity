# Verity Master Platform Specification

## asset/09-permissions.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/asset.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Role-based scopes evaluation.

This document details the `asset` capability specs for the `09 Permissions` contract.

### REQ-ASSET-09PERMISSIONS-001
*   **Requirement**: The capability manages `Asset, AssetCategory` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/maintenance/models/maintenance.py`

### REQ-ASSET-09PERMISSIONS-002
*   **Requirement**: State changes are constrained to enums: `OPERATIONAL, MAINTENANCE, DISPOSED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-ASSET-09PERMISSIONS-003
*   **Requirement**: Mutations are restricted to actions: `create_asset, update_asset, send_to_maintenance`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-ASSET-09PERMISSIONS-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
