# Verity Master Platform Specification

## notification/12-events.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/notification.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Events emitted and consumed signatures.

This document details the `notification` capability specs for the `12 Events` contract.

### REQ-NOTIFICATION-12EVENTS-001
*   **Requirement**: The capability manages `NotificationLog, Template` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/mail/models/mail_thread.py`

### REQ-NOTIFICATION-12EVENTS-002
*   **Requirement**: State changes are constrained to enums: `PENDING, SENT, FAILED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-NOTIFICATION-12EVENTS-003
*   **Requirement**: Mutations are restricted to actions: `send_notification, create_template`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-NOTIFICATION-12EVENTS-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
