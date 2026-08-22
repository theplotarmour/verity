# Verity Master Platform Specification

## staffing/29-test-matrix.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/staffing.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Test suites matrices mapping.

This document details the `staffing` capability specs for the `29 Test Matrix` contract.

### REQ-STAFFING-29TESTMATRIX-001
*   **Requirement**: The capability manages `WorkforceRoster, ShiftAllocation` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_staffing/models/roster.py`

### REQ-STAFFING-29TESTMATRIX-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, PUBLISHED, CLOSED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-STAFFING-29TESTMATRIX-003
*   **Requirement**: Mutations are restricted to actions: `create_roster, allocate_shift, publish_roster, request_swap`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-STAFFING-29TESTMATRIX-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
