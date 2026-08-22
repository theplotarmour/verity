# Verity Master Platform Specification

## procurement/06-lifecycle.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/procurement.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Allowed transitions sequence rules.

This document details the `procurement` capability specs for the `06 Lifecycle` contract.

### REQ-PROCUREMENT-06LIFECYCLE-001
*   **Requirement**: The capability manages `PurchaseOrder, PurchaseOrderLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/purchase/models/purchase_order.py`

### REQ-PROCUREMENT-06LIFECYCLE-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, SENT, PURCHASE, DONE, CANCELLED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-PROCUREMENT-06LIFECYCLE-003
*   **Requirement**: Mutations are restricted to actions: `create_purchase, send_rfq, confirm_purchase, cancel_purchase`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-PROCUREMENT-06LIFECYCLE-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
