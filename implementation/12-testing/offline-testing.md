# Purpose
Defines testing protocols for offline command execution, synchronization, and conflict resolution.

# Scope
OfflineCommand generation, sync payload simulation, evidence vs telemetry priority, idempotency.

# Authority
- Authority: Spec REQ-DATA-OFFLINE-001→003
- Authority: Spec REQ-DATA-SYNC-001→002

# Prerequisites
- Sync API endpoints and Conflict Resolution Engine.

# Specification Requirements
- WHAT MUST EXIST: Verifiable tests for offline data integrity, eventual consistency, and deterministic conflict resolution.

# Approved Architecture
- Vitest simulation of offline sync payloads.

# Implementation Contract
- Generate commands as if offline, submit via sync endpoint, verify results.
- Create conflicting changes (Server mutated State X, Client mutated State X offline), verify conflict policy applies correctly.
- Verify Evidence (photos, signatures) syncs before telemetry data.
- Idempotency: Replay identical commands and verify no duplicate entities or double-state transitions occur.

# Constraints & Invariants
- Idempotency keys must be respected universally.

# Dependencies
- Depends on Command Idempotency layer.

# Failure Modes
- Sync loops or duplicated data: Handled by rigorous idempotency testing.

# Testing Requirements
- Offline sync simulations must cover all mobile-enabled entities.

# Conformance Checks
- Ensure every offline-capable command has an idempotency test.

# Traceability
- REQ-DATA-OFFLINE-001→003, REQ-DATA-SYNC-001→002

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: CRDT vs Last-Write-Wins granularity for specific fields.
