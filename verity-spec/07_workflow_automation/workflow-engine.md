# Verity Master Platform Specification

## 07_workflow_automation/workflow-engine.md

## Provenance
*   **Primary Sources**: `reference/temporal/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Durable Workflow Replay State Machines Specification

This document details the `workflow_automation` system specifications for `Workflow Engine`.

### REQ-WORKFLOWAUTOMATION-WORKFLOWENGINE-001
*   **Requirement**: The system utilizes `temporal` core patterns for `durable workflow replay state machines`.
*   **Status**: `[FACT]`

### REQ-WORKFLOWAUTOMATION-WORKFLOWENGINE-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[FACT]`

### REQ-WORKFLOWAUTOMATION-WORKFLOWENGINE-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[FACT]`
