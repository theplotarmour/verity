# ActivityWatch — Architectural Patterns

Source: ActivityWatch Architecture & aw-core models (GitHub: ActivityWatch/aw-core)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Duration-based Event Streams (No Start/Stop Rows)

Source: `aw_core/models.py`
Pattern: Representing states (e.g. driving, working) as single entries with a `timestamp` and a mutable/computed `duration` field, rather than separate `status_changed_to_driving` and `status_changed_to_stopped` log rows.
Problem solved: Prevents orphaned "started" states if the server restarts or connection drops before a "stop" event is received.
Applicability to Verity: HIGH — A technician checking into a job should create a `TimeEntry` with a start time and a running duration/pulse. If the app crashes, the duration represents the last confirmed heartbeat, preventing infinite open jobs.

---

### Heartbeat Aggregation (Pulse)

Source: Heartbeat API
Pattern: Appending duration to a running event if data matches, rather than writing a new row for every ping.
Problem solved: Reduces database write volume by 99% while maintaining high resolution temporal logs.
Applicability to Verity: HIGH — GPS location tracking on the technician app must use heartbeat pulses rather than inserting rows continuously.
