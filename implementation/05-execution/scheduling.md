# Scheduling and Shifts (scheduling.md)

## Purpose
This document defines how schedule availability, templates, and shifts are managed for a `Resource` within Verity.

## Scope
**In Scope:**
- Weekly availability templates (UTC)
- Shift generation from templates
- Out of Office (OOO) and delegation
- SIM card recycling quarantine

**Out of Scope:**
- Dispatch board UI (see `dispatch.md`)

## Authority
- **Bible V2 (Meta-Model):** `Resource` templates, `OutOfOfficeEntry` with delegated substitute (`toResourceId`).
- **Bible V5:** 30-day quarantine on suspended worker numbers.
- **Bible Synthesis ADOPTED:** Cal.com UTC weekly availability templates resolved to local offsets at runtime.
- **Spec GOV-TER-007:** `Resource` definition.

## Prerequisites
- `Resource` primitive must exist.
- Timezone support established for tenants/users.

## Specification Requirements
- **WHAT MUST EXIST:** `Resource` as a capacity-constrained schedulable unit (GOV-TER-007).
- **WHAT MUST EXIST:** `Appointment` as a time-locked booking slot (GOV-TER-005).

## Approved Architecture
- **Templates (Authority: Bible Synthesis ADOPTED):** Reusable named weekly availability templates stored in UTC, patterned after Cal.com.
- **Data Model (Authority: Bible V1):** PostgreSQL / Prisma.

## Implementation Contract
Claude Code shall implement the scheduling structures as follows:
1. Define Prisma model `AvailabilityTemplate` storing weekly recurring UTC intervals.
2. Define domain logic to project templates into specific local dates at runtime (Shift generation).
3. Define Prisma model `OutOfOfficeEntry` containing `from`, `to`, and an optional `toResourceId` for delegation.
4. Slot Math: Available slots = (Projected Shifts) - (Active Assignments) - (OOO Entries).
5. Implement the SIM card recycling rule: Upon worker suspension, record the termination date. Hardcode a 30-day quarantine guard before that phone number can be assigned to a new user.

## Constraints & Invariants
- Availability MUST be stored in UTC to prevent daylight saving time anomalies.
- Slot math MUST resolve to local timezone only at runtime/presentation.

## Dependencies
- **Depends on:** Resource, Assignment.
- **Depended on by:** Dispatch.

## Failure Modes
- **Timezone shifts:** Handled by strictly storing templates in UTC and resolving dynamically.

## Testing Requirements
- Unit tests for Cal.com-style UTC to local time projection (including DST boundaries).
- Unit test for OOO subtraction from availability.
- Unit test for 30-day phone number quarantine logic.

## Conformance Checks
- Verify no direct database storage of localized recurring time without UTC base.

## Traceability
- GOV-TER-007, GOV-TER-005
- Bible Synthesis ADOPTED, Bible V2, Bible V5

## Open Decisions
- **DEC-BIBLE-002**: Resource Representation Scope (reconciling whether crews, teams, and spaces are stand-alone resources or composite groups of physical resources).
