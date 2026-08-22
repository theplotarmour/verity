# Verity Master Platform Specification

## commerce/04-fields.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/commerce.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Fields mapping with types and attributes.

This document details the `commerce` capability specs for the `04 Fields` contract.

### REQ-COMMERCE-04FIELDS-001
*   **Requirement**: The capability manages `Invoice, PaymentTransaction` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/account/models/account_move.py`

### REQ-COMMERCE-04FIELDS-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, POSTED, PAID, CANCELLED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-COMMERCE-04FIELDS-003
*   **Requirement**: Mutations are restricted to actions: `create_invoice, post_invoice, register_payment, void_payment`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-COMMERCE-04FIELDS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
