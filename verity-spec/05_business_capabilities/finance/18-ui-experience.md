# Verity Master Platform Specification

## finance/18-ui-experience.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/finance.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Dashboard, kanban, and list views config.

This document details the `finance` capability specs for the `18 Ui Experience` contract.

### REQ-FINANCE-18UIEXPERIENCE-001
*   **Requirement**: The capability manages `TaxConfig, RevenueProjection` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/account/models/account_tax.py`

### REQ-FINANCE-18UIEXPERIENCE-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FINANCE-18UIEXPERIENCE-003
*   **Requirement**: Mutations are restricted to actions: `configure_tax, recalculate_projections`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FINANCE-18UIEXPERIENCE-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
