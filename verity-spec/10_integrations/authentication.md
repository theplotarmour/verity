# Verity Master Platform Specification

## 10_integrations/authentication.md

## Provenance
*   **Primary Sources**: `reference/keycloak/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Sso And Oidc Federated Login Specification

This document details the `integrations` system specifications for `Authentication`.

### REQ-INTEGRATIONS-AUTHENTICATION-001
*   **Requirement**: The system utilizes `keycloak` core patterns for `SSO and OIDC federated login`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-INTEGRATIONS-AUTHENTICATION-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[INFERRED]`

### REQ-INTEGRATIONS-AUTHENTICATION-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
