# n8n — Behavior Inventory

Source: packages/core/src/execution-engine/workflow-execute.ts
Commit: fca317096e36494053a55ab3c4e16834819b540c

---

### Workflow Execution Start

Source evidence: `packages/core/src/execution-engine/workflow-execute.ts:117-206`
Trigger: External event, webhook, schedule, or manual trigger.
Preconditions: Workflow is active and valid.
Steps:
1. Determine `startNode` (Trigger node).
2. Initialize `nodeExecutionStack` with the trigger node and initial execution data.
3. Call `processRunExecutionData` to begin draining the stack.
State changes: Execution status becomes 'running'.
Side effects: Node execution functions are called.
Failure handling: Captured in execution data; routes to error workflow if configured.

---

### Node-to-Node Data Passing (Execution Stack)

Source evidence: `packages/core/src/execution-engine/workflow-execute.ts:438-600`
Trigger: A node finishes execution successfully.
Preconditions: Node output matches expected connections.
Steps:
1. `addNodeToBeExecuted` checks if the destination node has multiple inputs.
2. If multiple inputs, adds partial data to `waitingExecution`.
3. If all required inputs are present, node is pushed to `nodeExecutionStack`.
State changes: `waitingExecution` populated or cleared; `nodeExecutionStack` grows.
Side effects: None directly until the node runs.
Notes for Verity: The stack-draining pattern naturally handles DAG execution with join nodes.
