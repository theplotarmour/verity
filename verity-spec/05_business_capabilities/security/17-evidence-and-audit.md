# Verity Master Platform Specification

## security/17-evidence-and-audit.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/security.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Mandatory uploads and activity logs.

This document details the `security` capability specs for the `17 Evidence And Audit` contract.

### REQ-SECURITY-17EVIDENCEANDAUDIT-001
*   **Requirement**: The capability manages `GuardPatrol, CheckpointScan` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_security/models/patrol.py`

### REQ-SECURITY-17EVIDENCEANDAUDIT-002
*   **Requirement**: State changes are constrained to enums: `ROSTERED, PATROLLING, COMPLETED, INCIDENT_REPORTED`.
*   **Status**: `[INFERRED]`

### REQ-SECURITY-17EVIDENCEANDAUDIT-003
*   **Requirement**: Mutations are restricted to actions: `start_patrol, scan_checkpoint, report_incident, end_patrol`.
*   **Status**: `[INFERRED]`

### REQ-SECURITY-17EVIDENCEANDAUDIT-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
