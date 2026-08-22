# ActivityWatch — Concept Inventory

Source: ActivityWatch Architecture & aw-core models (GitHub: ActivityWatch/aw-core)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Event

Source evidence: `aw_core/models.py`
Definition: An immutable record of an activity or state spanning a specific duration.
Key attributes:
- `timestamp` (DateTime) — start time of the event
- `duration` (Duration/float) — how long the event lasted (seconds)
- `data` (JSON/Dictionary) — arbitrary payload (e.g. app name, window title, category)
Notes for Verity: Decouples the moment of initiation (`timestamp`) from the length of execution (`duration`). A technician's "driving" status is an Event with a start time and duration.

---

### Bucket

Source evidence: aw-core bucket definition
Definition: A unique, named stream containing chronologically ordered Events from a specific source (e.g. window watcher, hook, mobile app).
Key attributes:
- `id` (String) — unique bucket name
- `client` (String) — source application
- `type` (String) — schema category of contained events
- `events` (List of Events)
Notes for Verity: Useful organizational wrapper. A technician's phone GPS coordinates log is a Bucket; their manual status changes is another Bucket.

---

### Query (Aggregation/Filter)

Source: aw-core query processor
Definition: Set of operations (filtering, merging, flooding, categorizing) executed against buckets to generate clean activity timelines.
Notes for Verity: Essential for cleaning up overlapping or fragmented event logs.
