# Verity Master Platform Specification

## location/02-domain-model.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/location.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Logical domain primitives definition.

This document details the `location` capability specs for the `02 Domain Model` contract.

### REQ-LOCATION-02DOMAINMODEL-001
*   **Requirement**: The capability manages `Location, Geofence` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_partner.py`

### REQ-LOCATION-02DOMAINMODEL-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-LOCATION-02DOMAINMODEL-003
*   **Requirement**: Mutations are restricted to actions: `create_location, update_geofence`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-LOCATION-02DOMAINMODEL-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
