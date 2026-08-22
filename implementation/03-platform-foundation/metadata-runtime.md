# Purpose
Defines the dynamic schema validation and custom field handling mechanism.

# Scope
- Custom fields schema definition
- Dynamic runtime validation
- JSONB storage

# Authority
- **Bible Synthesis ADOPTED**: Zod-backed JSONB (static TS core + runtime Zod-validated extensions column)
- **Spec PLA-EXT-001→004**: Extensions Requirements

# Prerequisites
- Zod 4.4.3 installed

# Specification Requirements
- **PLA-EXT-001 (Extensions Column)**: `custom_fields` dynamic document column on entities.
- **PLA-EXT-002 (Custom Field Metadata Schema)**: `CustomFieldSchema` config rows define field metadata.
- **PLA-EXT-003 (Runtime Dynamic Schema Validation)**: Compile Zod schema from `CustomFieldSchema`.
- **PLA-EXT-004 (Lifecycle Execution Hooks)**: Pre-validation and post-validation hooks.

# Approved Architecture
- **Zod-backed JSONB**: Entities have static core fields and a `custom_fields` JSONB column. (Authority: Bible Synthesis ADOPTED).
- **Schema Compilation**: At write time, standard JSON configurations (`CustomFieldSchema`) are compiled into executable Zod schemas for strict runtime validation.

# Implementation Contract
1. Add `custom_fields JSONB` to extensible Prisma models.
2. Create `CustomFieldSchema` model: `tenant_id`, `entity_type`, `field_name`, `field_type`, `validation_rules`.
3. Implement `defineCustomField()` API for declaring schemas.
4. Implement `validateCustomFields(entityType, payload)` which:
   - Fetches all `CustomFieldSchema` rows for the entity.
   - Translates them into a `z.object({...})`.
   - Validates the `payload` using `zodSchema.parse()`.
5. Integrate `validateCustomFields` into the Command pipeline (specifically during the `before_validate` lifecycle hook).

# Constraints & Invariants
- Dynamic schemas MUST NOT allow overriding or shadowing of static core model fields.

# Dependencies
- Depends on: Zod 4.4.3.
- Depended on by: Extension Hooks, Domain Entities.

# Failure Modes
- Invalid JSON in validation rules causing compilation failure. Compilation logic MUST catch schema construction errors and default to strict denial.

# Testing Requirements
- End-to-end schema compilation and validation test (valid payload passes, invalid fails).

# Conformance Checks
- Verification that all commands interacting with `custom_fields` trigger the dynamic validation pipeline.

# Traceability
- Covers: PLA-EXT-001, PLA-EXT-002, PLA-EXT-003, PLA-EXT-004.

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: Strategy for indexing `custom_fields` for query performance (e.g., GIN indexes on specific high-value JSONB paths vs. default non-indexed).
