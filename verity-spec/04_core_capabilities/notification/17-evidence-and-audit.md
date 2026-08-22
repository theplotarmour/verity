# Verity Master Platform Specification

## notification/17-evidence-and-audit.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/notification.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Mandatory uploads and activity logs.

This document details the `notification` capability specs for the `17 Evidence And Audit` contract.

### REQ-NOTIFICATION-17EVIDENCEANDAUDIT-001
*   **Requirement**: The capability manages `NotificationLog, Template` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/mail/models/mail_thread.py`

### REQ-NOTIFICATION-17EVIDENCEANDAUDIT-002
*   **Requirement**: State changes are constrained to enums: `PENDING, SENT, FAILED`.
*   **Status**: `[INFERRED]`

### REQ-NOTIFICATION-17EVIDENCEANDAUDIT-003
*   **Requirement**: Mutations are restricted to actions: `send_notification, create_template`.
*   **Status**: `[INFERRED]`

### REQ-NOTIFICATION-17EVIDENCEANDAUDIT-004
*   **Requirement**: Offline sync conflict class is `APPEND_ONLY`.
*   **Status**: `[DECIDED]`
