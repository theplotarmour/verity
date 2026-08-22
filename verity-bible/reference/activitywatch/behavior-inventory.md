# ActivityWatch — Behavior Inventory

Source: ActivityWatch Architecture & aw-core models (GitHub: ActivityWatch/aw-core)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Event Heartbeat (Pulse) Sending & Merging

Source: Client Heartbeat API
Trigger: Client logs a continuous state (e.g. user is active, worker is at location).
Steps:
1. Client sends periodic "heartbeat" events with a short duration and an `idempotency_key` or index.
2. Server checks the last event in the bucket.
3. If the incoming event's data matches the last event's data, and the gap between them is below a threshold (`pulse_interval`), the server merges them.
4. Merging updates the last event's `duration` field (extends it) rather than inserting a new row.
State changes: Extends existing Event's `duration` or inserts new Event.
Notes for Verity: Critical for location and status tracking — instead of writing 10,000 GPS coordinate rows, the system updates a single "On-Site" event's duration as long as the worker remains in the geofence.

---

### Event Query and Flooding (Timeline Summarization)

Source: aw-server query compiler
Trigger: Aggregating raw event streams for reports.
Steps:
1. Filter events by timestamp range.
2. Apply "flooding" or category rules to fill empty gaps or remove short spikes (e.g., ignore a 2-second navigation app switch during driving).
3. Group and sum durations of events by metadata keys.
Notes for Verity: Essential for computing actual "wrench time" or "travel time" from raw technician check-ins.
