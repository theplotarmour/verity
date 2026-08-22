# Verity Master Platform Specification

## party/17-evidence-and-audit.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/party.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Mandatory uploads and activity logs.

This document details the `party` capability specs for the `17 Evidence And Audit` contract.

### REQ-PARTY-17EVIDENCEANDAUDIT-001
*   **Requirement**: The capability manages `Party, Contact` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_partner.py`

### REQ-PARTY-17EVIDENCEANDAUDIT-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, INACTIVE`.
*   **Status**: `[INFERRED]`

### REQ-PARTY-17EVIDENCEANDAUDIT-003
*   **Requirement**: Mutations are restricted to actions: `create_party, update_party, archive_party`.
*   **Status**: `[INFERRED]`

### REQ-PARTY-17EVIDENCEANDAUDIT-004
*   **Requirement**: Offline sync conflict class is `MERGEABLE`.
*   **Status**: `[DECIDED]`
