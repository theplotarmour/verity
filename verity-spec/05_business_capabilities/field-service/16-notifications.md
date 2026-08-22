# Verity Master Platform Specification

## field-service/16-notifications.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/field-service.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Dynamic channel routing notifications.

This document details the `field-service` capability specs for the `16 Notifications` contract.

### REQ-FIELD-SERVICE-16NOTIFICATIONS-001
*   **Requirement**: The capability manages `FsmOrder, FsmResourceMapping` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/fsm/models/fsm_order.py`

### REQ-FIELD-SERVICE-16NOTIFICATIONS-002
*   **Requirement**: State changes are constrained to enums: `UNASSIGNED, ASSIGNED, IN_TRANSIT, ON_SITE, DONE`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FIELD-SERVICE-16NOTIFICATIONS-003
*   **Requirement**: Mutations are restricted to actions: `create_fsm_order, dispatch_resource, arrive_on_site, complete_fsm_order`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FIELD-SERVICE-16NOTIFICATIONS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
