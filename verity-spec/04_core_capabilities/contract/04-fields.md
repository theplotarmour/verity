# Verity Master Platform Specification

## contract/04-fields.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/contract.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Fields mapping with types and attributes.

This document details the `contract` capability specs for the `04 Fields` contract.

### REQ-CONTRACT-04FIELDS-001
*   **Requirement**: The capability manages `Contract, ContractLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/sale_subscription/models/sale_subscription.py`

### REQ-CONTRACT-04FIELDS-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, ACTIVE, EXPIRED, CANCELLED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-CONTRACT-04FIELDS-003
*   **Requirement**: Mutations are restricted to actions: `create_contract, activate_contract, terminate_contract`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-CONTRACT-04FIELDS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
