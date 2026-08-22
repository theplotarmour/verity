# Verity Master Platform Specification

## security/28-acceptance-criteria.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/security.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Validation parameters criteria.

This document details the `security` capability specs for the `28 Acceptance Criteria` contract.

### REQ-SECURITY-28ACCEPTANCECRITERIA-001
*   **Requirement**: The capability manages `GuardPatrol, CheckpointScan` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_security/models/patrol.py`

### REQ-SECURITY-28ACCEPTANCECRITERIA-002
*   **Requirement**: State changes are constrained to enums: `ROSTERED, PATROLLING, COMPLETED, INCIDENT_REPORTED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SECURITY-28ACCEPTANCECRITERIA-003
*   **Requirement**: Mutations are restricted to actions: `start_patrol, scan_checkpoint, report_incident, end_patrol`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SECURITY-28ACCEPTANCECRITERIA-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
