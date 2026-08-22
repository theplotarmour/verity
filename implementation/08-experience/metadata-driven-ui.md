# Metadata-Driven UI

## Purpose
Defines the mechanism for generating consistent User Interfaces dynamically from capability metadata, entity definitions, and extensions.

## Scope
Dynamic form generation, table generation, and custom field rendering driven by system schemas. Excludes static, highly bespoke operational screens.

## Authority
- Spec PLA-EXT-002 (CustomFieldSchema)
- PRN-002: Progressive Disclosure of Complexity

## Prerequisites
- Capability Metadata registry.
- Standard Form and Table primitive components.

## Specification Requirements
- **WHAT MUST EXIST:** UI must automatically reflect registered capabilities and their entity schemas.
- **WHAT MUST EXIST:** Custom fields defined via `CustomFieldSchema` must render seamlessly alongside native fields without hardcoded UI updates.
- **WHAT MUST EXIST:** Progressive disclosure - complex or secondary metadata should be hidden behind expandable sections or secondary tabs.

## Approved Architecture
- **Schema-Driven Forms (Authority: Bible Synthesis ADAPTED):** Utilize Zod schemas to generate form definitions and perform validation. Maps Zod types to specific React input primitives (e.g., `z.string()` to Text Input, `z.boolean()` to Toggle).
- **Dynamic Registries (Authority: Spec PLA-EXT):** UI components must query the capability registry to discover custom fields for a given entity at runtime.

## Implementation Contract
- Build a `<DynamicForm schema={zodSchema} customFields={fields} />` component.
- Build a `<DynamicTable columns={columnDef} />` component that infers data types and injects appropriate formatters (date, currency, status badge).
- Map `CustomFieldSchema` types directly to UI primitives: `TEXT` -> input, `NUMBER` -> number input, `DATE` -> date picker, `DROPDOWN` -> select list.
- Store user preferences for dynamic table column visibility in `localStorage` or backend preferences.

## Constraints & Invariants
- **INV-002:** Read-Only Closed States - Dynamic UI generators must disable inputs and hide mutation actions if the entity state is closed/terminal.
- UI generators must fail safely—if an unknown custom field type is encountered, render a read-only string fallback or skip, rather than crashing the form.

## Dependencies
- Depends on: Form and Table components, Extension capability registry.
- Depended on by: Entity CRUD views.

## Failure Modes
- **Schema Mismatch:** UI attempts to submit data that fails strict backend validation. Mitigate by sharing Zod schemas between client UI generators and backend route handlers.

## Testing Requirements
- Unit test dynamic generation of form fields against a mock Zod schema.
- Test custom field injection rendering.

## Conformance Checks
- Verify closed entities render all dynamic fields in a strictly read-only mode.

## Traceability
- Spec PLA-EXT-002
- PRN-002

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Choice of dynamic form binding library (e.g., `react-hook-form` used alongside `@hookform/resolvers/zod`).
