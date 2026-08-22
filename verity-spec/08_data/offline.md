# Verity Master Platform Specification

## 08_data/offline.md

## Provenance
*   **Primary Sources**: `reference/activitywatch/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Offline Storage & Telemetry Policy

This document details the data specifications for local offline operations and telemetry synchronization.

### REQ-DATA-OFFLINE-001: Local Telemetry Buffer Limits
*   **Requirement**: Local mobile applications must enforce a strict storage limit for telemetry events (GPS logs). High-frequency location tracking (e.g. guard patrol waypoints) is buffered in local sqlite memory.
*   **Status**: `[DECIDED]`

### REQ-DATA-OFFLINE-002: Local Storage Exhaustion Behavior
*   **Requirement**: When the local storage limit is reached due to prolonged offline operations, the application must compress older telemetry logs rather than discarding them immediately. If storage remains critical, the system warns the worker to reconnect, preserving mandatory evidence (checkpoint scans, photos) over background location traces.
*   **Status**: `[DECIDED]`

### REQ-DATA-OFFLINE-003: Mandatory Evidence Protection
*   **Requirement**: Photo evidence and digital signature vectors are prioritized for local storage. In the event of storage constraint, the device blocks the deletion of unsynced evidence, giving it precedence over path coordinate history.
*   **Status**: `[DECIDED]`
