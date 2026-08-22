# Verity Master Platform Specification

## security/01-purpose-and-scope.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/security.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Business problem and target boundaries.

This document details the `security` capability specs for the `01 Purpose And Scope` contract.

### REQ-SECURITY-01PURPOSEANDSCOPE-001
*   **Requirement**: The capability manages `GuardPatrol, CheckpointScan` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_security/models/patrol.py`

### REQ-SECURITY-01PURPOSEANDSCOPE-002
*   **Requirement**: State changes are constrained to enums: `ROSTERED, PATROLLING, COMPLETED, INCIDENT_REPORTED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SECURITY-01PURPOSEANDSCOPE-003
*   **Requirement**: Mutations are restricted to actions: `start_patrol, scan_checkpoint, report_incident, end_patrol`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SECURITY-01PURPOSEANDSCOPE-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
