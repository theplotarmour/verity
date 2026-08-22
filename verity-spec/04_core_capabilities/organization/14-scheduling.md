# Verity Master Platform Specification

## organization/14-scheduling.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/organization.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Resource booking calendars matching.

This document details the `organization` capability specs for the `14 Scheduling` contract.

### REQ-ORGANIZATION-14SCHEDULING-001
*   **Requirement**: The capability manages `Organization, Membership` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_company.py`

### REQ-ORGANIZATION-14SCHEDULING-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN]`

### REQ-ORGANIZATION-14SCHEDULING-003
*   **Requirement**: Mutations are restricted to actions: `create_org, update_org, add_member, remove_member`.
*   **Status**: `[UNKNOWN]`

### REQ-ORGANIZATION-14SCHEDULING-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
