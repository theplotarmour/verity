# Verity Master Platform Specification

## 01_platform/versioning.md

## Provenance
*   **Primary Sources**: None
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model - Events/State)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Independent Semantic Versioning

To ensure stability across deployments, the Platform Core and individual Capabilities are versioned independently using Semantic Versioning (SemVer 2.0.0).

---

## 2. Version Classifications

### PLA-VER-001: Core Platform Versioning
*   **Major (X.0.0)**: Breaking changes in core APIs, authorization engine, query sandboxing, sync protocol, or database-level RLS policies. Requires offline client updates and schema migrations.
*   **Minor (0.Y.0)**: Backward-compatible runtime features, new global hooks, or utility endpoints.
*   **Patch (0.0.Z)**: Internal bug fixes, performance optimizations, and security patches.
*   **Status**: `[FACT]`

### PLA-VER-002: Capability Versioning
*   **Major**: Breaking changes in a capability's entity schema (e.g., removing a required field) or state machine (e.g. deleting a transition state).
*   **Minor**: Added optional entities, non-required custom fields, or new optional actions.
*   **Patch**: Typo fixes in templates or localized copy.
*   **Status**: `[FACT]`

---

## 3. Deprecation and Upgrade Policies

### PLA-VER-003: Version Pinning
*   **Rule**: A Tenant System must pin the major version of every activated Capability (e.g., `verity.capability.scheduling: v2.x`). Upgrades to a new Major version require explicit administrative confirmation and execution of migration scripts.
*   **Status**: `[FACT]`

### PLA-VER-004: Zero-Downtime Minor Upgrades
*   **Rule**: Minor and Patch version upgrades of Capabilities must be backward-compatible, enabling deployment to production without requiring database schema lock-ups or client app restarts.
*   **Status**: `[FACT]`
