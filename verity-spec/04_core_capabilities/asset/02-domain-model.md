# Verity Master Platform Specification

## asset/02-domain-model.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/asset.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Logical domain primitives definition.

This document details the `asset` capability specs for the `02 Domain Model` contract.

### REQ-ASSET-02DOMAINMODEL-001
*   **Requirement**: The capability manages `Asset, AssetCategory` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/maintenance/models/maintenance.py`

### REQ-ASSET-02DOMAINMODEL-002
*   **Requirement**: State changes are constrained to enums: `OPERATIONAL, MAINTENANCE, DISPOSED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-ASSET-02DOMAINMODEL-003
*   **Requirement**: Mutations are restricted to actions: `create_asset, update_asset, send_to_maintenance`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-ASSET-02DOMAINMODEL-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
