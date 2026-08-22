# Verity Implementation Handoff Corpus

> **Authority**: This corpus is the third layer in the Verity authority hierarchy.
> It does NOT define what Verity is (Bible) or what Verity must do (Master Platform Specification).
> It defines **how Claude Code should build Verity** from a clean repository.

## Authority Hierarchy

```text
LEVEL 1 — CONSTITUTIONAL
    Verity Bible (verity-bible/)
    → What Verity IS. Product identity, invariants, principles, anti-vision.
    → Overrides everything below.

LEVEL 2 — SPECIFICATION
    Verity Master Platform Specification (verity-spec/)
    → What Verity MUST DO. Requirements with provenance.
    → Overrides implementation decisions.

LEVEL 3 — IMPLEMENTATION HANDOFF
    This corpus (implementation/)
    → HOW Claude Code should build it.
    → Bound by Levels 1 and 2.

LEVEL 4 — CODE
    The actual implementation.
    → Must conform to all three levels above.
```

Within Level 1, the full authority ordering is:

```text
Constitutional Decisions > Bible Volumes > Approved Architecture Decisions
    > Transformed PRD > External Research > Odoo Reference PRD
    > Legacy Codebase > Assumptions
```

## How to Use This Corpus

### For Claude Code / Implementing Agent

1. **Before writing any code**, read these documents in this order:
   - `00-build-charter/authority.md` — understand what governs your decisions
   - `00-build-charter/agent-rules.md` — understand your operating constraints
   - `00-build-charter/no-legacy-policy.md` — understand what is forbidden
   - `02-foundation-build-order/bootstrap-sequence.md` — understand what to build first
   - `02-foundation-build-order/architecture-dependency-graph.md` — understand dependencies
   - `14-agent-protocol/claude-operating-manual.md` — understand your execution loop

2. **Before implementing a capability**, read:
   - The corresponding spec files in `verity-spec/`
   - `09-capabilities/implementation-contract.md` — the 31-point checklist + reusability test
   - `09-capabilities/dependency-order.md` — verify prerequisites exist
   - The relevant platform foundation guides in `03-platform-foundation/` and `04-domain-runtime/`

3. **Before committing code**, verify:
   - `14-agent-protocol/self-review-checklist.md`
   - `13-conformance/spec-conformance.md`
   - `13-conformance/forbidden-patterns.md`
   - `13-conformance/implementation-invariant-checks.md`

### For Human Reviewers

This corpus should be sufficient for a clean-room rebuild:

```text
Bible + Master Platform Specification + Implementation Handoff = Clean-room Verity rebuild
```

Legacy code (preserved in Git tag `veda-legacy-final`) should only be consulted for forensics, never architecture.

## Directory Map

| Directory | Purpose | File Count |
|-----------|---------|------------|
| `00-build-charter/` | Governance: authority, rules, definition of done, policies | 6 |
| `01-repository/` | Repository structure, boundaries, naming, dependency rules | 6 |
| `02-foundation-build-order/` | Build roadmap, phases, bootstrap sequence, dependency graph | 6 |
| `03-platform-foundation/` | Tenancy, identity, auth, organization, extensions, config | 10 |
| `04-domain-runtime/` | Entity, field, command, query, state, event, audit patterns | 11 |
| `05-execution/` | Work, assignment, scheduling, SLA, evidence, approval | 8 |
| `06-workflow-automation/` | Workflow engine, automation, jobs, retry, idempotency | 7 |
| `07-data/` | Schema, migration, transactions, offline sync, conflicts | 8 |
| `08-experience/` | Shells, navigation, forms, tables, mobile, accessibility | 11 |
| `09-capabilities/` | Implementation contract, dependency order, promotion | 5 |
| `10-integrations/` | API, webhooks, storage, notifications, boundaries | 5 |
| `11-platform-operations/` | Observability, health, performance, resilience, deployment | 5 |
| `12-testing/` | Test pyramid, unit through adversarial testing guides | 10 |
| `13-conformance/` | Spec conformance, forbidden patterns, invariant checks, gates | 4 |
| `14-agent-protocol/` | Claude operating manual, execution protocol, recovery | 10 |
| `15-traceability/` | Requirement-to-code mapping, decision tracing, coverage | 3 |
| `16-environment/` | Environment variable contract | 1 |

**Total: 116 files**

## Technology Authority Rule

> **Any concrete technology choice appearing in this corpus has an explicit authority reference.**
> If no authority exists for a technology choice, it is labeled `IMPLEMENTATION DECISION REQUIRED`.
> This prevents the handoff from accidentally creating architecture by assertion.

Technology authority levels used throughout:

| Label | Meaning |
|-------|---------|
| `Authority: Bible V[N]` | Constitutional requirement from Bible volume |
| `Authority: Bible Synthesis, ADOPTED` | Reference architecture pattern fully adopted |
| `Authority: Bible Synthesis, ADAPTED` | Reference pattern adopted with modifications |
| `Authority: Bible Synthesis, REJECTED` | Reference pattern explicitly rejected |
| `Authority: Spec [REQ-ID]` | Traced to specification requirement |
| `Authority: DEC-[N]` | Traced to product decision |
| `Authority: EXISTING INFRASTRUCTURE` | Retained from current repository baseline |
| `IMPLEMENTATION DECISION REQUIRED` | No authority exists — requires explicit decision |

## Constitutional Invariants

These are **non-negotiable** across the entire implementation:

- **INV-001**: Strict Tenancy Isolation — every read/write filtered by tenant, no cross-tenant foreign keys
- **INV-002**: Read-Only Closed States — closed Work Orders permanently locked, rework spawns child
- **INV-003**: Unified Party Identity — one Party record per person/business, no split tables
- **PRN-001**: Least Surprise / Explainable Automation
- **PRN-002**: Progressive Disclosure of Complexity

## Conflict Resolution Priority

When implementation choices conflict, resolve in this order:

```text
Safety & Security → Truth & Correctness → Platform Coherence
    → Operational Usefulness → Simplicity → Flexibility → Polish
```

## The Implementation Loop

Claude Code should follow this loop for every unit of work:

```text
READ SPEC
→ IDENTIFY REQUIREMENTS
→ CHECK DEPENDENCIES
→ IMPLEMENT
→ TEST
→ CONFORMANCE AUDIT
→ CHECK FOR ARCHITECTURAL DRIFT
→ TRACE TO SPEC
→ COMMIT
```
