# Verity Master Platform Specification

## staffing/01-purpose-and-scope.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/staffing.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Business problem and target boundaries.

This document details the `staffing` capability specs for the `01 Purpose And Scope` contract.

### REQ-STAFFING-01PURPOSEANDSCOPE-001
*   **Requirement**: The capability manages `WorkforceRoster, ShiftAllocation` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_staffing/models/roster.py`

### REQ-STAFFING-01PURPOSEANDSCOPE-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, PUBLISHED, CLOSED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-STAFFING-01PURPOSEANDSCOPE-003
*   **Requirement**: Mutations are restricted to actions: `create_roster, allocate_shift, publish_roster, request_swap`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-STAFFING-01PURPOSEANDSCOPE-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
