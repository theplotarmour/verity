# Verity Master Platform Specification

## 15_testing/capability-testing.md

## Provenance
*   **Primary Sources**: `reference/base/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Individual Capability Schema Unit Tests Specification

This document details the `testing` system specifications for `Capability Testing`.

### REQ-TESTING-CAPABILITYTESTING-001
*   **Requirement**: The system utilizes `base` core patterns for `individual capability schema unit tests`.
*   **Status**: `[FACT]`

### REQ-TESTING-CAPABILITYTESTING-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[FACT]`

### REQ-TESTING-CAPABILITYTESTING-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[FACT]`
