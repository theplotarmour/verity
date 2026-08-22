# Verity Master Platform Specification

## security/26-edge-cases.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/security.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Validation failures and overlap resolutions.

This document details the `security` capability specs for the `26 Edge Cases` contract.

### REQ-SECURITY-26EDGECASES-001
*   **Requirement**: The capability manages `GuardPatrol, CheckpointScan` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_security/models/patrol.py`

### REQ-SECURITY-26EDGECASES-002
*   **Requirement**: State changes are constrained to enums: `ROSTERED, PATROLLING, COMPLETED, INCIDENT_REPORTED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SECURITY-26EDGECASES-003
*   **Requirement**: Mutations are restricted to actions: `start_patrol, scan_checkpoint, report_incident, end_patrol`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SECURITY-26EDGECASES-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
