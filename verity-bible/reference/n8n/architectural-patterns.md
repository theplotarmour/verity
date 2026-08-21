# n8n — Architectural Patterns

Source: packages/workflow/src/interfaces.ts, packages/core/src/execution-engine/workflow-execute.ts
Commit: fca317096e36494053a55ab3c4e16834819b540c

---

### Node as Composable Unit

Source evidence: `packages/workflow/src/interfaces.ts:1608-1640`
Pattern: Every operation is a distinct `INode` with a defined `INodeType`.
Problem solved: Allows infinite extensibility without changing the execution engine.
Implementation sketch: Nodes define inputs/outputs and parameter schemas. The engine provides context and helper functions (`IExecuteFunctions`).
Trade-offs: Increases boilerplate for simple operations, but normalizes complex ones.
Applicability to Verity: HIGH

---

### Typed Data Channels (Item-Based Processing)

Source evidence: `packages/workflow/src/interfaces.ts:1722-1768`
Pattern: Data flows strictly as an array of `INodeExecutionData` items (`json`, `binary`).
Problem solved: Standardizes data access (expressions, mappers) across all integrations.
Implementation sketch: A node takes `INodeExecutionData[]` and returns `INodeExecutionData[][]` (one array per output).
Trade-offs: Can be memory-intensive for large datasets.
Applicability to Verity: HIGH

---

### Credential Injection

Source evidence: `packages/workflow/src/interfaces.ts:119-142`
Pattern: Credentials are typed configurations separated from the node instances.
Problem solved: Prevents secrets leaking in workflow exports and allows reusing accounts.
Implementation sketch: Nodes specify required credential types. Engine resolves and decrypts them at execution via `getCredentials()`.
Trade-offs: Requires a secure credential store with per-tenant encryption.
Applicability to Verity: HIGH

---

### Trigger vs. Action Node Distinction

Source evidence: `packages/workflow/src/interfaces.ts:1440-1476` (ITriggerFunctions)
Pattern: Trigger nodes live in a persistent listener loop; action nodes run synchronously within the execution stack.
Problem solved: External event ingestion without polling in the execution engine itself.
Applicability to Verity: HIGH — Verity's Event Bus should distinguish persistent event listeners from one-shot action handlers.
