# ActivityWatch — Verity Implications

Source: ActivityWatch Architecture & aw-core models (GitHub: ActivityWatch/aw-core)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Duration-based Technician Time Entries

Confidence: HIGH
Recommendation: ADOPT
Rationale: Traditional time-card engines use separate punch-in and punch-out events. If the technician loses service or deletes the app, the punch-in remains open forever. ActivityWatch's event model (start timestamp + duration) updated via periodic heartbeat/pulse pings prevents this.
If ADOPT: Verity's technician tracking table is `TechnicianStateEvent` (`timestamp`, `duration`, `state`, `payload`). While a technician is active, their mobile app sends a heartbeat every 60 seconds, extending the duration of the current event. If pings cease, the event naturally stops at the last ping, preventing infinite "ghost" labor logs.
Affects Bible sections: Volume III (Exception model), Volume III (Field operations)

---

### Segmented Operational Buckets

Confidence: HIGH
Recommendation: ADOPT
Rationale: A technician generates different categories of event data (GPS coordinates, app clicks, manual status changes). Storing these in a single unstructured log table creates a database bottleneck.
If ADOPT: Verity scopes worker tracking into distinct operational streams (`buckets`). GPS tracking goes to `gps_coordinates_stream` (short retention, partition-heavy), while billing-triggering status changes (like "Work Started") are written to `billing_log_stream` (immutable, infinite retention).
Affects Bible sections: Volume V (Data Architecture)
