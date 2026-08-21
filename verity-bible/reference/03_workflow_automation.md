# VERITY REFERENCE CORPUS — VOLUME 3
## Workflow & Automation: Temporal & n8n

This volume documents our architectural findings and concept extractions from Temporal and n8n, establishing Verity’s durable execution engine and automation trigger rules.

---

## 1. Temporal
*   **Domain Focus:** Durable workflow execution.
*   **Target Extract:** Long-running state retention, retries, replay-determinism, and failure recovery.

### A. Concept Comparison & Mappings:
*   *Temporal Workflow:* Maps to Verity’s long-running operational workflows (e.g., multi-day onboarding, contract review, invoice reminders). A workflow represents a stateful sequence of tasks.
*   *Temporal Activity:* Maps to Verity’s stateless actions that perform side-effects (e.g., calling external APIs, writing audit records, sending notifications).

### B. Invariants Discovered:
*   **Replay Determinism:** Workflows must be deterministic. If a system crashes, the workflow state is recovered by replaying the history of recorded events. Side-effects (like charge runs or email sends) must happen inside Activities to prevent duplicate runs.
*   **Timeout & Retry Policies:** Every durable action must define explicit retry policies (max attempts, exponential backoff) and timeout thresholds (heartbeat, execution).

### C. Edge Cases & Operational Reality:
*   *System Restarts:* If the server hosting the execution engine restarts mid-workflow (e.g. while an employee is on a 2-week shift schedule), the workflow must resume exactly where it was interrupted. Verity implements state persistence for in-flight workflows, preventing lost states.

---

## 2. n8n
*   **Domain Focus:** Visual automation and integrations.
*   **Target Extract:** Event-driven node triggers, node inputs/outputs, and external integrations.

### A. Concept Comparison & Mappings:
*   *n8n Trigger Node:* Maps to Verity’s **`Event`** bus triggers (e.g., `work_order.job.completed`).
*   *n8n Action Node:* Maps to Verity’s **`Action`** execution model.
*   *n8n Credentials:* Maps to Verity’s encrypted API connection tokens.

### B. Invariants Discovered:
*   Standardized Node Payloads: Outputs from node $A$ must map cleanly into inputs for node $B$ through a common JSON payload contract.

### C. Edge Cases & Operational Reality:
*   *Failing Automation Nodes:* If an automated connector (e.g., pushing an order to QuickBooks) fails, it must not block the core operational workflow. The exception is logged, the node is flagged as failed, and the scheduler is alerted for manual review.
