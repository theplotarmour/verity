# Verity Master Platform Specification

## party/26-edge-cases.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/party.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Validation failures and overlap resolutions.

This document details the `party` capability specs for the `26 Edge Cases` contract.

### REQ-PARTY-26EDGECASES-001
*   **Requirement**: The capability manages `Party, Contact` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_partner.py`

### REQ-PARTY-26EDGECASES-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PARTY-26EDGECASES-003
*   **Requirement**: Mutations are restricted to actions: `create_party, update_party, archive_party`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PARTY-26EDGECASES-004
*   **Requirement**: Offline sync conflict class is `MERGEABLE`.
*   **Status**: `[DECIDED]`
