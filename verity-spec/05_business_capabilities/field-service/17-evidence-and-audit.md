# Verity Master Platform Specification

## field-service/17-evidence-and-audit.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/field-service.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Mandatory uploads and activity logs.

This document details the `field-service` capability specs for the `17 Evidence And Audit` contract.

### REQ-FIELD-SERVICE-17EVIDENCEANDAUDIT-001
*   **Requirement**: The capability manages `FsmOrder, FsmResourceMapping` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/fsm/models/fsm_order.py`

### REQ-FIELD-SERVICE-17EVIDENCEANDAUDIT-002
*   **Requirement**: State changes are constrained to enums: `UNASSIGNED, ASSIGNED, IN_TRANSIT, ON_SITE, DONE`.
*   **Status**: `[INFERRED]`

### REQ-FIELD-SERVICE-17EVIDENCEANDAUDIT-003
*   **Requirement**: Mutations are restricted to actions: `create_fsm_order, dispatch_resource, arrive_on_site, complete_fsm_order`.
*   **Status**: `[INFERRED]`

### REQ-FIELD-SERVICE-17EVIDENCEANDAUDIT-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
