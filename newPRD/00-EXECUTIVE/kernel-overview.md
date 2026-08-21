---
doc_id: KERNEL-000
title: The Verity Kernel — construct reference
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# The Verity Kernel — construct reference

*Generated. Edit `_model/_kernel.yaml`, not this file.*

This file defines WHAT VERITY IS MADE OF. It is one level above every capability model. A capability model is an instance of the constructs defined here. If a construct is not defined in this file, it may not appear in any capability model, and the generator will reject it.
The distinction this file exists to protect: an ERP ships a fixed set of modules. Verity ships a KERNEL plus a LIBRARY. The kernel is what makes two tenants running the same binary present as two different business operating systems. If the kernel is weak, Verity degrades into an ERP with a theme picker.


## Evidence basis

**Claim (KNOWN).** Mature configurable platforms store the specification itself as data, and generate schema and UI from it.

- Frappe: DocType manages schema plus metadata about behaviour; because metadata is stored in a table it can change without code, and changing it changes schema and UI automatically. https://frappe.io/framework/doctype
- Frappe: schema synchronisation translates DocType definitions into database DDL operations; JSON storage enables version control and deployment. https://deepwiki.com/frappe/frappe/2.3-doctype-system-and-metadata-management
- ServiceNow: creating a table adds a record to sys_db_object, adding a field adds a record to sys_dictionary; schema is determined through these metadata tables rather than by direct DB manipulation. https://note.com/u_sn_notes/n/nddf7e8fbba46
- Odoo: ir.model is the metadata registry holding one record per model, written identically whether the model came from Python or Studio. https://www.dasolo.ai/en/blog/odoo-data-api-5/odoo-ir-model-guide-167
- Odoo: views are stored as records and can be edited independently of the models they represent. https://www.odoo.com/documentation/18.0/developer/reference/user_interface/view_records.html

**Claim (KNOWN).** Overrides must live in a separate artifact from definitions, or upgrades break customisations.

- Frappe: Custom Field and Property Setter override DocType properties without changing the underlying DocType. https://docs.frappe.io/framework/user/en/basics/doctypes/customize
- ServiceNow: sys_dictionary_override changes inherited field behaviour on a child table without modifying the parent definition. https://servicenow.github.io/sdk/guides/table-guide

**Claim (KNOWN).** Metadata-driven does not mean upgrade-safe by itself. Frappe explicitly does not support reverse schema migrations, and removed or renamed fields leave their columns in place to avoid data loss.

- https://docs.frappe.io/framework/v14/user/en/database-migrations

*Implication:* Verity must specify a forward-only migration model with an explicit compensating-change strategy, not pretend rollback is free. See DEC-K-011.

## Constructs

| # | Construct | Definition |
|---|---|---|
| K01 | **FieldType** | A primitive value domain with defined storage, validation, rendering and comparison semantics. |
| K02 | **Field** | One named, typed attribute of one Entity, carrying its own security, validation and lifecycle metadata. |
| K03 | **Entity** | A named business concept with identity, a field set, a lifecycle, an owner and a tenancy mode. |
| K04 | **Relationship** | A declared, directional, cardinality-bearing link between two Entities, including across capability boundaries. |
| K05 | **State and Transition (Lifecycle)** | The finite state machine that governs what may happen to an Entity instance and when. |
| K06 | **Action** | A named, permissioned, auditable operation that a principal or the system may invoke against an Entity. |
| K07 | **Rule** | A declarative constraint or derivation evaluated by the platform rather than coded per capability. |
| K08 | **Event** | An immutable record that something happened, published for consumption by other capabilities and by automations. |
| K09 | **Workflow** | A named, resumable, multi-step orchestration that spans actions across one or more capabilities. |
| K10 | **Notification** | A targeted, channel-routed, preference-aware message produced by an Event or Rule. |
| K11 | **Permission** | A grant of (verb x entity x field-set x scope) to a role, evaluated in that order. |
| K12 | **Role** | A named bundle of Permissions, instantiated per tenant, mapped to one or more platform role archetypes. |
| K13 | **Port** | A named, typed extension point through which one capability consumes another WITHOUT knowing which capability satisfies it. |
| K14 | **View / Surface** | A permission-aware projection of entities rendered for a specific role on a specific surface. |
| K15 | **Configuration** | A typed, scoped, defaulted, validated setting that alters behaviour without altering the model. |
| K16 | **Expression** | The single, sandboxed, side-effect-free language in which guards, validations, derivations, policies and audience selectors are written. |
