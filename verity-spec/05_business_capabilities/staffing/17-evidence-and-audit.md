# Verity Master Platform Specification

## staffing/17-evidence-and-audit.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/staffing.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Mandatory uploads and activity logs.

This document details the `staffing` capability specs for the `17 Evidence And Audit` contract.

### REQ-STAFFING-17EVIDENCEANDAUDIT-001
*   **Requirement**: The capability manages `WorkforceRoster, ShiftAllocation` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_staffing/models/roster.py`

### REQ-STAFFING-17EVIDENCEANDAUDIT-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, PUBLISHED, CLOSED`.
*   **Status**: `[INFERRED]`

### REQ-STAFFING-17EVIDENCEANDAUDIT-003
*   **Requirement**: Mutations are restricted to actions: `create_roster, allocate_shift, publish_roster, request_swap`.
*   **Status**: `[INFERRED]`

### REQ-STAFFING-17EVIDENCEANDAUDIT-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
