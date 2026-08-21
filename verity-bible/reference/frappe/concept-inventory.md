# Frappe — Concept Inventory

Source: frappe/model/document.py, frappe/model/meta.py, frappe/permissions.py, frappe/core/doctype/doctype/doctype.py, frappe/model/naming.py, frappe/hooks.py
Commit: 94e20b2f70153b1c6e70c6a41755c3e1acaf0647

---

### DocType

Source evidence: `frappe/core/doctype/doctype/doctype.py:88`
Definition: The core metadata definition of a database table and its schema. Stored as a database record, not hardcoded.
Purpose: Defines fields, UI behavior, permissions, and database constraints dynamically.
Key fields/attributes: `name`, `fields` (list of `DocField`), `permissions`, `istable`, `issingle`, `autoname`.
Relationships: Contains `DocField`, `DocPerm`, `DocType Link`, `DocType Action`. Defines a `Document`.
Notes for Verity: Frappe stores schemas as database records rather than hardcoded types. Critical architecture decision for Verity.

---

### Document

Source evidence: `frappe/model/document.py:442`
Definition: The base Python class for all business objects. All entity controllers inherit from this.
Purpose: Handles ORM operations, lifecycles, child table management, and hook triggering.
Key fields/attributes: `doctype`, `name`, `creation`, `modified`, `docstatus`.
Relationships: Governed by a `DocType` schema. Can contain child `Document` records.
Lifecycle states: Unsaved (`__islocal`), Saved, Submitted, Cancelled (via `docstatus`).

---

### Meta

Source evidence: `frappe/model/meta.py:131`
Definition: An in-memory cached representation of a `DocType` merged with all its customizations.
Purpose: Merges base `DocType` definitions with `Custom Field` and `Property Setter` overrides at runtime.
Key fields/attributes: `_fields`, `_table_fields`, `_valid_columns`.
Relationships: Extends `Document`, reads from `DocType`, `Custom Field`, `Property Setter`.
Lifecycle states: Cached on first read, cleared on updates.
Notes for Verity: Shows how tenant customizations can be merged over standard schemas dynamically without schema migrations.

---

### Permission (frappe/permissions.py)

Source evidence: `frappe/permissions.py:81`
Definition: Rules determining user access to a `DocType` or specific `Document`.
Purpose: Granular access control.
Key fields/attributes: `role`, `read`, `write`, `create`, `submit`, `permlevel`.
Relationships: Linked to `DocType` via `DocPerm`. Evaluated against User Roles and User Permissions.
Notes for Verity: Three-tier: Role-based (DocType level) → User Permission (record level) → Permlevel (field level).

---

### Hook

Source evidence: `frappe/hooks.py`
Definition: A registry of module-level callbacks, event listeners, and overrides.
Purpose: Allows separate Frappe apps to inject logic into core behaviors without modifying core source.
Key fields/attributes: `doc_events`, `override_whitelisted_methods`, `scheduler_events`.
Relationships: Connected to `Document` lifecycles (e.g., `on_update`).
Notes for Verity: Inversion of control mechanism. Critical for modular capability architecture.

---

### Naming Series

Source evidence: `frappe/model/naming.py:47`
Definition: A configurable pattern-based ID generator for records.
Purpose: Auto-generates human-readable, sequence-based unique identifiers (e.g., `WO-.YYYY.-.####`).
Key fields/attributes: `series` string, counter in `tabSeries`.
Relationships: Configured in `DocType.autoname` or `naming_series` field.
Notes for Verity: Allows business users to define their own record ID formats without code changes.

---

### Child Table

Source evidence: `frappe/model/document.py:591` (in `load_children_from_db`)
Definition: A set of nested records directly owned by a parent document.
Purpose: Represents 1-to-N relationships where children have no independent lifecycle.
Key fields/attributes: `parent`, `parenttype`, `parentfield`.
Relationships: A `DocType` marked with `istable=1`. Loaded and saved automatically when parent is processed.
Lifecycle states: Follows parent's `docstatus`.
Notes for Verity: Vital pattern for Work Order task checklists, line items, and evidence collections.
