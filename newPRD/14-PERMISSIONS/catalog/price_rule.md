---
doc_id: PERM-PRICE_RULE
title: Permission matrix — Price Rule
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Permission matrix — Price Rule

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

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
> Not specified in the model. This is a task, not an omission to be papered over. Owner: TBD. Blocks: implementation of `price_rule.permission_defaults`.

## Field-level gates

| Field | Gate verb | Rationale |
|---|---|---|
| `currency` | `view_financial` | marked in model |
| `amount_minor` | `view_financial` | marked in model |
| `percent_of_list` | `view_financial` | an alternative to an absolute amount, for agreements expressed as a discount |
| `tax_inclusive` | `view_financial` | whether the amount already contains tax. Mandatory and explicit, because the same number means two different things and getting it wrong is a systematic error across every line |
| `rounding_rule` | `view_financial` | marked in model |

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
