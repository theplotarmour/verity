# Verity Master Platform Specification

## notification/29-test-matrix.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/notification.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Test suites matrices mapping.

This document details the `notification` capability specs for the `29 Test Matrix` contract.

### REQ-NOTIFICATION-29TESTMATRIX-001
*   **Requirement**: The capability manages `NotificationLog, Template` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/mail/models/mail_thread.py`

### REQ-NOTIFICATION-29TESTMATRIX-002
*   **Requirement**: State changes are constrained to enums: `PENDING, SENT, FAILED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-NOTIFICATION-29TESTMATRIX-003
*   **Requirement**: Mutations are restricted to actions: `send_notification, create_template`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-NOTIFICATION-29TESTMATRIX-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
