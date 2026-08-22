# Verity Master Platform Specification

## catalog/27-migrations.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/catalog.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Upgrade steps and schema conversions.

This document details the `catalog` capability specs for the `27 Migrations` contract.

### REQ-CATALOG-27MIGRATIONS-001
*   **Requirement**: The capability manages `CatalogItem, PriceList` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/product/models/product_template.py`

### REQ-CATALOG-27MIGRATIONS-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, ARCHIVED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-CATALOG-27MIGRATIONS-003
*   **Requirement**: Mutations are restricted to actions: `create_item, update_price`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-CATALOG-27MIGRATIONS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
