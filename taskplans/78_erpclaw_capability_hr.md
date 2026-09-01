# Task 78 — `verity.capability.hr` (future candidate)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.7 (ERPClaw source).
INV-001, Authorization shape §Restricted fields / `redactFields()`.

## Status: PENDING — not in current scope

No current client needs people-ops beyond `Resource`/`Party` (ADR-008).
Step-14 territory.

**Trigger to start:** a client needs employee lifecycle, leave, attendance,
or expense tracking beyond scheduling a `Resource`.

## Purpose

People operations before payroll.

## Scope

- Employees, departments, designations, employee lifecycle events, documents.
- Leave types and allocations, leave applications.
- Attendance, holiday lists, shift types and assignments, regularization.
- Expense claims.

## Critical requirements (carried over)

- Sensitive employee data is redacted via the existing Layer-3 field
  redaction (`FieldPermission`, `redactFields()`), never a bolt-on second
  access-control model.
- Leave and expense approvals preserve history — no in-place status edits.
- Attendance corrections are traceable (Event/Audit runtime).
- Documents have expiry checks.

## Verity fit (if built)

- Useful across many client systems, but not needed by every small tenant —
  a strong candidate for the "optional capability activation" model (open
  decision, not yet designed).

## Non-goals

- Not payroll — see Task 79.
- Not a replacement for `Resource`/`ResourceGroup` (ADR-008) — HR sits above
  scheduling, doesn't redefine it.
