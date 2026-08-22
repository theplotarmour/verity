# Verity Master Platform Specification

## subscriptions/29-test-matrix.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/subscriptions.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Test suites matrices mapping.

This document details the `subscriptions` capability specs for the `29 Test Matrix` contract.

### REQ-SUBSCRIPTIONS-29TESTMATRIX-001
*   **Requirement**: The capability manages `SubscriptionContract, RecurringInvoiceLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/sale_subscription/models/sale_subscription.py`

### REQ-SUBSCRIPTIONS-29TESTMATRIX-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, ACTIVE, PAST_DUE, TERMINATED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SUBSCRIPTIONS-29TESTMATRIX-003
*   **Requirement**: Mutations are restricted to actions: `create_subscription, billing_run, suspend_subscription`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-SUBSCRIPTIONS-29TESTMATRIX-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
