# Verity Master Platform Specification

## 09_experience/worker-shell.md

## Provenance
*   **Primary Sources**: `reference/base/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Frontline Worker Action Shell Specification

This document details the `experience` system specifications for `Worker Shell`.

### REQ-EXPERIENCE-WORKERSHELL-001
*   **Requirement**: The system utilizes `base` core patterns for `frontline worker action shell`.
*   **Status**: `[FACT]`

### REQ-EXPERIENCE-WORKERSHELL-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[FACT]`

### REQ-EXPERIENCE-WORKERSHELL-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[FACT]`
