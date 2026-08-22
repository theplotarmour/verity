# Verity Master Platform Specification

## catalog/18-ui-experience.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/catalog.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Dashboard, kanban, and list views config.

This document details the `catalog` capability specs for the `18 Ui Experience` contract.

### REQ-CATALOG-18UIEXPERIENCE-001
*   **Requirement**: The capability manages `CatalogItem, PriceList` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/product/models/product_template.py`

### REQ-CATALOG-18UIEXPERIENCE-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, ARCHIVED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-CATALOG-18UIEXPERIENCE-003
*   **Requirement**: Mutations are restricted to actions: `create_item, update_price`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-CATALOG-18UIEXPERIENCE-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
