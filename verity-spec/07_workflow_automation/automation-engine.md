# Verity Master Platform Specification

## 07_workflow_automation/automation-engine.md

## Provenance
*   **Primary Sources**: `reference/n8n/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Composable Dag Action Routes Specification

This document details the `workflow_automation` system specifications for `Automation Engine`.

### REQ-WORKFLOWAUTOMATION-AUTOMATIONENGINE-001
*   **Requirement**: The system utilizes `n8n` core patterns for `composable DAG action routes`.
*   **Status**: `[UNKNOWN]`

### REQ-WORKFLOWAUTOMATION-AUTOMATIONENGINE-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[INFERRED]`

### REQ-WORKFLOWAUTOMATION-AUTOMATIONENGINE-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[UNKNOWN]`
