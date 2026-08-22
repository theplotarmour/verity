# Verity Master Platform Specification

## expenses/18-ui-experience.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/expenses.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Dashboard, kanban, and list views config.

This document details the `expenses` capability specs for the `18 Ui Experience` contract.

### REQ-EXPENSES-18UIEXPERIENCE-001
*   **Requirement**: The capability manages `ExpenseReport, ExpenseLine` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/hr_expense/models/hr_expense.py`

### REQ-EXPENSES-18UIEXPERIENCE-002
*   **Requirement**: State changes are constrained to enums: `DRAFT, SUBMITTED, APPROVED, POSTED, DONE, REFUSED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-EXPENSES-18UIEXPERIENCE-003
*   **Requirement**: Mutations are restricted to actions: `create_expense, submit_expense, approve_expense, refuse_expense`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-EXPENSES-18UIEXPERIENCE-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
