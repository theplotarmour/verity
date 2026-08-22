# Verity Master Platform Specification

## catalog/06-lifecycle.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/catalog.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Allowed transitions sequence rules.

This document details the `catalog` capability specs for the `06 Lifecycle` contract.

### REQ-CATALOG-06LIFECYCLE-001
*   **Requirement**: The capability manages `CatalogItem, PriceList` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/product/models/product_template.py`

### REQ-CATALOG-06LIFECYCLE-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, ARCHIVED`.
*   **Status**: `[FACT]`

### REQ-CATALOG-06LIFECYCLE-003
*   **Requirement**: Mutations are restricted to actions: `create_item, update_price`.
*   **Status**: `[FACT]`

### REQ-CATALOG-06LIFECYCLE-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
