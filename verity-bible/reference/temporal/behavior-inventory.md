# Temporal — Behavior Inventory

Source: service/history/api/startworkflow/api.go, service/history/workflow/mutable_state_impl.go
Commit: ceb1cc1071b1fd37f8a2cd8ef5ed3e4333245cc2

---

### Workflow Start

Source evidence: `service/history/api/startworkflow/api.go:118`
Trigger: Client calls `StartWorkflowExecution`.
Preconditions: Namespace is active; WorkflowID reuse policy allows start.
Steps:
1. Validate request and versioning overrides.
2. Generate new RunID and `MutableState`.
3. Append `WorkflowExecutionStarted` event.
4. Schedule the first `WorkflowTask`.
State changes: Workflow transitions to Running state.
Side effects: Metrics recorded (`WorkflowEagerExecutionCounter`), task dispatched to TaskQueue.
Failure handling: If ID conflict, returns `StartDeduped` or error depending on policy.
Notes for Verity: Demonstrates how workflow initiation creates an event and immediately queues a worker task — the pattern Verity should follow for Work Order dispatch.

---

### Workflow State Reconstruction (Replay)

Source evidence: `service/history/workflow/mutable_state_impl.go` and `historybuilder.go`
Trigger: History service needs to load a workflow into memory (after crash or eviction).
Preconditions: Workflow events exist in the database.
Steps:
1. Initialize an empty `MutableState`.
2. Fetch `HistoryEvent` batches from the DB.
3. Apply each event sequentially through the state machine.
State changes: In-memory state goes from empty to accurately reflecting the exact state before eviction.
Failure handling: Fails if history is corrupted.
Notes for Verity: Verity can use this pattern to avoid storing complex relational state — fold events into a projection on demand.
