# Verity Master Platform Specification

## 09_experience/navigation.md

## Provenance
*   **Primary Sources**: `reference/base/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Role-Based Navigation Shells Specification

This document details the `experience` system specifications for `Navigation`.

### REQ-EXPERIENCE-NAVIGATION-001
*   **Requirement**: The system utilizes `base` core patterns for `role-based navigation shells`.
*   **Status**: `[FACT]`

### REQ-EXPERIENCE-NAVIGATION-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[FACT]`

### REQ-EXPERIENCE-NAVIGATION-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[FACT]`
