# Verity Master Platform Specification

## document/11-business-rules.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/document.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Core business validation rules and invariants.

This document details the `document` capability specs for the `11 Business Rules` contract.

### REQ-DOCUMENT-11BUSINESSRULES-001
*   **Requirement**: The capability manages `Document, Attachment` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/ir_attachment.py`

### REQ-DOCUMENT-11BUSINESSRULES-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, ARCHIVED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-DOCUMENT-11BUSINESSRULES-003
*   **Requirement**: Mutations are restricted to actions: `upload_document, archive_document`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-DOCUMENT-11BUSINESSRULES-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
