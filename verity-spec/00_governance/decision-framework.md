# Verity Master Platform Specification

## 00_governance/decision-framework.md

## Provenance
*   **Primary Sources**: None
*   **Verity Bible Authority**: [verity-bible/volume_1_constitution_philosophy.md](file:///D:/Code/verity/verity-bible/volume_1_constitution_philosophy.md) (Section 1: Absolute Constitutional Charter - Authority Hierarchy)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Decision Management Protocol

To maintain structural clarity and track unresolved technical questions, the platform uses a unified decision framework. We distinguish two categories of records:

1.  **Architectural Decision Records (ADR)**: For approved, finalized architectural decisions (stored under `17_decisions/adr/`).
2.  **Explicit Unresolved Decisions (DEC-REQ)**: For outstanding technical or product questions that block implementation and require product owner sign-off.

---

## 2. Unresolved Decision (DEC-REQ) Template

Any engineer or agent identifying a logical gap or unresolved question must register it in `17_decisions/unresolved.md` using this exact template. Partial or vague placeholders like "TBD" are rejected by the validator.

```markdown
### DEC-REQ-[ID_NUMBER]: [Title of Decision]

*   **Question**: Detailed query outlining the exact choice to be made.
*   **Evidence**: Citations from Odoo rules, Keycloak code, or the Verity Bible.
*   **Options**:
    *   *Option A*: Description, pros, cons, and performance trade-offs.
    *   *Option B*: Description, pros, cons, and performance trade-offs.
*   **Current Recommendation**: Rationale for the preferred path.
*   **Status**: `DECISION REQUIRED` | `DEFERRED`
```

---

## 3. ADR (Architectural Decision Record) Template

When a decision is approved, it is moved to a separate file in `17_decisions/adr/adr-[ID_NUMBER].md` and marked as active, replacing any previous draft status.

```markdown
# ADR-[ID_NUMBER]: [Title of Decision]

*   **Status**: Proposed | Active | Superseded
*   **Context**: What is the problem we are solving? What reference code/invariants are affected?
*   **Decision**: The specific architectural choice made, written in clean domain-level requirements.
*   **Consequences**: Technical outcome, new invariants created, database mappings affected.
*   **Traceability**: Links to the original `DEC-REQ` or Bible Volume references.
```

---

## 4. Change and Promotion Rules

### GOV-DEC-001: No Silent Promotions
No implementation choice (such as database engines, sync algorithms, ORMs, or frontend frameworks) may be silently promoted into a product requirement unless it has been explicitly evaluated in an active ADR. The domain model remains database-agnostic.
*   **Status**: `[FACT]`

### GOV-DEC-002: Decision Overrides
If a custom client system requires an override of an established ADR, the developer must submit a `Client-Specific Exception Request`. The exception must be documented in the client composition file without altering the platform's core ADR record.
*   **Status**: `[FACT]`
