# Forbidden Patterns Register

## Purpose
Maintains a definitive list of code patterns, terminology, and structures that must NEVER appear in the Verity codebase, primarily to prevent contamination from the legacy VEDA platform.

## Scope
In scope: Legacy VEDA terminology, architectural anti-patterns, UI anti-patterns.
Out of scope: General JavaScript best practices (handled by ESLint).

## Authority
- Authority: Bible V2, Platform Constitution
- Authority: Bible V4, UI Guidelines
- Authority: Spec GOV-TER-001→017

## Prerequisites
- Accessible via `grep` or similar static analysis tools during the verification loop.

## Specification Requirements
- WHAT MUST EXIST: Strict enforcement of the new ubiquitous language and architectural boundaries.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: A concrete list of strings, regexes, and AST anti-patterns checked during `self-review-checklist.md`.

## Implementation Contract
Claude MUST ensure none of these patterns exist before committing. 

**VEDA LEGACY PATTERNS (Prohibited Synonyms & Structures):**
- `factoryId` or `factory_id` -> Use `tenantId` (or `organization_id`). (Req: GOV-TER-001)
- `Department` (when used as a production stage) -> Use `Organization` or `Location`.
- `SalesOrder` automotive columns -> Removed entirely from the platform.
- `ItemType` enum values (e.g., `RAW_MATERIAL`) -> Use canonical catalog types.
- `SpecRefTarget` enum -> Removed.
- `SystemRole` enum (`OWNER`, `CO_OWNER`, etc.) -> Use dynamic `Role` entity mapping.
- `ProductionBatch`, `BomMode`, `QCTemplate` -> Removed entirely.
- `job_card`, `task` (when meaning work order), `ticket_item`, `event_run` -> Use `Work` (Work Order). (Req: GOV-TER)
- `client_obj`, `contact_entity` -> Use `Party`. (Req: GOV-TER)
- `branch`, `depot`, `factory_outlet` -> Use `Location` (Site). (Req: GOV-TER)
- `employee_row`, `tool_entry` -> Use `Resource`. (Req: GOV-TER)
- `Task` (when meaning checklist item) -> Use `ChecklistItem`.
- VEDA Routes: `/owner`, `/worker`, `/inspector`, `/supervisor`, `/verity` -> Use role-agnostic routes.
- Prisma `@@map` pointing to VEDA schema names -> Use clean PostgreSQL snake_case names.

**UI ANTI-PATTERNS:**
- `.verity-glass` -> Use `bg-surface` (Authority: Bible V4 ban on glassmorphism).
- Hardcoded dark color classes (e.g., `dark:bg-gray-800`) -> Use semantic Tailwind v4 CSS variables.

**ARCHITECTURAL ANTI-PATTERNS:**
- Direct DB mutation bypassing command layer.
- Cross-tenant foreign keys (Req: PLA-TEN-003).
- Mutable audit records.
- State machine transitions without corresponding domain event emission (Req: MET-EVE-001).
- Undeclared cross-capability imports. No undeclared direct dependency between capabilities.
- Client-supplied tenant identifiers expanding data visibility (Req: PLA-TEN-006).

## Constraints & Invariants
- ANY presence of these terms constitutes a P0/P1 failure and must be remediated instantly.

## Dependencies
- Tied to the `GOV-TER` Canonical Glossary.

## Failure Modes
- If a forbidden pattern is detected, Claude must remove the pattern, implement the correct alternative, and re-run tests.

## Testing Requirements
- CI/CD should have a grep step for these literal strings.

## Conformance Checks
- GOV-TER-001→017, PLA-TEN-003, PLA-TEN-006.

## Traceability
- Bible V2, Bible V4.

## Open Decisions
- None.
