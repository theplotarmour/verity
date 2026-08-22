# Verity Master Platform Specification

## party/00-overview.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/party.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Capability Summary overview and registration key.

This document details the `party` capability specs for the `00 Overview` contract.

### REQ-PARTY-00OVERVIEW-001
*   **Requirement**: The capability manages `Party, Contact` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_partner.py`

### REQ-PARTY-00OVERVIEW-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PARTY-00OVERVIEW-003
*   **Requirement**: Mutations are restricted to actions: `create_party, update_party, archive_party`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PARTY-00OVERVIEW-004
*   **Requirement**: Offline sync conflict class is `MERGEABLE`.
*   **Status**: `[DECIDED]`
