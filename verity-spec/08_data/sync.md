# Verity Master Platform Specification

## 08_data/sync.md

## Provenance
*   **Primary Sources**: `reference/activitywatch/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Synchronization and Event Merging

This document details the specifications for synchronization from offline clients to the central database.

### REQ-DATA-SYNC-001: Telemetry Compression & Aggregation
*   **Requirement**: Telemetry coordinate feeds must be aggregated locally (e.g. merging stationary heartbeats) before synchronizing to save network bandwidth and storage overhead.
*   **Status**: `[DECIDED]`

### REQ-DATA-SYNC-002: Context Verification on Sync
*   **Requirement**: The sync gateway validates the user session and tenancy boundary on every incoming upload payload. Unsynced payloads containing coordinates outside the allowed tenant organization boundary are rejected.
*   **Status**: `[DECIDED]`
