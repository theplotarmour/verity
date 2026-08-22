# Verity Master Platform Specification

## field-service/29-test-matrix.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/field-service.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Test suites matrices mapping.

This document details the `field-service` capability specs for the `29 Test Matrix` contract.

### REQ-FIELD-SERVICE-29TESTMATRIX-001
*   **Requirement**: The capability manages `FsmOrder, FsmResourceMapping` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/fsm/models/fsm_order.py`

### REQ-FIELD-SERVICE-29TESTMATRIX-002
*   **Requirement**: State changes are constrained to enums: `UNASSIGNED, ASSIGNED, IN_TRANSIT, ON_SITE, DONE`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FIELD-SERVICE-29TESTMATRIX-003
*   **Requirement**: Mutations are restricted to actions: `create_fsm_order, dispatch_resource, arrive_on_site, complete_fsm_order`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-FIELD-SERVICE-29TESTMATRIX-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
