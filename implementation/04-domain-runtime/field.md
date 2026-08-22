# Purpose
Defines the standard field types, validation rules, and default behaviors for entity properties in Verity.

# Scope
Covers scalar fields, JSON document fields, validation constraints, nullable semantics, and standardized domain types like pricing and timestamps.

# Authority
- Bible Synthesis: Saleor integer pricing
- Bible Synthesis ADOPTED: Cal.com UTC timestamps
- Bible Synthesis ADAPTED: Zod schema validation
- Bible V1: Prisma data types

# Prerequisites
- Base Entity Pattern (`entity.md`)

# Specification Requirements
- MET-ACT-001: Input validated against static schema before mutation.

# Approved Architecture
- **Validation**: Zod 4.4.3 (Authority: Bible Synthesis ADAPTED)
- **Pricing Fields**: Integer `pricePaise` representing smallest currency unit (Authority: Bible Synthesis - Saleor)
- **Timestamps**: Always UTC (Authority: Bible Synthesis ADOPTED - Cal.com UTC)

# Implementation Contract
- **Standard Types**: Map directly to Prisma (String, Int, Decimal, Boolean, DateTime, Json, Enum).
- **Validation Rules**: Use Zod for runtime validation:
  - Required vs Optional
  - `min`/`max` constraints
  - RegEx patterns
  - Enum membership
- **Nullable vs Required**: Only use nullable (`?` in Prisma, `.nullable()` in Zod) when a field is truly optional. Prefer required fields with sensible defaults where possible.
- **Pricing**: All monetary values MUST use `Int` and suffix the field name with the currency subunit, e.g., `pricePaise`.
- **Timestamps**: Prisma `@default(now())` and Zod `z.date()` must strictly handle UTC.

# Constraints & Invariants
- Dates MUST NEVER be stored in local timezones.
- Prices MUST NEVER be stored as floating-point decimals.

# Dependencies
- Depends on: Zod, Prisma

# Failure Modes
- Zod validation fails with `ValidationError` before DB mutation.
- Prisma throws runtime error on invalid types.

# Testing Requirements
- Boundary testing on integers and dates.
- Type mapping checks between Zod schemas and Prisma models.

# Conformance Checks
- Static analysis to ensure `price` fields do not use `Float` type.

# Traceability
- MET-ACT-001

# Open Decisions
- None
