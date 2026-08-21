# Frappe — Verity Implications

Source: frappe/model/document.py, frappe/model/meta.py, frappe/permissions.py, frappe/core/doctype/doctype/doctype.py
Commit: 94e20b2f70153b1c6e70c6a41755c3e1acaf0647

---

### Metadata-Driven Schemas

Confidence: HIGH
Recommendation: ADAPT
Rationale: Frappe's purely metadata-driven approach relies on Python's dynamic nature. For Verity in TypeScript, purely DB-stored schemas sacrifice static type safety. However, the core insight — that tenant customizations should be stored as data, not deployed code — is essential.
If ADAPT: Verity defines core entity schemas as strongly-typed TypeScript/Zod schemas. Tenant extensions are stored as metadata rows (equivalent to `Custom Field`) merged at runtime into JSONB fields. The JSONB approach avoids schema migrations while preserving type safety for the canonical model.
Affects Bible sections: Volume II (Metamodel), Volume V (Configuration)

---

### Layered Permissions (Three-Tier)

Confidence: HIGH
Recommendation: ADOPT
Rationale: Frappe's 3-tier model (`permissions.py:81`) is battle-tested. Role-based DocType permissions + row-level User Permission overrides + field-level permlevels covers every enterprise access pattern Verity will encounter.
If ADOPT: Implement authorization middleware that rewrites database queries based on row-level visibility filters, equivalent to Frappe's `db_query.build_match_conditions()`.
Affects Bible sections: Volume V (Security), Volume II (Permission model)

---

### Controller Lifecycle Hooks

Confidence: HIGH
Recommendation: ADOPT
Rationale: Executing business logic via predictable lifecycle hooks (`before_save`, `on_update`) on a base class keeps the core framework agnostic of business rules.
If ADOPT: Implement a `BaseEntity` class that wraps database operations and explicitly calls hooks on extended entity controllers before committing transactions.
Affects Bible sections: Volume II (Entity model), Volume III (Workflow engine)

---

### Child Table as Aggregate Root

Confidence: HIGH
Recommendation: ADOPT
Rationale: Treating parent + child records as a single atomic aggregate dramatically simplifies ORM and API design.
If ADOPT: Work Order task checklists and evidence records have no standalone API endpoints. They are mutated only by submitting the parent Work Order aggregate.
Affects Bible sections: Volume II (Work primitive), Volume III (Execution)

---

### Naming Series

Confidence: HIGH
Recommendation: ADOPT
Rationale: Business users need human-readable, customizable document IDs (e.g., `WO-2026-0042`). Frappe's naming series solves this without code changes.
If ADOPT: Add a `namingPattern` configuration field to each entity type's configuration. Auto-generate IDs from the pattern with a per-tenant sequence counter.
Affects Bible sections: Volume VI (Glossary, configuration)
