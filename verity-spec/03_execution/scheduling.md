# Verity Master Platform Specification

## 03_execution/scheduling.md

## Provenance
*   **Primary Sources**: `reference/calcom/concept-inventory.md` / `reference/calcom/behavior-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Primitive 3: RESOURCE - Scheduling, Primitive 4: LOCATION - SLA)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Booking Window & Timezone Calculations

Scheduling computations must remain timezone-agnostic in the database, resolving offsets dynamically in the user experience layer.

### EXE-SCH-001: UTC Storage with User-Local Translation
*   **Rule**: All appointment datetimes (`scheduled_start_at`, `scheduled_end_at`) and resource schedule ranges are persisted in the database as UTC.
*   **Logical Behavior**: The UI maps the UTC timestamps to the timezone offset configured on the viewer's user profile (e.g. converting 14:00 UTC to 09:00 EST for a dispatcher in New York, and to 15:00 BST for a technician in London).
*   **Status**: `[FACT]`
*   **Traceability**: Cal.com timezone translation algorithm.

---

## 2. Travel and Buffer Allocation

### EXE-SCH-002: Pre/Post Travel Buffer
*   **Rule**: A scheduled Appointment includes a computed `travel_buffer_minutes` padding. The scheduling engine calculates travel times between consecutive appointments using road distance calculations (via routing API) and reserves that buffer block on the Resource's calendar as un-bookable time.
*   **Status**: `[FACT]`

---

## 3. Concurrent Booking Locks (Soft-Reservations)

To prevent two dispatchers from assigning the same worker to different jobs at the same time, the scheduling pipeline enforces a transactional temporary lock.

### EXE-SCH-003: Selected Slot TTL
*   **Rule**: When a dispatcher selects an availability slot for booking, the system creates a record in `AssignmentReservation` with a Time-To-Live (TTL) timestamp set to 5 minutes:
    $$\text{release\_at} = \text{now()} + 5 \text{ minutes}$$
*   **Validation**: While the reservation is active, the slot is marked as blocked on the resource calendar. If the booking action is not completed before the TTL expires, the reservation record is deleted by the system database vacuum, releasing the slot.
*   **Status**: `[FACT]`
*   **Traceability**: Mapped from Cal.com `SelectedSlots` schema.
