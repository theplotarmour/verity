# Verity Master Platform Specification

## subscriptions/07-states.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/subscriptions.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. System categories vs custom labels mapping.

This document details the `subscriptions` capability specs for the `07 States` contract.

### REQ-SUBSCRIPTIONS-07STATES-001
*   **Requirement**: The capability manages `SubscriptionContract, RecurringInvoiceLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/sale_subscription/models/sale_subscription.py`

### REQ-SUBSCRIPTIONS-07STATES-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, ACTIVE, PAST_DUE, TERMINATED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SUBSCRIPTIONS-07STATES-003
*   **Requirement**: Mutations are restricted to actions: `create_subscription, billing_run, suspend_subscription`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SUBSCRIPTIONS-07STATES-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
