# Verity Master Platform Specification

## notification/01-purpose-and-scope.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/notification.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Business problem and target boundaries.

This document details the `notification` capability specs for the `01 Purpose And Scope` contract.

### REQ-NOTIFICATION-01PURPOSEANDSCOPE-001
*   **Requirement**: The capability manages `NotificationLog, Template` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/mail/models/mail_thread.py`

### REQ-NOTIFICATION-01PURPOSEANDSCOPE-002
*   **Requirement**: State changes are constrained to enums: `PENDING, SENT, FAILED`.
*   **Status**: `[UNKNOWN]`

### REQ-NOTIFICATION-01PURPOSEANDSCOPE-003
*   **Requirement**: Mutations are restricted to actions: `send_notification, create_template`.
*   **Status**: `[UNKNOWN]`

### REQ-NOTIFICATION-01PURPOSEANDSCOPE-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
