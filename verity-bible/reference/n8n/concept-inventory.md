# n8n — Concept Inventory

Source: packages/workflow/src/interfaces.ts, packages/workflow/src/workflow.ts
Commit: fca317096e36494053a55ab3c4e16834819b540c

---

### Workflow

Source evidence: `packages/workflow/src/workflow.ts:58-90`
Definition: The central class representing an automation graph. Contains nodes, connections, and metadata.
Purpose: Serves as the blueprint for an execution.
Key fields/attributes: `nodes` (INodes), `connectionsBySourceNode` (IConnections), `connectionsByDestinationNode` (IConnections), `nodeTypes` (INodeTypes), `active` (boolean).
Relationships: Contains many `INode`, uses `INodeType` to validate, executed by `WorkflowExecute`.
Lifecycle states: active / inactive / archived

---

### Node (INode)

Source evidence: `packages/workflow/src/interfaces.ts:1608-1640`
Definition: A discrete step in a workflow graph.
Purpose: Represents an operation, trigger, or routing decision.
Key fields/attributes: `id` (string), `name` (string), `type` (string), `parameters` (INodeParameters), `credentials` (INodeCredentials), `disabled` (boolean).
Relationships: Connects to other Nodes via `IConnection`. Instances are defined by `INodeType`.

---

### Connection (IConnection)

Source evidence: `packages/workflow/src/interfaces.ts:93-102`
Definition: A directed edge between two nodes.
Purpose: Defines how data flows from the output of one node to the input of another.
Key fields/attributes: `node` (string — destination node name), `type` (NodeConnectionType e.g. "main"), `index` (number).

---

### Credential (ICredentials)

Source evidence: `packages/workflow/src/interfaces.ts:119-142`
Definition: An object storing authentication configurations and secrets.
Purpose: Allows nodes to securely authenticate with external services without storing secrets in the workflow definition.
Key fields/attributes: `id` (string), `name` (string), `type` (string), `data` (string — encrypted JSON).

---

### ExecutionData (INodeExecutionData)

Source evidence: `packages/workflow/src/interfaces.ts:1722-1768`
Definition: The standard data envelope passed between nodes.
Purpose: Ensures all nodes can process each other's outputs uniformly.
Key fields/attributes: `json` (IDataObject), `binary` (IBinaryKeyData), `error` (NodeApiError), `pairedItem`.

---

### Trigger (ITriggerFunctions)

Source evidence: `packages/workflow/src/interfaces.ts:1440-1476`
Definition: A specialized node execution context that listens for events and starts a workflow.
Purpose: Bridges external events to workflow execution.
Key fields/attributes: `emit()` method, `emitError()` method.
Notes for Verity: Trigger nodes are architecturally distinct from action nodes — they live in a persistent listen loop, not in the execution stack.
