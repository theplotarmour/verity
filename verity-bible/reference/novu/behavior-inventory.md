# Novu — Behavior Inventory

Source: Novu Documentation (docs.novu.co)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Workflow Trigger and Step Execution

Source: Novu Workflow Execution
Trigger: System fires a trigger request (e.g. `novu.trigger('work-order-assigned', { to: subscriberId, payload: { woNumber: '123' } })`).
Steps:
1. Lookup the target `Subscriber` record and retrieve their channel preferences.
2. Load the designated `Workflow` definition.
3. For each step:
   - Check if step is active for the channel based on subscriber preferences.
   - Interpolate payload variables into the template.
   - If step is a delay step, schedule a timer.
   - If step is a send step, pass the payload to the configured Integration Provider.
State changes: Workflow execution log entry created (status: sent | delayed | failed).
Failure handling: Failover to fallback providers or log failure.

---

### In-App Feed Sync (Inbox)

Source: Novu Inbox/Feed API
Trigger: Execution engine processes an in-app step.
Steps:
1. Write a notification record to the `Inbox` collection scoped to the subscriber ID.
2. Push a real-time event (via WebSockets) to the client's Inbox UI.
3. Mark notification status: `unread` | `read` | `archived` upon subscriber action.
Notes for Verity: Verity needs a lightweight in-app notification center for dispatchers and field workers.
