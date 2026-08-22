# Verity Master Platform Specification

## security/22-integrations.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/security.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. External API integrations connectors.

This document details the `security` capability specs for the `22 Integrations` contract.

### REQ-SECURITY-22INTEGRATIONS-001
*   **Requirement**: The capability manages `GuardPatrol, CheckpointScan` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_security/models/patrol.py`

### REQ-SECURITY-22INTEGRATIONS-002
*   **Requirement**: State changes are constrained to enums: `ROSTERED, PATROLLING, COMPLETED, INCIDENT_REPORTED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SECURITY-22INTEGRATIONS-003
*   **Requirement**: Mutations are restricted to actions: `start_patrol, scan_checkpoint, report_incident, end_patrol`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SECURITY-22INTEGRATIONS-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
