# Core Requirements Traceability

This document registers the functional requirements and maps them to concrete source code evidence.

---

## 1. Core Framework & Meta-Model

### REQ-FRAME-001: Model Extension Inherits Dynamically
- **Requirement**: Modules must be able to extend existing models in-place, adding fields, constraints, and overriding methods dynamically.
- **Evidence**:
  - Module: `base`
  - Model: `ir.model` / `odoo.orm.models`
  - Source File: [`odoo/orm/models.py`](file:///d:/Code/odoo-19.0/odoo/orm/models.py)
  - Method: `_inherit` / `_build_model`
  - Confidence: HIGH

### REQ-FRAME-002: Transient Data Auto-Purging
- **Requirement**: Data in Transient Models must be automatically deleted after a specified duration to prevent database bloat.
- **Evidence**:
  - Module: `base`
  - Model: `ir.autovacuum`
  - Source File: [`odoo/addons/base/models/ir_autovacuum.py`](file:///d:/Code/odoo-19.0/odoo/addons/base/models/ir_autovacuum.py)
  - Method: `power_on` / `_vacuum_transient_models`
  - Confidence: HIGH

---

## 2. Security & Identity

### REQ-SEC-001: Closed ACL Policy
- **Requirement**: No user can read or write any model data unless access is explicitly granted to one of their security groups.
- **Evidence**:
  - Module: `base`
  - Model: `ir.model.access`
  - Source File: [`odoo/addons/base/models/ir_model.py`](file:///d:/Code/odoo-19.0/odoo/addons/base/models/ir_model.py)
  - Method: `check`
  - Confidence: HIGH

### REQ-SEC-002: Dynamic Record Filtering
- **Requirement**: Record-level visibility rules must append SQL clauses to restrict queries based on user group context.
- **Evidence**:
  - Module: `base`
  - Model: `ir.rule`
  - Source File: [`odoo/addons/base/models/ir_rule.py`](file:///d:/Code/odoo-19.0/odoo/addons/base/models/ir_rule.py)
  - Method: `_compute_domain` / `domain_get`
  - Confidence: HIGH

---

## 3. Quote-to-Cash (Sales & Inventory)

### REQ-SALE-001: Quotation Confirmation
- **Requirement**: Confirming a quotation transitions its status to a Sales Order, locks price agreements, and triggers delivery.
- **Evidence**:
  - Module: `sale`
  - Model: `sale.order`
  - Source File: [`addons/sale/models/sale_order.py`](file:///d:/Code/odoo-19.0/addons/sale/models/sale_order.py)
  - Method: `action_confirm`
  - Confidence: HIGH

### REQ-SALE-002: Stock Reservation
- **Requirement**: Confirming a Sales Order automatically creates a Delivery Order in draft state and attempts to reserve available items.
- **Evidence**:
  - Module: `sale_stock`
  - Model: `stock.picking` / `stock.move`
  - Source File: [`addons/sale_stock/models/sale_order.py`](file:///d:/Code/odoo-19.0/addons/sale_stock/models/sale_order.py)
  - Method: `_action_confirm` / `_create_delivery_line`
  - Confidence: HIGH
