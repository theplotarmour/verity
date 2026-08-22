# Verity Master Platform Specification

## notification/30-traceability.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/notification.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Odoo and reference files traceability indexes.

This document details the `notification` capability specs for the `30 Traceability` contract.

### REQ-NOTIFICATION-30TRACEABILITY-001
*   **Requirement**: The capability manages `NotificationLog, Template` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/mail/models/mail_thread.py`

### REQ-NOTIFICATION-30TRACEABILITY-002
*   **Requirement**: State changes are constrained to enums: `PENDING, SENT, FAILED`.
*   **Status**: `[FACT]`

### REQ-NOTIFICATION-30TRACEABILITY-003
*   **Requirement**: Mutations are restricted to actions: `send_notification, create_template`.
*   **Status**: `[FACT]`

### REQ-NOTIFICATION-30TRACEABILITY-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
