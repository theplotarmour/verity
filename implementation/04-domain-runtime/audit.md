# Purpose
Defines the operational and security audit systems in Verity.

# Scope
Covers the Operational Audit Stream (WorkOrderActivity), Security Audit Stream, lock policies, and DB constraints.

# Authority
- Spec EXE-AUD-001: Operational Audit Stream
- Spec EXE-AUD-002: Security Audit Stream
- Spec EXE-AUD-003: Lock Policy
- Bible V3: Append-only WorkOrderEvent log; SLA timers read event history directly.

# Prerequisites
- PostgreSQL & Prisma
- Command Pipeline

# Specification Requirements
- EXE-AUD-001: Operational Audit Stream (WorkOrderActivity) with infinite retention.
- EXE-AUD-002: Security Audit Stream (SecurityAuditEvent).
- EXE-AUD-003: Lock Policy (audit tables reject UPDATE/DELETE at DB constraint level).

# Approved Architecture
- **Storage**: PostgreSQL append-only tables (Authority: Bible V1).
- **Log Pattern**: Append-only WorkOrderEvent log (Authority: Bible V3).

# Implementation Contract
- **Audit Table Constraints (EXE-AUD-003)**: MUST implement DB-level triggers or rules that explicitly `RAISE EXCEPTION` on any `UPDATE` or `DELETE` statement.
- **Command Integration**: Every command execution MUST create an audit entry in the same transaction.
- **Operational Audit**: Captures entity changes, state transitions, and field modifications.
- **Security Audit**: Captures auth attempts, permission changes, config edits, role reassignments, API key generation.
- **Structure**: `auditId`, `entityType`, `entityId`, `action`, `previousState` (JSON), `newState` (JSON), `actorId`, `tenantId`, `timestamp`, `metadata`.
- **SLA Timers**: SLA logic MUST read directly from event history/audit log (Authority: Bible V3).

# Constraints & Invariants
- Audit records CANNOT be modified or deleted, ever.
- Infinite retention.

# Dependencies
- Depends on: DB migrations (for triggers), Command Pipeline.

# Failure Modes
- Failure to write audit log aborts the parent transaction.
- Malicious attempt to update audit log fails at DB level.

# Testing Requirements
- Assert that running an `UPDATE` or `DELETE` query on audit tables via raw SQL throws an error.
- Verify every command produces the expected audit entries.

# Conformance Checks
- DB schema inspection for trigger presence on audit tables.

# Traceability
- EXE-AUD-001, EXE-AUD-002, EXE-AUD-003

# Open Decisions
- None
