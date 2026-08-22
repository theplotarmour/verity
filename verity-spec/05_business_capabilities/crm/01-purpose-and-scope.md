# Verity Master Platform Specification

## crm/01-purpose-and-scope.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/crm.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Business problem and target boundaries.

This document details the `crm` capability specs for the `01 Purpose And Scope` contract.

### REQ-CRM-01PURPOSEANDSCOPE-001
*   **Requirement**: The capability manages `Lead, PipelineStage` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/crm/models/crm_lead.py`

### REQ-CRM-01PURPOSEANDSCOPE-002
*   **Requirement**: State changes are constrained to enums: `NEW, QUALIFIED, WON, LOST`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-CRM-01PURPOSEANDSCOPE-003
*   **Requirement**: Mutations are restricted to actions: `create_lead, transition_stage, mark_won, mark_lost`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-CRM-01PURPOSEANDSCOPE-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
