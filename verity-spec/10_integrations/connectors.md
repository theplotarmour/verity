# Verity Master Platform Specification

## 10_integrations/connectors.md

## Provenance
*   **Primary Sources**: `reference/n8n/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Pre-Built Automation Node Adapters Specification

This document details the `integrations` system specifications for `Connectors`.

### REQ-INTEGRATIONS-CONNECTORS-001
*   **Requirement**: The system utilizes `n8n` core patterns for `pre-built automation node adapters`.
*   **Status**: `[FACT]`

### REQ-INTEGRATIONS-CONNECTORS-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[FACT]`

### REQ-INTEGRATIONS-CONNECTORS-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[FACT]`
