# Verity Master Platform Specification

## maintenance/24-extension-points.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/maintenance.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Schema dynamic document extensions slots and hook callbacks.

This document details the `maintenance` capability specs for the `24 Extension Points` contract.

### REQ-MAINTENANCE-24EXTENSIONPOINTS-001
*   **Requirement**: The capability manages `MaintenanceRequest, MaintenanceSchedule` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/maintenance/models/maintenance.py`

### REQ-MAINTENANCE-24EXTENSIONPOINTS-002
*   **Requirement**: State changes are constrained to enums: `NEW, IN_PROGRESS, REPAIRED, SCRAPPED`.
*   **Status**: `[UNKNOWN]`

### REQ-MAINTENANCE-24EXTENSIONPOINTS-003
*   **Requirement**: Mutations are restricted to actions: `request_maintenance, assign_technician, complete_repair`.
*   **Status**: `[UNKNOWN]`

### REQ-MAINTENANCE-24EXTENSIONPOINTS-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
