# Cal.com — Concept Inventory

Source: packages/prisma/schema.prisma (commit 176037d0afbe572f870a3c702985e7cd83fe6c0c)
All definitions below are schema-derived unless noted.

---

### EventType

Source evidence: `packages/prisma/schema.prisma` — `model EventType`
Definition: The schedulable product definition. NOT a booking — it is the template for what can be booked.
Purpose: Defines what kind of appointment is available, its duration, hosts, locations, and booking rules.
Key fields/attributes:
- `id`, `title`, `slug` — identity
- `length` (Int) — duration in minutes
- `locations` (Json) — where the meeting takes place
- `schedulingType` (SchedulingType) — ROUND_ROBIN | COLLECTIVE | MANAGED
- `minimumBookingNotice` (Int) — advance notice required (minutes)
- `beforeEventBuffer`, `afterEventBuffer` (Int) — padding around events
- `periodType` (PeriodType) — ROLLING | ROLLING_WINDOW | RANGE | UNLIMITED
- `periodDays`, `periodStartDate`, `periodEndDate` — booking window constraints
- `requiresConfirmation` (Boolean) — manual approval required
- `seatsPerTimeSlot` (Int?) — multi-seat events (e.g., group classes)
- `recurringEvent` (Json?) — recurring booking pattern
- `scheduleId` (Int?) — linked to a Schedule for availability
Relationships: Has many `Host`, belongs to `User` or `Team`, has many `Availability`, has a `Schedule`.
Lifecycle states: Active / Disabled.
Notes for Verity: EventType is the "service product" concept — analogous to Verity's service catalog entry. Heavily configurable.

---

### Schedule

Source evidence: `packages/prisma/schema.prisma` — `model Schedule`
Definition: A reusable named weekly availability template.
Purpose: Defines a person's recurring available hours across days of the week. Separate from specific bookings.
Key fields/attributes: `id`, `userId`, `name`, `timeZone` (String?).
Relationships: Has many `Availability` rows. Referenced by `EventType` and `Host`.
Notes for Verity: A Schedule is the reusable shift template. A worker's regular schedule (Mon–Fri 8am–5pm) is a Schedule, not hardcoded availability.

---

### Availability

Source evidence: `packages/prisma/schema.prisma` — `model Availability` and `packages/lib/availability.ts:24`
Definition: A single time window within a Schedule, or a specific date override.
Purpose: Defines exactly when a user is available — either recurring weekly (by day-of-week) or on a specific date.
Key fields/attributes:
- `days` (Int[]) — 0=Sunday through 6=Saturday (empty = specific date override)
- `startTime` (DateTime @db.Time) — UTC time
- `endTime` (DateTime @db.Time) — UTC time
- `date` (DateTime? @db.Date) — if set, this is a date-specific override
- `scheduleId`, `userId`, `eventTypeId` — scope
Notes for Verity: Availability rows stored in UTC. The `getWorkingHours()` function (`availability.ts:61`) converts to local timezone by subtracting utcOffset from stored UTC times, handling day-of-week overflow correctly.

---

### Booking

Source evidence: `packages/prisma/schema.prisma` — `model Booking`
Definition: A confirmed or pending reservation of a specific time slot.
Purpose: Records that a specific Attendee has reserved a specific slot on a specific EventType.
Key fields/attributes:
- `uid` (String @unique) — public-facing booking identifier
- `idempotencyKey` (String? @unique) — deduplication key
- `status` (BookingStatus) — ACCEPTED | PENDING | CANCELLED | REJECTED | AWAITING_HOST
- `startTime`, `endTime` (DateTime) — the actual booked times
- `userId` — who the booking is with
- `eventTypeId` — which EventType was booked
- `recurringEventId` (String?) — links recurring booking occurrences
- `fromReschedule` (String?) — UID of the original booking if rescheduled
Relationships: Has many `Attendee`, has many `BookingReference`, belongs to `EventType`, may have `Payment`.
Lifecycle states: PENDING → ACCEPTED | REJECTED; ACCEPTED → CANCELLED.
Notes for Verity: The `idempotencyKey` (constructed from slot + email) prevents double-booking on concurrent requests.

---

### Host

Source evidence: `packages/prisma/schema.prisma` — `model Host`
Definition: A User's assignment to an EventType with scheduling rules.
Purpose: Defines which users host a given EventType, with priority/weight for round-robin assignment.
Key fields/attributes:
- `userId`, `eventTypeId` — composite PK
- `isFixed` (Boolean) — if true, always assigned; if false, participates in round-robin
- `priority` (Int?) — determines order in priority-based assignment
- `weight` (Int?) — controls likelihood in weighted round-robin
- `scheduleId` (Int?) — override schedule for this host on this EventType
Notes for Verity: The `isFixed` / round-robin / weighted model is the core resource assignment logic for multi-host events.

---

### SelectedSlots

Source evidence: `packages/prisma/schema.prisma` — `model SelectedSlots`
Definition: A temporarily reserved slot before booking is confirmed.
Purpose: Prevents concurrent double-bookings during the checkout/confirmation flow.
Key fields/attributes: `eventTypeId`, `userId`, `slotUtcStartDate`, `slotUtcEndDate`, `uid`, `releaseAt` (DateTime).
Notes for Verity: Optimistic slot reservation with TTL. The `releaseAt` enables automatic slot release if booking is abandoned. Verity's work order scheduling should adopt this pattern for concurrent assignment.

---

### OutOfOfficeEntry

Source evidence: `packages/prisma/schema.prisma` — `model OutOfOfficeEntry`
Definition: A date range during which a user is unavailable, with optional delegation to another user.
Purpose: Blocks availability for planned absences; can redirect bookings to a substitute.
Key fields/attributes: `start`, `end` (DateTime), `toUserId` (Int?) — delegate, `reasonId`.
Notes for Verity: The delegation pattern (booking redirects to `toUser` during OOO) is critical for field service — when a worker is sick, their assignments should route to a substitute.

---

### BookingSeat

Source evidence: `packages/prisma/schema.prisma` — `model BookingSeat`
Definition: One attendee's seat in a multi-seat booking.
Purpose: Supports group events where multiple attendees book the same slot independently.
Key fields/attributes: `bookingId`, `attendeeId`, `referenceUid` (String @unique).
Notes for Verity: The seat model is relevant for Verity's team work orders — multiple workers on one job with independent check-in records.
