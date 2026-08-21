---
doc_id: PERM-SUPPLIER_INVOICE
title: Permission matrix — Supplier Invoice
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Permission matrix — Supplier Invoice

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

Permission is evaluated as **Action + Entity + Field + Scope**, in that order. A denial at any layer stops evaluation. Field-level denial removes the field from the response payload entirely (`E_AUTHZ_FIELD`) so a client cannot distinguish *hidden* from *empty*. Scope denial returns `404`, not `403`, so the existence of out-of-scope records is never confirmed.

## Default grants by role archetype

| Role archetype | `view` | `list` | `create` | `edit` | `delete` | `restore` | `approve` | `assign` | `execute` | `export` | `import` | `administer` | `view_financial` | `view_sensitive` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Platform Operator (Verity HQ)** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Platform Support (Verity HQ)** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Owner / Director** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Tenant Administrator** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Finance** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Operations / Area Manager** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Site Supervisor** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Dispatcher / Scheduler** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Employee / Field Worker / Guard / Technician** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Client Contact (B2B)** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Consumer (B2C)** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Vendor / Supplier Contact** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Auditor** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |
| **Integration / Service Account** | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP | GAP |

> **GAP — default grant per (role archetype x verb x scope) is not declared in the model — this matrix must be filled before any pack can ship working permissions**  
> Not specified in the model. This is a task, not an omission to be papered over. Owner: TBD. Blocks: implementation of `supplier_invoice.permission_defaults`.

## Field-level gates

| Field | Gate verb | Rationale |
|---|---|---|
| `due_date` | `view_financial` | marked in model |
| `currency` | `view_financial` | marked in model |
| `subtotal_minor` | `view_financial` | marked in model |
| `tax_total_minor` | `view_financial` | marked in model |
| `total_minor` | `view_financial` | marked in model |
| `match_variance_minor` | `view_financial` | marked in model |
| `approved_for_payment_by_principal_id` | `view_financial` | marked in model |
| `payment_reference` | `view_financial` | set by the payment capability. This capability never moves money |

## Scope vocabulary in force

| Scope | Resolution |
|---|---|
| `own` | `subject_id == principal.id` |
| `own_team` | `subject.team_id IN principal.managed_team_ids` |
| `own_site` | `subject.site_id IN principal.assigned_site_ids` |
| `own_region` | `subject.site.region_id IN principal.managed_region_ids` |
| `own_department` | `subject.department_id == principal.department_id` |
| `own_customer` | `subject.customer_id IN principal.linked_customer_ids` |
| `own_vendor` | `subject.vendor_id IN principal.linked_vendor_ids` |
| `tenant` | `subject.tenant_id == principal.tenant_id` |
| `platform` | `principal.tenant_bound == false` |
