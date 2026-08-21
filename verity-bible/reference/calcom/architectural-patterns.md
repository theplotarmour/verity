# Cal.com — Architectural Patterns

Source: packages/prisma/schema.prisma, packages/lib/availability.ts, packages/lib/isOutOfBounds.tsx
Commit: 176037d0afbe572f870a3c702985e7cd83fe6c0c

---

### EventType as Schedulable Product

Source evidence: `schema.prisma` — `model EventType`
Pattern: The schedulable unit is a product template (EventType), not a user or a booking.
Problem solved: Separates "what can be booked" from "who is being booked" from "an actual reservation."
Implementation sketch: EventType has duration, locations, hosts, schedules, and booking rules. Booking links to EventType + Attendee + time.
Trade-offs: Requires a three-layer data model (EventType → Host → Booking) instead of a flat calendar.
Applicability to Verity: HIGH — Verity's service catalog entry maps cleanly to EventType.

---

### Schedule as Reusable Weekly Template

Source evidence: `schema.prisma` — `model Schedule` → `Availability[]`
Pattern: Availability is defined as a reusable named template (Schedule), not per-event.
Problem solved: A worker defines their weekly hours once (the Schedule) and it applies to all assigned EventTypes.
Implementation sketch: Schedule has many Availability rows (days[] + startTime + endTime). EventType references a Schedule.
Trade-offs: Changes to a Schedule retroactively affect all EventTypes using it.
Applicability to Verity: HIGH — Verity workers define their shift pattern as a Schedule. Work orders inherit availability from that pattern.

---

### UTC Storage + Local Conversion

Source evidence: `packages/lib/availability.ts:61` (`getWorkingHours`)
Pattern: All availability times stored in UTC. Converted to user-local timezone only for display and calculation.
Problem solved: Timezone-correct availability across multi-timezone deployments.
Implementation sketch: `getWorkingHours()` subtracts `utcOffset` from stored UTC minutes, handles day-of-week overflow (prev/next day).
Applicability to Verity: HIGH — Mandatory for a multi-location field service platform.

---

### Optimistic Slot Reservation with TTL

Source evidence: `schema.prisma` — `model SelectedSlots` (`releaseAt` field)
Pattern: A slot is soft-reserved before booking confirmation, with an automatic TTL expiry.
Problem solved: Prevents concurrent double-bookings without pessimistic locking.
Implementation sketch: `SelectedSlots` row inserted on slot selection; deleted or replaced on booking confirmation; auto-released if abandoned.
Applicability to Verity: HIGH — Verity's work order assignment system needs the same pattern for concurrent dispatcher access.

---

### Host Priority / Weight for Assignment

Source evidence: `schema.prisma` — `model Host` (`isFixed`, `priority`, `weight` fields)
Pattern: Each host on an EventType has a priority and weight for round-robin assignment.
Problem solved: Distributes bookings fairly across a pool of available hosts.
Implementation sketch: `isFixed=true` hosts always attend. Round-robin candidates are ordered by priority, then weighted for load balancing.
Applicability to Verity: HIGH — Verity's dispatcher needs the same weighted assignment model for work order allocation.

---

### Gaps Cal.com Does NOT Cover

Source evidence: Schema-level analysis + isOutOfBounds.tsx
- **Geofencing / check-in**: No GPS location or polygon-based constraint. Cal.com's `HostLocation` is a meeting location (Zoom URL, address) — not a physical geofence.
- **SLA enforcement**: No concept of service level agreements, breach detection, or escalation.
- **Field resource assignment**: Cal.com models user self-booking; it does not model a dispatcher assigning a worker to a job.
- **Travel time between jobs**: No consecutive booking travel buffer.
- **Work order lifecycle**: No concept of job progress, evidence collection, or completion approval.
Applicability to Verity: These gaps confirm that Verity needs geospatial and field-dispatch capabilities beyond what Cal.com provides.
