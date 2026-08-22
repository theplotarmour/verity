# Verity Master Platform Specification

## 10_integrations/accounting.md

## Provenance
*   **Primary Sources**: `reference/saleor/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Ledger Billing Drafts Export Specification

This document details the `integrations` system specifications for `Accounting`.

### REQ-INTEGRATIONS-ACCOUNTING-001
*   **Requirement**: The system utilizes `saleor` core patterns for `ledger billing drafts export`.
*   **Status**: `[FACT]`

### REQ-INTEGRATIONS-ACCOUNTING-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[FACT]`

### REQ-INTEGRATIONS-ACCOUNTING-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[FACT]`
