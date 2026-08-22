# Verity Master Platform Specification

## staffing/26-edge-cases.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/staffing.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Validation failures and overlap resolutions.

This document details the `staffing` capability specs for the `26 Edge Cases` contract.

### REQ-STAFFING-26EDGECASES-001
*   **Requirement**: The capability manages `WorkforceRoster, ShiftAllocation` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_staffing/models/roster.py`

### REQ-STAFFING-26EDGECASES-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, PUBLISHED, CLOSED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-STAFFING-26EDGECASES-003
*   **Requirement**: Mutations are restricted to actions: `create_roster, allocate_shift, publish_roster, request_swap`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-STAFFING-26EDGECASES-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
