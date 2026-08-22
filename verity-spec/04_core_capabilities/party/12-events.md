# Verity Master Platform Specification

## party/12-events.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/party.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Events emitted and consumed signatures.

This document details the `party` capability specs for the `12 Events` contract.

### REQ-PARTY-12EVENTS-001
*   **Requirement**: The capability manages `Party, Contact` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_partner.py`

### REQ-PARTY-12EVENTS-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PARTY-12EVENTS-003
*   **Requirement**: Mutations are restricted to actions: `create_party, update_party, archive_party`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-PARTY-12EVENTS-004
*   **Requirement**: Offline sync conflict class is `MERGEABLE`.
*   **Status**: `[DECIDED]`
