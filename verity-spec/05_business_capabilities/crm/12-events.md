# Verity Master Platform Specification

## crm/12-events.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/crm.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Events emitted and consumed signatures.

This document details the `crm` capability specs for the `12 Events` contract.

### REQ-CRM-12EVENTS-001
*   **Requirement**: The capability manages `Lead, PipelineStage` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/crm/models/crm_lead.py`

### REQ-CRM-12EVENTS-002
*   **Requirement**: State changes are constrained to enums: `NEW, QUALIFIED, WON, LOST`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-CRM-12EVENTS-003
*   **Requirement**: Mutations are restricted to actions: `create_lead, transition_stage, mark_won, mark_lost`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-CRM-12EVENTS-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
