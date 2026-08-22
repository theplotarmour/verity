# Verity Master Platform Specification

## 03_execution/sla.md

## Provenance
*   **Primary Sources**: `reference/temporal/concept-inventory.md` / `reference/calcom/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_3_execution_workflows.md](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md) (Section 1: SLA Clock State Specification)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. SLA Clock State Machine

SLA policies manage operational deadline timers. Every SLA target has a dedicated timer state machine:

```text
  Timer Initialized
         │
         ▼
    Start Timer ───┬──────────────────────┬───► Stop Timer (Completed)
  (Scheduled/Start) │                      │
                   ▼                      ▼
              Pause Timer            Breach Timer (Overdue)
            (Blocked State)
```

### EXE-SLA-001: Start Timer
*   **Trigger**: Transition to `Scheduled` or `In-Progress` state. The clock begins counting down toward `deadline_at`.
*   **Status**: `[FACT]`

### EXE-SLA-002: Pause Timer
*   **Trigger**: The Work Order enters a `Hold` state due to external dependencies (e.g. awaiting parts, site inaccessible). The countdown is suspended.
*   **Status**: `[FACT]`

### EXE-SLA-003: Stop Timer
*   **Trigger**: Transition to a terminal state (`Completed`, `Closed`, or `Cancelled`). The final elapsed time is frozen and written to the database for reporting.
*   **Status**: `[FACT]`

### EXE-SLA-004: Breach Timer
*   **Trigger**: System clock exceeds `deadline_at` while the timer is in the running state.
*   **Action**: The system sets the `sla_status` to `BREACHED` and triggers an escalation action.
*   **Status**: `[FACT]`

---

## 2. Policy Precedence Rules

### EXE-SLA-005: Contract Overrides Default
*   **Rule**: If a customer has a signed `Contract` specifying custom SLA limits, the contract SLA rules take precedence over the default Tenant-wide SLA policy.
*   **Status**: `[FACT]`

### EXE-SLA-006: Manual Override Wins
*   **Rule**: If a dispatcher manually sets a `deadline_at` timestamp on a specific Work Order, this explicit value overrides all automated SLA rules.
*   **Status**: `[FACT]`

---

## 3. SLA Escalation Engine

### EXE-SLA-007: Escalation Triggers
*   **Rule**: When an SLA timer breaches, the system runs the registered escalation policy (e.g. notify manager via SMS, reassign to senior resource, trigger webhook).
*   **Status**: `[FACT]`
