# Temporal — Concept Inventory

Source: service/history/workflow/mutable_state_impl.go, service/history/historybuilder/history_builder.go, service/history/api/startworkflow/api.go
Commit: ceb1cc1071b1fd37f8a2cd8ef5ed3e4333245cc2

---

### WorkflowExecution

Source evidence: `service/history/api/startworkflow/api.go:50` and `service/history/workflow/mutable_state_impl.go`
Definition: Represents a single execution of a workflow, uniquely identified by a WorkflowID and RunID.
Purpose: Tracks a durable, long-running process.
Key fields/attributes: `workflowID` (string), `runID` (string), `executionState` (WorkflowExecutionState).
Relationships: Contains a `MutableState` consisting of `HistoryEvent`s.
Lifecycle states: Created, Running, Completed, Failed, Canceled, TimedOut, Terminated.
Notes for Verity: Essential model for long-running Work Orders.

---

### MutableState

Source evidence: `service/history/workflow/mutable_state_impl.go:128`
Definition: The in-memory representation of a workflow's current state within the History Service.
Purpose: Holds all pending activities, timers, child workflows, and signals, serving as the operational state machine reconstructed from history.
Key fields/attributes: `pendingActivityInfoIDs`, `pendingTimerInfoIDs`, `pendingChildExecutionInfoIDs`, `pendingSignalInfoIDs`, `executionInfo`.
Relationships: Rebuilt from `HistoryEvent`s via `HistoryBuilder`.
Lifecycle states: Mutable, Immutable, Sealed.
Notes for Verity: Verity can use a similar struct to project state from an event log.

---

### HistoryEvent

Source evidence: `service/history/historybuilder/history_builder.go:41` (imports `go.temporal.io/api/history/v1`)
Definition: An immutable fact representing a state change in the workflow execution.
Purpose: The source of truth for workflow state; used for event sourcing and replay.
Key fields/attributes: EventID, EventType, Timestamp, Version.
Relationships: Stored in `EventStore` and batched into `DBEventsBatches`.
Lifecycle states: Buffered, Flushed, Persisted.
Notes for Verity: Critical for building an undeniable audit trail for SLAs.

---

### Activity

Source evidence: `service/history/workflow/mutable_state_impl.go:130`
Definition: A non-deterministic side-effect task executed outside the workflow logic.
Purpose: Acts as the boundary between deterministic workflow logic and external I/O.
Key fields/attributes: `ActivityInfo` (`persistencespb.ActivityInfo`).
Relationships: Scheduled by workflow, tracked in MutableState until completion.
Notes for Verity: Verity's HTTP calls or manual approvals should be modeled as Activities.
