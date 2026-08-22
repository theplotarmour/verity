# Verity Master Platform Specification

## expenses/09-permissions.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/expenses.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Role-based scopes evaluation.

This document details the `expenses` capability specs for the `09 Permissions` contract.

### REQ-EXPENSES-09PERMISSIONS-001
*   **Requirement**: The capability manages `ExpenseReport, ExpenseLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/hr_expense/models/hr_expense.py`

### REQ-EXPENSES-09PERMISSIONS-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, SUBMITTED, APPROVED, POSTED, DONE, REFUSED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-EXPENSES-09PERMISSIONS-003
*   **Requirement**: Mutations are restricted to actions: `create_expense, submit_expense, approve_expense, refuse_expense`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-EXPENSES-09PERMISSIONS-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
