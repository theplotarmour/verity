# Verity Master Platform Specification

## document/06-lifecycle.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/document.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Allowed transitions sequence rules.

This document details the `document` capability specs for the `06 Lifecycle` contract.

### REQ-DOCUMENT-06LIFECYCLE-001
*   **Requirement**: The capability manages `Document, Attachment` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/ir_attachment.py`

### REQ-DOCUMENT-06LIFECYCLE-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, ARCHIVED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-DOCUMENT-06LIFECYCLE-003
*   **Requirement**: Mutations are restricted to actions: `upload_document, archive_document`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-DOCUMENT-06LIFECYCLE-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
