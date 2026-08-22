# Verity Master Platform Specification

## user/02-domain-model.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/user.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Logical domain primitives definition.

This document details the `user` capability specs for the `02 Domain Model` contract.

### REQ-USER-02DOMAINMODEL-001
*   **Requirement**: The capability manages `User, Session` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/base/models/res_users.py`

### REQ-USER-02DOMAINMODEL-002
*   **Requirement**: State changes are constrained to enums: `ACTIVE, SUSPENDED`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-USER-02DOMAINMODEL-003
*   **Requirement**: Mutations are restricted to actions: `create_user, authenticate, invalidate_session`.
*   **Status**: `[UNKNOWN_REASON: SOURCE_UNAVAILABLE]`

### REQ-USER-02DOMAINMODEL-004
*   **Requirement**: Offline sync conflict class is `SERVER_AUTHORITATIVE`.
*   **Status**: `[DECIDED]`
