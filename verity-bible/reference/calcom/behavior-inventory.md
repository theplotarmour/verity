# Cal.com — Behavior Inventory

Source: packages/lib/availability.ts, packages/lib/isOutOfBounds.tsx, packages/prisma/schema.prisma
Commit: 176037d0afbe572f870a3c702985e7cd83fe6c0c

---

### Availability → Working Hours Conversion

Source evidence: `packages/lib/availability.ts:61` (`getWorkingHours`)
Trigger: Computing available slots for a given date range.
Preconditions: User has Availability rows associated with their Schedule.
Steps:
1. Receive `availability[]` rows (days[], startTime UTC, endTime UTC) and a target timezone/utcOffset.
2. For each row: compute local startTime and endTime by subtracting utcOffset from stored UTC minutes.
3. Clamp to 0–1439 (minutes in a day).
4. If the time window overflows into the previous day: create an additional WorkingHours row for day-1.
5. If it overflows into the next day: create an additional row for day+1.
State changes: None (pure computation).
Notes for Verity: Timezone-aware availability is inherently multi-day — a 9am-5pm UTC+5:30 schedule means an availability window that can overflow day boundaries. Verity must handle this the same way.

---

### Period Limit Calculation (Booking Window)

Source evidence: `packages/lib/isOutOfBounds.tsx:26` (`calculatePeriodLimits`)
Trigger: Determining which dates are bookable for a given EventType.
Preconditions: EventType has a `periodType` set.
Steps:
1. ROLLING: Add `periodDays` to current date in **booker's timezone** (not event timezone). This ensures the earliest slot is reachable.
2. ROLLING_WINDOW: Dynamic — checks actual bookable days within the window, skipping non-available days.
3. RANGE: Fixed `periodStartDate` to `periodEndDate`.
4. UNLIMITED: No limit.
Notes for Verity: Booking window calculations are done in **booker's** timezone, not event timezone. Verity's "how far in advance can a work order be scheduled" rule should follow the same convention.

---

### Slot Reservation (SelectedSlots)

Source evidence: `packages/prisma/schema.prisma` — `model SelectedSlots`
Trigger: User selects a time slot during the booking flow before confirming.
Steps:
1. Insert a `SelectedSlots` row with `slotUtcStartDate`, `slotUtcEndDate`, `uid`, `releaseAt`.
2. Slot is now "soft reserved" — concurrent requests for the same slot see it as taken.
3. If booking is confirmed: slot reservation becomes a full `Booking` record.
4. If booking is abandoned: `releaseAt` TTL expires, slot is released for other bookers.
Notes for Verity: Optimistic slot reservation with TTL prevents double-booking without a pessimistic DB lock.

---

### Out-of-Office Delegation

Source evidence: `packages/prisma/schema.prisma` — `model OutOfOfficeEntry`
Trigger: A user creates an OOO entry covering a date range, optionally specifying `toUserId`.
Steps:
1. OOO entry blocks all availability for the user during the date range.
2. If `toUserId` is set: new booking attempts for the unavailable user are redirected to `toUser`.
3. Both users' schedules are checked to confirm `toUser` is actually available.
Notes for Verity: Field service leave management — when a worker is absent, work orders should auto-route to their designated substitute.
