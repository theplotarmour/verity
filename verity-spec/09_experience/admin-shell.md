# Verity Master Platform Specification

## 09_experience/admin-shell.md

## Provenance
*   **Primary Sources**: `reference/base/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. System Setup Registry Config Shell Specification

This document details the `experience` system specifications for `Admin Shell`.

### REQ-EXPERIENCE-ADMINSHELL-001
*   **Requirement**: The system utilizes `base` core patterns for `system setup registry config shell`.
*   **Status**: `[FACT]`

### REQ-EXPERIENCE-ADMINSHELL-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[FACT]`

### REQ-EXPERIENCE-ADMINSHELL-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[FACT]`
