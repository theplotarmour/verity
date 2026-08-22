# Verity Master Platform Specification

## subscriptions/15-sla.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/subscriptions.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Escalation paths and timer rules.

This document details the `subscriptions` capability specs for the `15 Sla` contract.

### REQ-SUBSCRIPTIONS-15SLA-001
*   **Requirement**: The capability manages `SubscriptionContract, RecurringInvoiceLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/sale_subscription/models/sale_subscription.py`

### REQ-SUBSCRIPTIONS-15SLA-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, ACTIVE, PAST_DUE, TERMINATED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SUBSCRIPTIONS-15SLA-003
*   **Requirement**: Mutations are restricted to actions: `create_subscription, billing_run, suspend_subscription`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SUBSCRIPTIONS-15SLA-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
