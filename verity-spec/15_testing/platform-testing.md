# Verity Master Platform Specification

## 15_testing/platform-testing.md

## Provenance
*   **Primary Sources**: `reference/base/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Core Database And Auth Integration Tests Specification

This document details the `testing` system specifications for `Platform Testing`.

### REQ-TESTING-PLATFORMTESTING-001
*   **Requirement**: The system utilizes `base` core patterns for `core database and auth integration tests`.
*   **Status**: `[FACT]`

### REQ-TESTING-PLATFORMTESTING-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[FACT]`

### REQ-TESTING-PLATFORMTESTING-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[FACT]`
