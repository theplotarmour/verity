# Verity Master Platform Specification

## resource/21-search-and-reporting.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/resource.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Elastic indexes and analytics aggregations.

This document details the `resource` capability specs for the `21 Search And Reporting` contract.

### REQ-RESOURCE-21SEARCHANDREPORTING-001
*   **Requirement**: The capability manages `Resource, Schedule, Availability` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/hr/models/hr_employee.py`

### REQ-RESOURCE-21SEARCHANDREPORTING-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE, OUT_OF_OFFICE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-RESOURCE-21SEARCHANDREPORTING-003
*   **Requirement**: Mutations are restricted to actions: `create_resource, update_schedule, set_out_of_office`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-RESOURCE-21SEARCHANDREPORTING-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
