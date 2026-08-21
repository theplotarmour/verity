# Temporal — Architectural Patterns

Source: service/history/historybuilder/history_builder.go, service/history/workflow/mutable_state_impl.go
Commit: ceb1cc1071b1fd37f8a2cd8ef5ed3e4333245cc2

---

### Event-Sourced Workflow State

Source evidence: `service/history/historybuilder/history_builder.go:33` and `mutable_state_impl.go`
Pattern: Workflow state is not stored as a mutable row, but as an append-only log of events.
Problem solved: Ensures absolute consistency, perfect audit trails, and the ability to resume workflows across different worker nodes.
Implementation sketch: `HistoryBuilder` batches events and persists them. `MutableStateImpl` reconstructs state by replaying them.
Trade-offs: Requires a separate read-model for complex queries (Temporal's Visibility service); high storage usage for long-lived processes.
Applicability to Verity: HIGH — SLA enforcement and Work Order audit trails benefit enormously from this.

---

### Activity as Side-Effect Boundary

Source evidence: `service/history/workflow/mutable_state_impl.go:130` (`pendingActivityInfoIDs`)
Pattern: Workflow logic must be purely deterministic. Any external interaction (API call, DB write) is offloaded to an "Activity."
Problem solved: Allows workflows to be safely replayed without re-triggering side effects (charging a card twice, sending duplicate emails).
Implementation sketch: Workflow writes an `ActivityTaskScheduled` event. Worker picks it up, executes, returns `ActivityTaskCompleted`.
Trade-offs: Adds latency to external calls due to queueing and event persistence overhead.
Applicability to Verity: HIGH — notification sends, webhook calls, and invoice generation should be Activities.

---

### Queue-Based Async Dispatch

Source evidence: `service/history/api/startworkflow/api.go:118`
Pattern: Workflow initiation records events first, then dispatches to TaskQueues for asynchronous worker pickup.
Problem solved: Decouples orchestration from execution, allowing horizontal scaling.
Trade-offs: Eventual consistency between event recording and task execution.
Applicability to Verity: HIGH — Verity should separate its Work Order state machine from the workers that execute tasks.
