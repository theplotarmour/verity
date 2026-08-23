# Verity Master Platform Specification

## 00_governance/status-taxonomy.md

## Provenance
*   **Primary Sources**: None — this document defines the corpus's own annotation scheme.
*   **Verity Bible Authority**: [verity-bible/volume_1_constitution_philosophy.md](../../verity-bible/volume_1_constitution_philosophy.md) (Section 1: Absolute Constitutional Charter — Authority Hierarchy)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None
*   **Ratified by**: ADR-010

---

## 1. Purpose

Every requirement in this specification carries a `Status` field. The scheme was in use across 3,565 annotations before it was defined, which made the field unreadable: an implementer could not tell whether `[UNKNOWN_REASON: FUTURE_CAPABILITY]` meant *ratified but not yet built* or *not yet ratified, do not build*. Those readings differ on whether roughly a third of the corpus is safe to implement.

This document fixes the meaning. It changes no requirement; it makes the existing annotations legible.

---

## 2. What the Status field describes

### GOV-STA-001: Status records provenance, not ratification
*   **Rule**: The `Status` field records **how a requirement's content was established** — what evidence stands behind it. It does **not** record whether the requirement is approved, nor whether it has been implemented.
*   **Rationale**: The field is named `UNKNOWN_REASON` for its unresolved values. What is unknown is the *provenance*; the requirement body itself is written in full and in prescriptive terms in every case. Ratification is expressed by the authority hierarchy and by Architecture Decision Records, not by this field. Implementation status is tracked in `15_traceability/`.
*   **Status**: `[DECIDED]`

### GOV-STA-002: Status never gates implementation on its own
*   **Rule**: A requirement is implementable when it is unambiguous and consistent with the authorities above it. No `Status` value withholds permission to implement, with the single exception in GOV-STA-006.
*   **Rationale**: Treating an unresolved provenance marker as a build gate would have blocked the platform foundation, whose tenancy, identity, authorization, entity, command, state, event, audit, workflow, capability and sync requirements are predominantly `[UNKNOWN_REASON: FUTURE_CAPABILITY]` and were implemented without ambiguity.
*   **Status**: `[DECIDED]`

---

## 3. Resolved provenance values

### GOV-STA-003: `[FACT]`
*   **Meaning**: Traced to direct evidence in the reference corpus or to an explicit Bible statement. The requirement describes something observed, not reasoned toward.
*   **Implementer action**: Implement as written.
*   **Status**: `[DECIDED]`

### GOV-STA-004: `[DECIDED]`
*   **Meaning**: Settled by an explicit decision — an ADR, a constitutional invariant, or a product ruling — rather than by evidence alone. Where `[FACT]` says *this is how it is*, `[DECIDED]` says *this is what we chose*.
*   **Implementer action**: Implement as written. Deviating requires superseding the decision, not reinterpreting the requirement.
*   **Status**: `[DECIDED]`

### GOV-STA-005: `[INFERRED]`
*   **Meaning**: Derived by reasoning from adjacent evidence rather than stated by any source. Sound, but a step removed from the record.
*   **Implementer action**: Implement as written, and surface any conflict with a `[FACT]` or `[DECIDED]` requirement rather than resolving it locally — an inference is the weakest of the three and yields first.
*   **Status**: `[DECIDED]`

---

## 4. Unresolved provenance values

All four carry the prefix `[UNKNOWN_REASON: …]`. The suffix names **why provenance could not be established**, and each suffix implies a different remedy.

### GOV-STA-006: `[UNKNOWN_REASON: INTENTIONALLY_DEFERRED]`
*   **Meaning**: Provenance was left open on purpose, because the question behind the requirement has not been settled.
*   **Implementer action**: **Do not implement.** This is the one value that gates. Treat it as a stop condition, classify it, and escalate. Currently six annotations, all in `00_governance/`.
*   **Status**: `[DECIDED]`

### GOV-STA-007: `[UNKNOWN_REASON: RESEARCH_REQUIRED]`
*   **Meaning**: Provenance is expected to exist but has not been traced.
*   **Implementer action**: Implement if unambiguous. Record the gap so the citation can be completed. Currently ten annotations, all in `00_governance/`.
*   **Status**: `[DECIDED]`

### GOV-STA-008: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`
*   **Meaning**: A source was identified but could not be consulted when the requirement was written.
*   **Implementer action**: Implement as written. The absence of a reachable citation does not weaken a requirement the authorities above it support.
*   **Status**: `[DECIDED]`

### GOV-STA-009: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Meaning**: No provenance exists **because the reference corpus contains nothing to trace to**. The requirement describes platform behaviour that Odoo, Frappe, Keycloak, Cal.com and the other reference systems do not have. It is the largest group precisely because Verity is not a reimplementation of any of them.
*   **Implementer action**: Implement as written. This value carries no doubt about the requirement — only the fact that no prior art was available to cite.
*   **Status**: `[DECIDED]`

---

## 5. Distribution at ratification

| Value | Annotations | Gates implementation |
|---|---:|---|
| `[UNKNOWN_REASON: FUTURE_CAPABILITY]` | 1,096 | No |
| `[DECIDED]` | 813 | No |
| `[FACT]` | 786 | No |
| `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]` | 722 | No |
| `[INFERRED]` | 130 | No |
| `[UNKNOWN_REASON: RESEARCH_REQUIRED]` | 10 | No |
| `[UNKNOWN_REASON: INTENTIONALLY_DEFERRED]` | 6 | **Yes** |

---

## 6. Relationship to the Bible's annotations

### GOV-STA-010: Bible markers are section-level and separate
*   **Rule**: `verity-bible/` annotates **sections** with `[FACT]`, `[DECIDED]`, `[INFERRED]` and `[PROPOSED]`. These share three names with the specification's values and mean the same thing, but apply to a constitutional statement rather than to a requirement. `[PROPOSED]` exists only in the Bible and marks a constitutional position not yet ratified; `[UNKNOWN_REASON: …]` exists only in the specification.
*   **Implementer action**: A Bible `[PROPOSED]` section is guidance, not law, and does not override a `[DECIDED]` requirement below it.
*   **Status**: `[DECIDED]`

---

## 7. Adding to the taxonomy

### GOV-STA-011: The value set is closed
*   **Rule**: The seven specification values and four Bible values above are exhaustive. Introducing a new `Status` value requires an ADR, because a value whose meaning is not defined here reproduces exactly the condition this document was written to end.
*   **Status**: `[DECIDED]`
