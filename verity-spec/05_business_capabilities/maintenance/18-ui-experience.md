# Verity Master Platform Specification

## maintenance/18-ui-experience.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/maintenance.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Dashboard, kanban, and list views config.

This document details the `maintenance` capability specs for the `18 Ui Experience` contract.

### REQ-MAINTENANCE-18UIEXPERIENCE-001
*   **Requirement**: The capability manages `MaintenanceRequest, MaintenanceSchedule` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/maintenance/models/maintenance.py`

### REQ-MAINTENANCE-18UIEXPERIENCE-002
*   **Requirement**: State changes are constrained to enums: `NEW, IN_PROGRESS, REPAIRED, SCRAPPED`.
*   **Status**: `[UNKNOWN]`

### REQ-MAINTENANCE-18UIEXPERIENCE-003
*   **Requirement**: Mutations are restricted to actions: `request_maintenance, assign_technician, complete_repair`.
*   **Status**: `[UNKNOWN]`

### REQ-MAINTENANCE-18UIEXPERIENCE-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
