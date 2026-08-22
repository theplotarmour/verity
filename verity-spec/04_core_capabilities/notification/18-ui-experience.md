# Verity Master Platform Specification

## notification/18-ui-experience.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/notification.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Dashboard, kanban, and list views config.

This document details the `notification` capability specs for the `18 Ui Experience` contract.

### REQ-NOTIFICATION-18UIEXPERIENCE-001
*   **Requirement**: The capability manages `NotificationLog, Template` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/mail/models/mail_thread.py`

### REQ-NOTIFICATION-18UIEXPERIENCE-002
*   **Requirement**: State changes are constrained to enums: `PENDING, SENT, FAILED`.
*   **Status**: `[UNKNOWN]`

### REQ-NOTIFICATION-18UIEXPERIENCE-003
*   **Requirement**: Mutations are restricted to actions: `send_notification, create_template`.
*   **Status**: `[UNKNOWN]`

### REQ-NOTIFICATION-18UIEXPERIENCE-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
