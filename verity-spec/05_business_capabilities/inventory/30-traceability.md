# Verity Master Platform Specification

## inventory/30-traceability.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Odoo and reference files traceability indexes.

This document details the `inventory` capability specs for the `30 Traceability` contract.

### REQ-INVENTORY-30TRACEABILITY-001
*   **Requirement**: The capability manages `StockPicking, StockMove` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/stock/models/stock_picking.py`

### REQ-INVENTORY-30TRACEABILITY-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, WAITING, CONFIRMED, ASSIGNED, DONE, CANCELLED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-INVENTORY-30TRACEABILITY-003
*   **Requirement**: Mutations are restricted to actions: `create_picking, reserve_stock, validate_picking`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-INVENTORY-30TRACEABILITY-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
