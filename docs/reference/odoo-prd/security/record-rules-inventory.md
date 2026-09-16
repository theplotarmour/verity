# Security: Record Rules Inventory

## Purpose
Specifies Odoo's core Record Rules (`ir.rule`) that enforce transactional data isolation at the database query level.

## Core Rules

### 1. Multi-Company Isolation Rule
- **Target Model**: `res.partner`, `sale.order`, `account.move`, `stock.picking`
- **Domain Force**: `['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]`
- **Logic**: Enforces that a user can only view or modify records belonging to their active authorized companies, or global records where company is unassigned.

### 2. Personal Sales Orders Rule
- **Target Model**: `sale.order`
- **Domain Force**: `[('user_id', '=', user.id)]`
- **Logic**: In default configurations for the Salesman (Own Documents Only) group, restricts users to viewing only orders where they are designated as the salesperson.

## Traceability
- **Source Module**: `base`, `sale`, `account`, `stock`
- **Source Files**: `security/ir.rule.xml` mappings across core modules.
