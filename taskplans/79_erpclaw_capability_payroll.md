# Task 79 — `verity.capability.payroll` (future candidate)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §3.8 (ERPClaw source).
INV-001.

## Status: PENDING — not in current scope, lowest current priority

Extraction priority per source doc: **Low-medium, until a concrete client
requires it.** Payroll is jurisdiction-heavy; ERPClaw's US-shaped
requirements (FICA/FUTA/SUTA, W-2) do not transfer directly to an Indian
client system.

**Trigger to start:** a concrete Indian client needs payroll. Requirements
must be rewritten around Indian statutory rules (PF, ESI, TDS on salary,
Form 16) before any implementation — this file is a placeholder for the
ERPClaw shape, not a spec to implement as-is.

## Purpose

Payroll calculation and statutory outputs.

## Scope (ERPClaw shape — needs India rewrite before use)

- Salary components, salary structures, salary assignments.
- Tax slabs and employee state config.
- Overtime policies, retro pay.
- Payroll runs, salary slips.
- Bank-payment file generation.
- Garnishments, amendment history.

## Critical requirements (carried over, jurisdiction-neutral parts only)

- Payroll runs are stateful and reversible by cancellation.
- Retro pay calculation is idempotent.
- Bank-file generation is high-impact and confirmation-gated (matches Task
  81 §Confirmation classes).
- Sensitive employee tax/bank data is encrypted/redacted.

## Non-goals

- FICA/FUTA/SUTA/W-2 language does not apply to an Indian deployment —
  strike before use, do not translate literally.
- Not built until Task 78 (HR) has employee records to run payroll against.
