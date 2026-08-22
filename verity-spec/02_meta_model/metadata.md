# Verity Master Platform Specification

## 02_meta_model/metadata.md

## Provenance
*   **Primary Sources**: `reference/temporal/verity-implications.md` / `reference/metabase/verity-implications.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model - Action/Event), [verity-bible/volume_3_execution_workflows.md](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md) (Section 4: Concurrency, Execution & Conflict Rules)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. CQRS Primitive Decoupling

To support offline client synchronization, low-latency reporting, and scale the automation engine, Verity separates data mutations from data queries using the Command Query Responsibility Segregation (CQRS) architectural model.

```text
               CLIENT ACTION (Input Payload)
                     │
                     ├────────────────────────┐
                     ▼                        ▼
                  COMMAND                  QUERY
            (Mutates State)          (Reads Active DB)
                     │                        ▲
                     ▼                        │
               BUSINESS EVENT                 │
            (Published on Bus)                │
                     │                        │
                     ▼                        │
                 PROJECTION ──────────────────┘
         (Aggregates Read-Model)
```

---

## 2. Platform Primitives

### MET-MET-001: Commands (Write Operations)
*   **Description**: The exclusive mechanism to modify database state or trigger a state machine transition.
*   **Operational Properties**:
    *   Initiated by client requests.
    *   Validates input schemas, checks permissions, verifies preconditions, and commits mutations in a single transaction.
    *   Always emits a Business Event on success.
    *   Returns transaction outcome (success | failure).
*   **Status**: `[UNKNOWN]`

### MET-MET-002: Queries (Read Operations)
*   **Description**: The read pipeline for fetching active state data.
*   **Operational Properties**:
    *   Bypasses validation rules, constraints, and business lifecycle hooks.
    *   Must enforce tenant-isolation and row-scoping filters at the AST query sandboxing layer (as defined in `01_platform/authorization.md`).
    *   Guaranteed to be side-effect free (cannot modify database rows).
*   **Status**: `[UNKNOWN]`

### MET-MET-003: Projections (Read-Oriented Representations)
*   **Description**: Derived tables optimized for high-performance reading and analytics (e.g. a technician workload projection, search indexes, or SLA breach summary reports).
*   **Operational Properties**:
    *   Constructed asynchronously by subscribing to and processing Business Events from the Event Bus.
    *   Can be out of sync temporarily (eventual consistency), but must resolve quickly to support operational dispatch screens.
*   **Status**: `[UNKNOWN]`
