# n8n — Verity Implications

Source: packages/workflow/src/interfaces.ts, packages/core/src/execution-engine/workflow-execute.ts
Commit: fca317096e36494053a55ab3c4e16834819b540c

---

### Node-Graph Composition Model

Confidence: HIGH
Recommendation: ADOPT
Rationale: n8n's stack-based graph execution (`workflow-execute.ts:438-600`) handles parallel branches, conditional routing, and join nodes naturally. A flat event→rule chain cannot support "when work is completed AND payment confirmed, THEN do X."
If ADOPT: Verity's automation engine should model automation flows as directed acyclic graphs of nodes, with a stack-draining executor.
Affects Bible sections: Volume III (Execution/Workflows), Volume VI (Automation capability)

---

### Standardized Item Envelope (INodeExecutionData)

Confidence: HIGH
Recommendation: ADOPT
Rationale: A typed data envelope (`json` + `binary` + `error` + `pairedItem`) at `interfaces.ts:1722` prevents type mismatches between nodes and enables a unified expression language.
If ADOPT: Define a canonical `AutomationPayload` type for all inter-node data passing in Verity automations.
Affects Bible sections: Volume VI (Automation capability)

---

### Credential Registry

Confidence: HIGH
Recommendation: ADOPT
Rationale: Hardcoding auth parameters in triggers/actions fails at enterprise scale. The `ICredentials` pattern at `interfaces.ts:119` enables secure reuse and per-tenant encryption.
If ADOPT: Verity implements an encrypted `IntegrationCredential` entity, referenced by name in automation node definitions.
Affects Bible sections: Volume V (Security), Volume VI (Integrations)

---

### Error Workflow Routing

Confidence: HIGH
Recommendation: INVESTIGATE
Rationale: n8n's global error workflow (a separate workflow triggered on failure) is powerful but adds cognitive overhead. Investigate whether inline error branches (catch nodes) are sufficient for Verity v1.
If INVESTIGATE: Decide whether automation failures route to a dedicated error handler workflow or emit an `automation.node.failed` event consumed by the exceptions engine.
Affects Bible sections: Volume III (Exception model)

---

### Trigger Node as Persistent Listener

Confidence: HIGH
Recommendation: ADOPT
Rationale: n8n's `ITriggerFunctions` with `emit()` method (`interfaces.ts:1440`) cleanly separates event ingestion from execution. Verity's Event Bus listeners should follow the same pattern — register once, emit into the execution stack on arrival.
Affects Bible sections: Volume III (Event Bus)
