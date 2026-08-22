# Verity Master Platform Specification

## facilities/11-business-rules.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/facilities.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Core business validation rules and invariants.

This document details the `facilities` capability specs for the `11 Business Rules` contract.

### REQ-FACILITIES-11BUSINESSRULES-001
*   **Requirement**: The capability manages `FacilitiesInspection, CleaningVisit` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_facilities/models/visit.py`

### REQ-FACILITIES-11BUSINESSRULES-002
*   **Requirement**: State changes are constrained to enums: `SCHEDULED, IN_PROGRESS, VERIFIED, FAILED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FACILITIES-11BUSINESSRULES-003
*   **Requirement**: Mutations are restricted to actions: `schedule_inspection, perform_clean, verify_facility`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FACILITIES-11BUSINESSRULES-004
*   **Requirement**: Offline sync conflict class is `SEMANTIC_MERGE`.
*   **Status**: `[DECIDED]`
