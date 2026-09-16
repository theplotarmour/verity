# System Contradictions, Unknowns, and Partial Implementations

This document registers behavior anomalies, static analysis limits, and contradictions discovered in the Odoo 19.0 codebase.

---

## 1. Contradictions

### CONTRADICTION ID: CON-001 — Required Validation Discrepancy
- **Area**: Field requirements between Python ORM and XML Views.
- **Source A**: In Python model declarations, fields are sometimes declared as `required=True` (e.g. a specific tracking reference).
- **Source B**: In corresponding XML Form Views, the field is marked with `required="0"` or hidden behind conditional modifiers (e.g., `<field name="ref" required="state == 'draft'"/>`).
- **Conflict**: If the user submits a form in a state where the view does not enforce requirement, the frontend web client permits form submission, but the backend ORM raises a `ValidationError` or database-level null-value exception, resulting in transactional rollbacks and user confusion.
- **Resolution**: UNKNOWN. The behavior is context-dependent.

---

## 2. Unknowns

### UNKNOWN ID: UNK-001 — Dynamic Database-Configured Fields
- **Area**: Models and fields created via Developer Mode.
- **Description**: Odoo allows administrators to create custom fields and models directly through the UI (stored as rows in `ir.model` and `ir.model.fields`).
- **Limit**: These dynamically created fields and their validation logic do not exist anywhere in the static code repository.
- **Categorization**: CONFIGURATION-DEPENDENT.

---

## 3. Partial Implementations

### PARTIAL ID: PAR-001 — Customer Credit Blocking
- **Area**: Partner Credit Limit (`res.partner.credit_limit`).
- **Description**: The core `sale` module defines credit checks on partner records. However, in the standard baseline code, exceeding the credit limit merely posts a warning notification in the Chatter log.
- **Limit**: Actual transaction blocking (preventing quotation confirmation when credit is exceeded) is not fully implemented in the base module and requires manual automated rules or additional enterprise extensions.
- **Categorization**: PARTIALLY IMPLEMENTED.
