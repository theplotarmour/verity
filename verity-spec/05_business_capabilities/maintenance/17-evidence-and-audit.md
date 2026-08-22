# Verity Master Platform Specification

## maintenance/17-evidence-and-audit.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/maintenance.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Mandatory uploads and activity logs.

This document details the `maintenance` capability specs for the `17 Evidence And Audit` contract.

### REQ-MAINTENANCE-17EVIDENCEANDAUDIT-001
*   **Requirement**: The capability manages `MaintenanceRequest, MaintenanceSchedule` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/maintenance/models/maintenance.py`

### REQ-MAINTENANCE-17EVIDENCEANDAUDIT-002
*   **Requirement**: State changes are constrained to enums: `NEW, IN_PROGRESS, REPAIRED, SCRAPPED`.
*   **Status**: `[INFERRED]`

### REQ-MAINTENANCE-17EVIDENCEANDAUDIT-003
*   **Requirement**: Mutations are restricted to actions: `request_maintenance, assign_technician, complete_repair`.
*   **Status**: `[INFERRED]`

### REQ-MAINTENANCE-17EVIDENCEANDAUDIT-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
