# Verity Master Platform Specification

## maintenance/28-acceptance-criteria.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/maintenance.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Validation parameters criteria.

This document details the `maintenance` capability specs for the `28 Acceptance Criteria` contract.

### REQ-MAINTENANCE-28ACCEPTANCECRITERIA-001
*   **Requirement**: The capability manages `MaintenanceRequest, MaintenanceSchedule` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/maintenance/models/maintenance.py`

### REQ-MAINTENANCE-28ACCEPTANCECRITERIA-002
*   **Requirement**: State changes are constrained to enums: `NEW, IN_PROGRESS, REPAIRED, SCRAPPED`.
*   **Status**: `[UNKNOWN]`

### REQ-MAINTENANCE-28ACCEPTANCECRITERIA-003
*   **Requirement**: Mutations are restricted to actions: `request_maintenance, assign_technician, complete_repair`.
*   **Status**: `[UNKNOWN]`

### REQ-MAINTENANCE-28ACCEPTANCECRITERIA-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
