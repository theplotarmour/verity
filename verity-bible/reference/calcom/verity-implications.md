# Cal.com — Verity Implications

Source: packages/prisma/schema.prisma, packages/lib/availability.ts, packages/lib/isOutOfBounds.tsx
Commit: 176037d0afbe572f870a3c702985e7cd83fe6c0c

---

### EventType as Service Catalog Entry

Confidence: HIGH
Recommendation: ADOPT
Rationale: Cal.com's EventType (schema.prisma) is the most complete open-source model of a "schedulable service product." Verity's Service Catalog needs the same separation: service definition (EventType) is independent of who provides it (Host) and when it happens (Booking).
If ADOPT: Verity's Service type maps to EventType. It carries duration, location types, required resources, SLA tier, and scheduling rules. The resource (worker/asset) is assigned separately at booking/dispatch time.
Affects Bible sections: Volume II (Work primitive — Service product concept)

---

### Schedule as Shift Pattern

Confidence: HIGH
Recommendation: ADOPT
Rationale: Cal.com's Schedule (schema.prisma: `model Schedule`) is exactly what Verity needs for worker shift management — a named weekly template with per-day time windows, separate from specific assignments.
If ADOPT: Verity Resource entity has a `shiftScheduleId` FK. The Schedule defines their regular hours. Specific date overrides (OutOfOfficeEntry equivalents) override the base pattern for holidays and absences.
Affects Bible sections: Volume II (Resource primitive), Volume III (Scheduling)

---

### Optimistic Slot Reservation (SelectedSlots Pattern)

Confidence: HIGH
Recommendation: ADOPT
Rationale: Concurrent dispatcher access to the same resource pool will cause double-booking without soft reservation. Cal.com's `SelectedSlots` model (schema.prisma) with `releaseAt` TTL solves this without pessimistic locking.
If ADOPT: Verity implements `AssignmentReservation` — a TTL-locked assignment claim that either converts to a confirmed Work Order assignment or auto-releases after N minutes.
Affects Bible sections: Volume III (Dispatch, Conflict detection)

---

### Host Priority/Weight → Resource Assignment Model

Confidence: HIGH
Recommendation: ADOPT
Rationale: Cal.com's `Host.isFixed`, `Host.priority`, `Host.weight` (schema.prisma) cleanly model three assignment modes: mandatory, priority-ordered, and weighted round-robin.
If ADOPT: Verity's Resource assignment model inherits these three modes. Fixed resources are always assigned. Round-robin candidates compete by weight.
Affects Bible sections: Volume III (Resource assignment), Volume VI (Scheduling capability)

---

### OOO Delegation → Absence + Substitute

Confidence: HIGH
Recommendation: ADOPT
Rationale: `OutOfOfficeEntry.toUserId` (schema.prisma) enables automatic routing to a substitute when the primary worker is absent. This is a critical field service capability.
If ADOPT: Verity's absence management includes a `substituteResourceId` on leave records. When a resource is on leave, unassigned Work Orders in their territory auto-route to the substitute.
Affects Bible sections: Volume III (Resource management), Volume VI (Scheduling capability)

---

### Geospatial / SLA / Field Dispatch — NOT COVERED

Confidence: HIGH
Recommendation: RESEARCH REQUIRED
Rationale: Cal.com explicitly does not model: GPS-based check-in, service territory geofencing, travel time between jobs, SLA breach detection, dispatcher-driven assignment, or job progress tracking. These are confirmed gaps that require dedicated research.
Affects Bible sections: Volume III (Field operations), Open domain: GIS/geospatial
