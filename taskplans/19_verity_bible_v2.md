# Task Plan 19 — Verity Bible v2

```text
STATUS: CANONICAL
VERSION: 2.0
AUTHORITY: ACTIVE
```

This document defines the permanent architectural rules, naming conventions, and coding guidelines for the Verity Enterprise codebase. All future development, modifications, and AI-agent refactors must adhere strictly to these laws.

---

## 1. Constitutional Architectural Laws

*   **BIBLE-001: Cloud Platform Agnosticism**
    The application core and database models MUST remain independent of specific cloud platform services. Decouple all runtime code from Supabase Cloud APIs and Vercel edge functions.
*   **BIBLE-002: Relational Persistence Canonicalization**
    PostgreSQL is the single, canonical database engine for persistent relational data. Avoid writing database adapters for SQLite, MongoDB, or external search clusters in core modules.
*   **BIBLE-003: Federated Identity Boundary**
    Verity MUST NOT store user passwords. Single sign-on and credential management are external concerns delegated to OIDC providers (Keycloak/Azure AD).
*   **BIBLE-004: Logical Tenant Separation**
    Multi-tenancy MUST be enforced globally via a non-nullable `tenantId` parameter on database tables. Queries must pass through tenant-scoping filters at the Prisma middleware layer.
*   **BIBLE-005: Material Business History Integrity**
    Material business history MUST NOT be silently mutated. Operational records representing stock movements or general ledger financial entries MUST be stored as append-only transaction logs. Direct updates to balances are prohibited.
*   **BIBLE-006: Vertical Pack Dependency Isolation**
    Domain-specific Vertical Packs (Logistics, Construction, Government) MUST NOT inject dependencies into the Platform Core. Keep Core schemas and modules clean of vertical code.
*   **BIBLE-007: Object Storage Indirection**
    Application records MUST NOT store file binary contents or physical OS disk paths. Refer to attachments using standard S3 client wrappers, saving only the generated `fileId` UUID in database tables.
*   **BIBLE-008: Asynchronous Integration Adapters**
    External API integrations (GST portal, treasury systems, payment gates) MUST be isolated behind dedicated adapter interfaces. Slow network requests MUST be offloaded to BullMQ queues on Redis.
*   **BIBLE-009: Decoupled Workflow Transitions**
    Entity status changes (orders, invoices) MUST NOT run directly via REST update APIs. Status transitions MUST pass validation checks inside the centralized `WorkflowEngine`.
*   **BIBLE-010: Configuration over Customization**
    Do not alter database schemas or write custom code for customer-specific properties. Customize schemas using standard `additionalDetails` JSONB columns.

---

## 2. Naming Conventions & Code Layout Laws
*   *Database Tables*: Use singular camelCase for Prisma models (e.g. `StockLedgerEntry`), mapping to snake_case table names in PostgreSQL (e.g. `stock_ledger_entry`).
*   *Date-Times*: Store date parameters as UTC epoch-millisecond `BigInt` fields. Conversions to local timezone strings must execute exclusively at the frontend rendering layer.
*   *Module Isolation*: Place Platform Core files in `src/server/core/` and Vertical Pack modules in `src/server/verticals/`.
