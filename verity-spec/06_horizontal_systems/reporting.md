# Verity Master Platform Specification

## 06_horizontal_systems/reporting.md

## Provenance
*   **Primary Sources**: `reference/metabase/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Operational Reporting Metrics Specification

This document details the `horizontal_systems` system specifications for `Reporting`.

### REQ-HORIZONTALSYSTEMS-REPORTING-001
*   **Requirement**: The system utilizes `metabase` core patterns for `operational reporting metrics`.
*   **Status**: `[UNKNOWN]`

### REQ-HORIZONTALSYSTEMS-REPORTING-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[INFERRED]`

### REQ-HORIZONTALSYSTEMS-REPORTING-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[UNKNOWN]`
