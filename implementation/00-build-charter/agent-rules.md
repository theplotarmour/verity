# Agent Operating Rules

## Purpose
Defines the absolute operating constraints for any autonomous agent (such as Claude Code) implementing the Verity platform.

## Scope
Applies to all code generation, documentation updates, architectural planning, and general execution steps undertaken by AI agents within the Verity repository.

## Authority
Authority: Bible V1

## Prerequisites
- Comprehension of `authority.md`.
- Understanding of the canonical glossary (GOV-TER terminology).

## Specification Requirements
- Agents must operate strictly within the bounds of documented requirements.
- No hallucinated requirements based on industry norms.
- Adherence to the clean repository principle.
- Strict utilization of canonical terminology.

## Approved Architecture
- **Verity PRD**: The Verity PRD is defined strictly as the intersection of the Reference Corpus and the Verity Bible, transformed through explicit decisions.
- **Greenfield Principle**: The active repository is a clean slate. No legacy resurrection is permitted.
- **Dependency Management**: No undeclared direct dependency between capabilities is allowed. Capabilities CAN depend on each other through declared contracts, platform services, domain events, or composition.

## Implementation Contract
- **Provenance Requirement**: Every non-trivial requirement must have provenance (a spec/bible reference). Never write a requirement merely because it is common in ERP/SaaS/enterprise software.
- **No Legacy Resurrection**: The active repository is greenfield; legacy VEDA code in git tag `veda-legacy-final` is strictly non-authoritative historical material.
- **No Git History Snooping**: Do not read old Git history automatically — the legacy branch/tag is non-authoritative.
- **Secret Management**: Do not expose actual secret values (API keys, passwords, database URLs) in documentation.
- **Terminology Enforcement**: Canonical terminology enforcement must be strict — use GOV-TER glossary terms ONLY. Prohibited synonyms are strictly banned.
- **Specification Integrity**: The implementation must never silently modify the Master Platform Specification.
- **Conceptual Gaps**: If a conceptual gap is found, flag it as `IMPLEMENTATION DECISION REQUIRED` rather than filling it with generic engineering knowledge.

### Canonical Glossary Enforcement
- Use **Work** (Work Order) — NOT job_card, task, ticket_item, event_run.
- Use **Party** — NOT client_obj, contact_entity.
- Use **Location** (Site) — NOT branch, depot, factory_outlet.
- Use **Resource** — NOT employee_row, tool_entry.
- Use **ChecklistItem** — NOT Task (Task is reserved for project-level milestones).
- Use **Organization** (Tenant) — top-level isolation boundary.
- Use **User** — 1:1 with Party.
- Use **Request** — uncommitted intake ticket.
- Use **Activity** — change record / communication log.
- Use **Asset** — physical equipment/machinery.
- Use **Contract** — commercial agreement with SLA terms.
- Use **Evidence** — immutable field data (GPS, photos, signatures).

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation
- INV-002: Read-Only Closed States
- INV-003: Unified Party Identity

## Dependencies
- Relies on `authority.md` for decision-making bounds.
- Relies on `no-legacy-policy.md` for greenfield enforcement.

## Failure Modes
- Agent hallucinates standard SaaS features not explicitly required by the Verity Spec.
- Agent uses forbidden terminology, causing domain model confusion.
- Agent creates tight coupling between distinct capabilities.

## Testing Requirements
- Code reviews must reject any PR containing prohibited terminology.
- Architecture reviews must verify all capability dependencies are explicitly declared via contracts or events.

## Conformance Checks
Automated grep checks for prohibited terminology across the repository.

## Traceability
GOV-TER-001→017

## Open Decisions
None
