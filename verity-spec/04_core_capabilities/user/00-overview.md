# Verity Master Platform Specification

## user/00-overview.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/user.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Capability Summary overview and registration key.

This document details the `user` capability specs for the `00 Overview` contract.

### REQ-USER-00OVERVIEW-001
*   **Requirement**: The capability manages `User, Session` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_users.py`

### REQ-USER-00OVERVIEW-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, SUSPENDED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-USER-00OVERVIEW-003
*   **Requirement**: Mutations are restricted to actions: `create_user, authenticate, invalidate_session`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-USER-00OVERVIEW-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
