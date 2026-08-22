# Verity Master Platform Specification

## crm/16-notifications.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/crm.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Dynamic channel routing notifications.

This document details the `crm` capability specs for the `16 Notifications` contract.

### REQ-CRM-16NOTIFICATIONS-001
*   **Requirement**: The capability manages `Lead, PipelineStage` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/crm/models/crm_lead.py`

### REQ-CRM-16NOTIFICATIONS-002
*   **Requirement**: State changes are constrained to enums: `NEW, QUALIFIED, WON, LOST`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-CRM-16NOTIFICATIONS-003
*   **Requirement**: Mutations are restricted to actions: `create_lead, transition_stage, mark_won, mark_lost`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-CRM-16NOTIFICATIONS-004
*   **Requirement**: Offline sync conflict class is `LWW_ALLOWED`.
*   **Status**: `[DECIDED]`
