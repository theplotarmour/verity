# Verity Master Platform Specification

## location/17-evidence-and-audit.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/location.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Mandatory uploads and activity logs.

This document details the `location` capability specs for the `17 Evidence And Audit` contract.

### REQ-LOCATION-17EVIDENCEANDAUDIT-001
*   **Requirement**: The capability manages `Location, Geofence` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_partner.py`

### REQ-LOCATION-17EVIDENCEANDAUDIT-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[FACT]`

### REQ-LOCATION-17EVIDENCEANDAUDIT-003
*   **Requirement**: Mutations are restricted to actions: `create_location, update_geofence`.
*   **Status**: `[FACT]`

### REQ-LOCATION-17EVIDENCEANDAUDIT-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
