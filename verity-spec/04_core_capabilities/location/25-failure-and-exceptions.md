# Verity Master Platform Specification

## location/25-failure-and-exceptions.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/location.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Fallback actions and rollback rules.

This document details the `location` capability specs for the `25 Failure And Exceptions` contract.

### REQ-LOCATION-25FAILUREANDEXCEPTIONS-001
*   **Requirement**: The capability manages `Location, Geofence` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_partner.py`

### REQ-LOCATION-25FAILUREANDEXCEPTIONS-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-LOCATION-25FAILUREANDEXCEPTIONS-003
*   **Requirement**: Mutations are restricted to actions: `create_location, update_geofence`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-LOCATION-25FAILUREANDEXCEPTIONS-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
