# Temporal — Verity Implications

Source: service/history/api/startworkflow/api.go, service/history/workflow/mutable_state_impl.go, service/history/historybuilder/history_builder.go
Commit: ceb1cc1071b1fd37f8a2cd8ef5ed3e4333245cc2

---

### Event-Sourced Work Order Audit Trails

Confidence: HIGH
Recommendation: ADOPT
Rationale: Verity's SLA enforcement requires undeniable proof of state transitions. Temporal's `HistoryEvent` model (`history_builder.go:41`) makes every transition an immutable fact. Applying this to Work Orders means SLA breach calculations can always be reconstructed from the event log.
If ADOPT: Work Orders store an append-only `WorkOrderEvent` log. Queries project current state from events. SLA clock calculations read event timestamps directly.
Affects Bible sections: Volume III (SLA model), Volume V (Audit)

---

### Deterministic Workflow + Activity Boundary

Confidence: HIGH
Recommendation: ADOPT
Rationale: Temporal's separation of deterministic orchestration logic from side-effect Activities (`mutable_state_impl.go:130`) prevents duplicate sends and enables safe retry. Verity's automation engine has the same problem — an automation that sends a notification must not re-send it on replay.
If ADOPT: Verity automation execution separates the graph evaluation (deterministic, in-memory) from Action execution (side-effectful, via Activity-style task queue).
Affects Bible sections: Volume III (Automation), Volume VI (Automation capability)

---

### Queue-Based Dispatch Model

Confidence: HIGH
Recommendation: ADOPT
Rationale: Temporal's immediate event-write + async task queue dispatch (`startworkflow/api.go:118`) decouples state recording from execution and enables horizontal scaling.
If ADOPT: Verity Work Order assignments write an event immediately, then enqueue a dispatch task. Offline workers pull from the queue when reconnected.
Affects Bible sections: Volume V (Offline sync), Volume III (Dispatch model)

---

### MutableState Projection Pattern

Confidence: MEDIUM
Recommendation: INVESTIGATE
Rationale: Rebuilding current state from a full event replay (Temporal's `MutableState`) is powerful but expensive at scale. Investigate whether Verity needs full event-sourcing or a hybrid: snapshot current state in a row + append-only event log for audit.
If INVESTIGATE: Define the boundary — what must be reconstructible from events alone, and what can be cached in a current-state row?
Affects Bible sections: Volume II (Metamodel), Volume V (Data architecture)
