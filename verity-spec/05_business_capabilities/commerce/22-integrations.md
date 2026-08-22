# Verity Master Platform Specification

## commerce/22-integrations.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/commerce.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. External API integrations connectors.

This document details the `commerce` capability specs for the `22 Integrations` contract.

### REQ-COMMERCE-22INTEGRATIONS-001
*   **Requirement**: The capability manages `Invoice, PaymentTransaction` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/account/models/account_move.py`

### REQ-COMMERCE-22INTEGRATIONS-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, POSTED, PAID, CANCELLED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-COMMERCE-22INTEGRATIONS-003
*   **Requirement**: Mutations are restricted to actions: `create_invoice, post_invoice, register_payment, void_payment`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-COMMERCE-22INTEGRATIONS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
