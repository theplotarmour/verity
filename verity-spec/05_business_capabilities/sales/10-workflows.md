# Verity Master Platform Specification

## sales/10-workflows.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/sales.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Workflow orchestration sequences.

This document details the `sales` capability specs for the `10 Workflows` contract.

### REQ-SALES-10WORKFLOWS-001
*   **Requirement**: The capability manages `SaleOrder, SaleOrderLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/sale/models/sale_order.py`

### REQ-SALES-10WORKFLOWS-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, SENT, SALE, DONE, CANCELLED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SALES-10WORKFLOWS-003
*   **Requirement**: Mutations are restricted to actions: `create_order, send_quote, confirm_order, cancel_order`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SALES-10WORKFLOWS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
