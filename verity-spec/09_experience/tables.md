# Verity Master Platform Specification

## 09_experience/tables.md

## Provenance
*   **Primary Sources**: `SOURCE_UNAVAILABLE`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. List Views Columns Configuration Specification

This document details the `experience` system specifications for `Tables`.

### REQ-EXPERIENCE-TABLES-001
*   **Requirement**: The system utilizes `base` core patterns for `list views columns configuration`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-EXPERIENCE-TABLES-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[INFERRED]`

### REQ-EXPERIENCE-TABLES-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 2. Operational Collection Contract

### REQ-EXPERIENCE-TABLES-004
*   **Requirement**: A collection shows the record identity first, supporting data second, and semantic state as text plus its visual cue. Dense desktop tables do not use zebra stripes, decorative card-per-row framing, or a redundant open action when the identity already opens the record.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-TABLES-005
*   **Requirement**: Filtering, sorting, saved scopes, pagination, and bulk selection are explicit and reversible. Filters refine the current safe result set; they do not imply a broader authorization scope or silently modify a record.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-TABLES-006
*   **Requirement**: Each collection distinguishes an empty collection, a filtered no-match result, loading/degraded data, and access denial. A true empty state includes an eligible create or recovery path when one exists.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-TABLES-007
*   **Requirement**: Inline editing and drag-to-change-state are exceptional, not defaults. They may ship only when the resulting command, validation, audit event, permission check, and recovery behaviour are identical to the record workspace flow.
*   **Status**: `[DECIDED]`
