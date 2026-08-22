# Verity Master Platform Specification

## maintenance/25-failure-and-exceptions.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/maintenance.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Fallback actions and rollback rules.

This document details the `maintenance` capability specs for the `25 Failure And Exceptions` contract.

### REQ-MAINTENANCE-25FAILUREANDEXCEPTIONS-001
*   **Requirement**: The capability manages `MaintenanceRequest, MaintenanceSchedule` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/maintenance/models/maintenance.py`

### REQ-MAINTENANCE-25FAILUREANDEXCEPTIONS-002
*   **Requirement**: State changes are constrained to enums: `NEW, IN_PROGRESS, REPAIRED, SCRAPPED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-MAINTENANCE-25FAILUREANDEXCEPTIONS-003
*   **Requirement**: Mutations are restricted to actions: `request_maintenance, assign_technician, complete_repair`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-MAINTENANCE-25FAILUREANDEXCEPTIONS-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
