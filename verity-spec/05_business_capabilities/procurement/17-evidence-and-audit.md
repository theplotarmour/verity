# Verity Master Platform Specification

## procurement/17-evidence-and-audit.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/procurement.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Mandatory uploads and activity logs.

This document details the `procurement` capability specs for the `17 Evidence And Audit` contract.

### REQ-PROCUREMENT-17EVIDENCEANDAUDIT-001
*   **Requirement**: The capability manages `PurchaseOrder, PurchaseOrderLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/purchase/models/purchase_order.py`

### REQ-PROCUREMENT-17EVIDENCEANDAUDIT-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, SENT, PURCHASE, DONE, CANCELLED`.
*   **Status**: `[INFERRED]`

### REQ-PROCUREMENT-17EVIDENCEANDAUDIT-003
*   **Requirement**: Mutations are restricted to actions: `create_purchase, send_rfq, confirm_purchase, cancel_purchase`.
*   **Status**: `[INFERRED]`

### REQ-PROCUREMENT-17EVIDENCEANDAUDIT-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
