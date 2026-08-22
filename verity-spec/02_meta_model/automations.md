# Verity Master Platform Specification

## 02_meta_model/automations.md

## Provenance
*   **Primary Sources**: `reference/n8n/concept-inventory.md` / `reference/n8n/verity-implications.md`
*   **Verity Bible Authority**: [verity-bible/volume_3_execution_workflows.md](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md) (Section 4: DAG-based Workflow Execution)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Node-Graph Automation Engine

Verity automations are modeled as Directed Acyclic Graphs (DAGs) of execution nodes, where standard data payloads flow between nodes.

---

## 2. Dynamic Execution Model

### MET-AUT-001: Composable Node Types
*   **Description**: Nodes are categorized into distinct types:
    *   `Trigger Nodes`: Persistently listen for incoming webhook payloads, scheduled chron/timers, or platform Events, initiating workflow stacks.
    *   `Action Nodes`: Execute integrations or mutate database entities.
    *   `Logic Nodes`: Direct flow paths (IF/Switch conditionals, parallel branching, and join nodes).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Traceability**: Mapped from n8n trigger and action concepts.

### MET-AUT-002: Standardized Item Envelope
*   **Description**: Every node receives and outputs a standardized data envelope mapping parameters dynamically.
*   **Envelope Schema**:
    ```typescript
    type AutomationPayload = {
      json: Record<string, any>;
      binary?: Array<{
        key: string;
        mimetype: string;
        size: number;
      }>;
      error?: {
        message: string;
        code: string;
      };
    };
    ```
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Traceability**: n8n `INodeExecutionData` model.

---

## 3. Credential Security

### MET-AUT-003: Credential Registry
*   **Description**: Third-party integration tokens and secrets are stored in a dedicated, encrypted Credential Registry.
*   **Logical Rule**: Automations reference credentials by name or reference ID. Secrets are never exposed in plaintext inside workflow JSON mappings, and are decrypted only at execution runtime inside the action node container.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Traceability**: n8n credential registry pattern.
