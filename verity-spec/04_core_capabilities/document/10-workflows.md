# Verity Master Platform Specification

## document/10-workflows.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/document.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Workflow orchestration sequences.

This document details the `document` capability specs for the `10 Workflows` contract.

### REQ-DOCUMENT-10WORKFLOWS-001
*   **Requirement**: The capability manages `Document, Attachment` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/ir_attachment.py`

### REQ-DOCUMENT-10WORKFLOWS-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, ARCHIVED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-DOCUMENT-10WORKFLOWS-003
*   **Requirement**: Mutations are restricted to actions: `upload_document, archive_document`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-DOCUMENT-10WORKFLOWS-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
