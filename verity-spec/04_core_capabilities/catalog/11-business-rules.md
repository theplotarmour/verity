# Verity Master Platform Specification

## catalog/11-business-rules.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/catalog.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Core business validation rules and invariants.

This document details the `catalog` capability specs for the `11 Business Rules` contract.

### REQ-CATALOG-11BUSINESSRULES-001
*   **Requirement**: The capability manages `CatalogItem, PriceList` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/product/models/product_template.py`

### REQ-CATALOG-11BUSINESSRULES-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, ARCHIVED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-CATALOG-11BUSINESSRULES-003
*   **Requirement**: Mutations are restricted to actions: `create_item, update_price`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-CATALOG-11BUSINESSRULES-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
