# Verity Master Platform Specification

## asset/06-lifecycle.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/asset.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Allowed transitions sequence rules.

This document details the `asset` capability specs for the `06 Lifecycle` contract.

### REQ-ASSET-06LIFECYCLE-001
*   **Requirement**: The capability manages `Asset, AssetCategory` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/maintenance/models/maintenance.py`

### REQ-ASSET-06LIFECYCLE-002
*   **Requirement**: State changes are constrained to enums: `OPERATIONAL, MAINTENANCE, DISPOSED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-ASSET-06LIFECYCLE-003
*   **Requirement**: Mutations are restricted to actions: `create_asset, update_asset, send_to_maintenance`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-ASSET-06LIFECYCLE-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
