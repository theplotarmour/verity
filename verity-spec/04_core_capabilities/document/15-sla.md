# Verity Master Platform Specification

## document/15-sla.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/document.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Escalation paths and timer rules.

This document details the `document` capability specs for the `15 Sla` contract.

### REQ-DOCUMENT-15SLA-001
*   **Requirement**: The capability manages `Document, Attachment` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/ir_attachment.py`

### REQ-DOCUMENT-15SLA-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, ARCHIVED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-DOCUMENT-15SLA-003
*   **Requirement**: Mutations are restricted to actions: `upload_document, archive_document`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-DOCUMENT-15SLA-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
