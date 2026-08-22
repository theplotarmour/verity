# Verity Master Platform Specification

## finance/16-notifications.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/finance.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Dynamic channel routing notifications.

This document details the `finance` capability specs for the `16 Notifications` contract.

### REQ-FINANCE-16NOTIFICATIONS-001
*   **Requirement**: The capability manages `TaxConfig, RevenueProjection` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/account/models/account_tax.py`

### REQ-FINANCE-16NOTIFICATIONS-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FINANCE-16NOTIFICATIONS-003
*   **Requirement**: Mutations are restricted to actions: `configure_tax, recalculate_projections`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FINANCE-16NOTIFICATIONS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
