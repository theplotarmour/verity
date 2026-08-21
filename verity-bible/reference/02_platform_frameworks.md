# VERITY REFERENCE CORPUS — VOLUME 2
## Platform Frameworks: Frappe Framework

This volume documents our architectural findings and concept extractions from the Frappe Framework, establishing Verity’s metadata-driven architecture and configuration philosophy.

---

## 1. Frappe Framework
*   **Domain Focus:** Metadata-driven application framework.
*   **Target Extract:** DocTypes, schema configuration, permissions, and framework/application separation.

### A. Concept Comparison & Mappings:
*   *Frappe `DocType`:* Maps to Verity’s **`Entity`** meta-model definition. In Frappe, everything (from a Sales Order to a Role) is a DocType defined by a JSON metadata file. Verity adopts this concept to represent all platform primitives as metadata schemas.
*   *Frappe `Custom Field`:* Maps to Verity’s custom metadata capability. Frappe allows adding custom fields to standard DocTypes without modifying core tables, separating framework upgrades from customer configurations.
*   *Frappe `Server Script`:* Retained conceptually. Enables custom validation scripts to execute on database triggers, sandboxed inside the platform execution engine.

### B. Invariants Discovered:
*   **Schema Isolation:** Core application files must remain untouched during tenant configuration. Customizations are stored as metadata rows in the database and compiled at runtime.
*   **Dynamic Document Naming:** Every DocType must define a naming rule (naming series, field value, or UUID) to ensure unique, predictable document keys across the tenant.

### C. Edge Cases & Operational Reality:
*   *Modifying Live Schemas:* When custom fields are added or deleted by Tenant Admins, the framework must update index views dynamically without lockups. Verity handles this by storing custom fields in PostgreSQL JSONB fields (`metadata`) and executing background database migrations for indexed columns.
*   *Classical Extension:* Verity adopts Frappe’s classical mixin inheritance model. A developer can write an extension that injects fields and methods into an existing capability (e.g. adding safety checklist fields to a `Work Order` primitive) without modifying the core work capability.
