# Verity Master Platform Specification

## party/23-configuration.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/party.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Scope settings and default profiles.

This document details the `party` capability specs for the `23 Configuration` contract.

### REQ-PARTY-23CONFIGURATION-001
*   **Requirement**: The capability manages `Party, Contact` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_partner.py`

### REQ-PARTY-23CONFIGURATION-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PARTY-23CONFIGURATION-003
*   **Requirement**: Mutations are restricted to actions: `create_party, update_party, archive_party`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PARTY-23CONFIGURATION-004
*   **Requirement**: Offline sync conflict class is `MERGEABLE`.
*   **Status**: `[DECIDED]`
