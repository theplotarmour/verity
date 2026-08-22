# Verity Master Platform Specification

## finance/23-configuration.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/finance.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Scope settings and default profiles.

This document details the `finance` capability specs for the `23 Configuration` contract.

### REQ-FINANCE-23CONFIGURATION-001
*   **Requirement**: The capability manages `TaxConfig, RevenueProjection` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/account/models/account_tax.py`

### REQ-FINANCE-23CONFIGURATION-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FINANCE-23CONFIGURATION-003
*   **Requirement**: Mutations are restricted to actions: `configure_tax, recalculate_projections`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FINANCE-23CONFIGURATION-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
