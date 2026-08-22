# Verity Master Platform Specification

## 01_platform/tenancy.md

## Provenance
*   **Primary Sources**: `reference/keycloak/concept-inventory.md` / `reference/minio/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_5_operations_security.md](file:///D:/Code/verity/verity-bible/volume_5_operations_security.md) (Section 1: Security & Tenancy Isolation)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Tenancy Isolation Principles

Verity enforces absolute data partitioning. Under no circumstances can data from Tenant A be visible, modifiable, or searchable by users associated with Tenant B.

---

## 2. Logical Data Partitioning

### PLA-TEN-001: Global Tenant Filter
*   **Description**: Every operational table and entity mapping (excluding global system lists like timezone codes or currency symbols) must be logically partitioned by a `tenant_id` foreign key.
*   **Status**: `[FACT]`

### PLA-TEN-002: Query Middleware Isolation
*   **Description**: Database access layers (ORMs, query builders, or raw driver routers) must automatically inject a `WHERE tenant_id = current_tenant_id` clause into all SELECT, UPDATE, and DELETE operations. User-supplied query parameters must never be trusted to supply the tenant scope.
*   **Status**: `[FACT]`

### PLA-TEN-003: Cross-Tenant FK Prohibition
*   **Description**: It is strictly forbidden for a relational database row in Tenant A to store a foreign key pointing to a record owned by Tenant B. If an entity needs to refer to shared data (like a global catalog item), it must copy the configuration or map it through a tenant-owned reference table.
*   **Status**: `[FACT]`

---

## 3. Storage Isolation Architecture

### PLA-TEN-004: Logical Sharing (Multi-Tenant Schema)
*   **Description**: Standard tenants share a single physical database instance, with partitioning enforced by row-level filters (Logical RLS).
*   **Status**: `[FACT]`

### PLA-TEN-005: Physical Sharding (Enterprise Separation)
*   **Description**: Large enterprise-tier tenants must be fully isolatable to dedicated PostgreSQL databases or schemas without modifying the underlying domain code models. The application router determines connection strings dynamically from the authenticated request headers.
*   **Status**: `[FACT]`
