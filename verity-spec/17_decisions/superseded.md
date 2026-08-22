# Verity Master Platform Specification

## 17_decisions/superseded.md

This document contains the register of historical, superseded design decisions for the Verity platform.

---

### DEC-HIST-001: Separation of Employee and Partner Tables
*   **Decision ID**: DEC-HIST-001
*   **Question**: Should Verity retain Odoo's split tables for partners (`res.partner`) and employees (`hr.employee`)?
*   **Context**: Odoo stores employee HR details separately from partner communication info.
*   **Affected Concepts**: `Party`, `Resource`, `User`
*   **Evidence**: Odoo addons/hr/models/hr_employee.py
*   **Evidence Location**: odoo/addons/hr/models/hr_employee.py
*   **Options**:
    *   *Option A*: Retain split tables. Pros: maps directly to Odoo. Cons: leads to profile sync duplication.
    *   *Option B*: Unify under the single canonical `Party` primitive.
*   **Recommendation**: Option B.
*   **Status**: `SUPERSEDED`
*   **Owner**: Product Owner
*   **Resolution**: Resolved by INV-003 (Unified Party Identity).
*   **Supersedes**: None
*   **Superseded By**: INV-003
*   **Confidence**: `HIGH`
