# Verity Master Platform Specification

## facilities/06-lifecycle.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/facilities.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Allowed transitions sequence rules.

This document details the `facilities` capability specs for the `06 Lifecycle` contract.

### REQ-FACILITIES-06LIFECYCLE-001
*   **Requirement**: The capability manages `FacilitiesInspection, CleaningVisit` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/custom_facilities/models/visit.py`

### REQ-FACILITIES-06LIFECYCLE-002
*   **Requirement**: State changes are constrained to enums: `SCHEDULED, IN_PROGRESS, VERIFIED, FAILED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FACILITIES-06LIFECYCLE-003
*   **Requirement**: Mutations are restricted to actions: `schedule_inspection, perform_clean, verify_facility`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FACILITIES-06LIFECYCLE-004
*   **Requirement**: Offline sync conflict class is `SEMANTIC_MERGE`.
*   **Status**: `[DECIDED]`
