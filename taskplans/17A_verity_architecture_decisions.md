# Task Plan 17A — Verity Architecture Decisions Register

This document serves as the permanent Architecture Decision Register (ADR) for Verity Enterprise, recording technical contracts, considered options, research evidence, and trade-offs.

---

## V2-ADR-001: Portable Deployment Topology
*   **Context**: Verity must run on-premise in client datacenters that may block public cloud connections.
*   **Options Considered**:
    1.  Maintain current Next.js Cloud-only architecture (Vercel + Supabase).
    2.  Migrate entire stack to a multi-service Java microservices setup (DIGIT model).
    3.  Containerize the existing monorepo backend (Next.js + Postgres + Redis) using Docker.
*   **Research Evidence**: Plane and Formbricks deploy as single Docker Compose stacks, separating web, database, and caching.
*   **Decision**: **Containerize Monorepo (Option 3)**.
*   **Why**: Minimizes hosting overhead, runs on small single-VM nodes, and keeps the code unified in TypeScript.
*   **Trade-offs**: Next.js must compile pages inside the container, slightly increasing build times.
*   **Consequences**: The codebase is decoupled from Vercel edge functions.
*   **Reversal Conditions**: If client workloads demand massive cluster scaling that single VMs cannot handle, transition to Kubernetes.

---

## V2-ADR-002: Relational Database Standardization
*   **Context**: Verity must support transactional integrity for orders and inventory ledger logs.
*   **Options Considered**:
    1.  Support PostgreSQL, SQLite, and MongoDB via multiple database adapters (Payload model).
    2.  Standardize strictly on PostgreSQL.
*   **Research Evidence**: Twenty and DIGIT enforce PostgreSQL to utilize schema optimization and JSONB.
*   **Decision**: **Enforce PostgreSQL (Option 2)**.
*   **Why**: Prevents writing lowest-common-denominator code; allows leveraging raw SQL indexing, Materialized Views, and pg_trgm search.
*   **Trade-offs**: Cannot deploy Verity on lightweight SQLite instances.
*   **Consequences**: Prisma schema definitions will target PostgreSQL features exclusively.
*   **Reversal Conditions**: None.

---

## V2-ADR-003: Federated Identity Boundary
*   **Context**: Corporate clients manage credentials using Active Directory or Keycloak.
*   **Options Considered**:
    1.  Build an internal LDAP syncing system.
    2.  Integrate Keycloak or other external IDPs via OpenID Connect (OIDC) token validation.
*   **Research Evidence**: Keycloak is the industry standard for IAM.
*   **Decision**: **OIDC JWT Integration (Option 2)**.
*   **Why**: Keeps password security outside of Verity's code.
*   **Trade-offs**: Requires setting up an external Keycloak container or cloud identity account.
*   **Consequences**: Verity API handles session verification by decoding cryptographically signed OIDC tokens.
*   **Reversal Conditions**: None.

---

## V2-ADR-004: Scoped RBAC Model
*   **Context**: Users must be restricted by spatial and branch permissions.
*   **Options Considered**:
    1.  Enforce access checks inside individual route files.
    2.  Implement scope-aware Prisma middleware to intercept queries.
*   **Decision**: **Scope-Aware Prisma Interceptors (Option 2)**.
*   **Why**: Guarantees that query filters are appended automatically, preventing developer coding oversights.
*   **Trade-offs**: Adds complexity to Prisma middleware setups.
*   **Consequences**: Multi-tenancy and site limits are enforced globally at the database client level.

---

## V2-ADR-005: Decoupled Workflow State Machine
*   **Context**: Order and delivery statuses must follow strict state transition rules.
*   **Options Considered**:
    1.  Update status values directly via SQL mutations.
    2.  Route all status updates through a validation state machine engine.
*   **Decision**: **Central State Machine Engine (Option 2)**.
*   **Why**: Prevents users from bypassing approval steps (e.g. moving an order from `draft` directly to `dispatched`).
*   **Trade-offs**: Requires querying active workflow limits before running updates.

---

## V2-ADR-006: S3-Compatible Object Storage
*   **Context**: Invoices, delivery logs, and photos must be stored scalably.
*   **Options Considered**:
    1.  Store file binaries in PostgreSQL tables.
    2.  Integrate a generic S3 client API to write to MinIO, SeaweedFS, or AWS S3.
*   **Decision**: **S3 Client API (Option 2)**.
*   **Why**: Perfect storage portability.
*   **Trade-offs**: Requires running an S3-compliant container (like SeaweedFS) in self-hosted modes.

---

## V2-ADR-007: Low-Infra Search Indexing
*   **Context**: Dashboard searches across orders and clients must execute fast.
*   **Options Considered**:
    1.  Deploy Elasticsearch/OpenSearch containers.
    2.  Utilize PostgreSQL `pg_trgm` trigram indexes.
*   **Decision**: **PostgreSQL pg_trgm (Option 2)**.
*   **Why**: Eliminates the heavy memory overhead of running Elasticsearch on small customer VMs.
*   **Trade-offs**: Fails to provide complex search metrics or vector search features.

---

## V2-ADR-008: Async Processing Queue
*   **Context**: Task queues (emails, PDF builds) must run without delaying HTTP responses.
*   **Options Considered**:
    1.  Run cron jobs inside Next.js thread loops.
    2.  Integrate BullMQ on Redis.
*   **Decision**: **Redis-backed BullMQ (Option 2)**.
*   **Why**: Standard, robust job queueing that supports automatic retries and logs.

---

## V2-ADR-009: Logical Tenant Isolation
*   **Context**: Standardizing multi-tenancy for cloud and dedicated editions.
*   **Options Considered**:
    1.  Database-per-tenant (high isolation, high cost).
    2.  Shared database with a tenant column (logical isolation).
*   **Decision**: **Shared Database logical isolation (Option 2)**.
*   **Why**: Allows upgrading schema versions for thousands of clients in a single step.

---

## V2-ADR-010: Modular Vertical Packs
*   **Context**: Custom logic for Logistics or Government must not contaminate the platform core.
*   **Options Considered**:
    1.  Fork the repo for every client.
    2.  Write plugins that inject dynamic fields and routes at runtime.
*   **Decision**: **Modular Pack folders (Option 2)**.
*   **Why**: Code remains in a single repo but isolated in package folders, allowing vertical capabilities to be toggled via config.
