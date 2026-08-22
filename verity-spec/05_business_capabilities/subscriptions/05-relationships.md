# Verity Master Platform Specification

## subscriptions/05-relationships.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/subscriptions.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Delete cascade and foreign key constraints.

This document details the `subscriptions` capability specs for the `05 Relationships` contract.

### REQ-SUBSCRIPTIONS-05RELATIONSHIPS-001
*   **Requirement**: The capability manages `SubscriptionContract, RecurringInvoiceLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/sale_subscription/models/sale_subscription.py`

### REQ-SUBSCRIPTIONS-05RELATIONSHIPS-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, ACTIVE, PAST_DUE, TERMINATED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SUBSCRIPTIONS-05RELATIONSHIPS-003
*   **Requirement**: Mutations are restricted to actions: `create_subscription, billing_run, suspend_subscription`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SUBSCRIPTIONS-05RELATIONSHIPS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
