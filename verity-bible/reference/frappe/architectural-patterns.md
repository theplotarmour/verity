# Frappe — Architectural Patterns

Source: frappe/model/document.py, frappe/model/meta.py, frappe/permissions.py, frappe/core/doctype/doctype/doctype.py
Commit: 94e20b2f70153b1c6e70c6a41755c3e1acaf0647

---

### Metadata-at-Runtime

Source evidence: `frappe/core/doctype/doctype/doctype.py` and `frappe/model/meta.py`
Pattern: Business entities are defined as data in the database rather than as classes in code.
Problem solved: Allows application schemas to be customized without server restarts or code deployment.
Implementation sketch: `Meta(doctype)` merges the base JSON schema with runtime customizations from `Custom Field`.
Trade-offs: Slower than statically typed compiled models; requires complex caching; less type safety in IDEs.
Applicability to Verity: MEDIUM — Verity could use a hybrid: code-defined base schemas with metadata-layer extensions.

---

### Controller Inheritance

Source evidence: `frappe/model/document.py` (`get_controller` and `Document`)
Pattern: A single base class handles ORM mapping, while entity-specific logic inherits from it.
Problem solved: Avoids duplicating lifecycle and validation logic across hundreds of entities.
Implementation sketch: `get_doc()` looks up the Python class for the DocType, instantiates it, calls `.insert()` which invokes `validate()` overrides.
Trade-offs: Deep inheritance hierarchies can be hard to trace.
Applicability to Verity: HIGH — A `BaseEntity` controller that triggers predictable lifecycle hooks is excellent for platform consistency.

---

### Permission Layering (Three-Tier)

Source evidence: `frappe/permissions.py`
Pattern: Access control resolved by merging Role access (system level), User Permissions (row level), Permlevels (field level).
Problem solved: Enterprise applications need highly granular access control matrices.
Implementation sketch: `has_permission` checks Roles. `has_user_permission` scopes rows. `get_permitted_fieldnames` masks columns.
Trade-offs: High computational complexity; queries must dynamically inject access constraints.
Applicability to Verity: HIGH — Verity will need row-level and field-level security.

---

### Child Table / Aggregate Root

Source evidence: `frappe/model/document.py` (child handling logic)
Pattern: Nested sub-records are handled transparently as lists within the parent object.
Problem solved: Managing 1-N relationships as a single atomic document.
Implementation sketch: A DocType with `istable=1` relies on `parent`, `parenttype`, `parentfield`. Saving parent automatically iterates through children.
Trade-offs: Difficult to query child records independently — they belong exclusively to the parent.
Applicability to Verity: HIGH — Perfect for Work Order task checklists and evidence collections.

---

### Hook-Based Extensibility

Source evidence: `frappe/hooks.py`
Pattern: Apps register callbacks in a central registry, invoked by the core at predictable lifecycle points.
Problem solved: Third-party apps extend core behavior without modifying core files.
Trade-offs: Debugging hook execution chains requires tracing across multiple app registries.
Applicability to Verity: HIGH — Verity's Capability architecture should expose lifecycle hooks for extensions.
