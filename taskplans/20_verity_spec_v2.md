# Task Plan 20 — Verity Spec v2

```text
STATUS: CANONICAL
VERSION: 2.0
AUTHORITY: ACTIVE
```

This specification translates the architectural principles of the Verity Bible v2 into measurable, testable technical requirements for the engineering team.

---

## 1. Infrastructure Requirements (VERITY-INFRA)

### VERITY-INFRA-001: Containerized Execution
*   **Description**: The production application stack MUST compile and execute inside standard Docker containers.
*   **Priority**: P0
*   **Rationale**: Guarantees self-hostable deployability on client VMs.
*   **Dependencies**: None.
*   **Acceptance Criteria**: Running `docker compose up` starts Postgres, Redis, and Next.js.
*   **Verification**: Run Docker Compose on a fresh VM and access the login dashboard.

### VERITY-INFRA-002: S3 Storage Wrapper
*   **Description**: File operations MUST use an S3-compatible client API instead of local filesystem routes.
*   **Priority**: P0
*   **Rationale**: Support swapping local SeaweedFS containers for AWS S3 with no code modifications.
*   **Dependencies**: SeaweedFS or MinIO container in Compose.
*   **Acceptance Criteria**: Uploading a PDF invoice writes to the configured S3 bucket.
*   **Verification**: Run upload test and inspect bucket objects via S3 console.

### VERITY-INFRA-003: Postgres Migration Engine
*   **Description**: Database schema updates MUST execute automatically via Prisma migrations on container start.
*   **Priority**: P0
*   **Acceptance Criteria**: Booting the web container runs `prisma db push` or runs migrations before starting Next.js.

---

## 2. Authentication & Security (VERITY-SEC)

### VERITY-SEC-001: OIDC SSO Session Verification
*   **Description**: User authorization tokens MUST map to JSON Web Tokens (JWT) cryptographically signed by an external Keycloak server.
*   **Priority**: P0
*   **Acceptance Criteria**: Verity verifies OIDC signatures on request headers and decodes roles dynamically.

### VERITY-SEC-002: Dynamic Details Validation
*   **Description**: Dynamic fields stored in `additionalDetails` JSONB columns MUST be parsed and validated using Zod models before DB write.
*   **Priority**: P0

---

## 3. Data & Ledger Requirements (VERITY-DATA)

### VERITY-DATA-001: Immutable Stock Ledger
*   **Description**: Inventory updates MUST write a new line to `StockLedgerEntry` rather than editing the base product count.
*   **Priority**: P0
*   **Acceptance Criteria**: All CRUD APIs targeting product stock balances append ledger entries.
*   **Verification**: Execute inventory transfer and verify database record counts.

### VERITY-DATA-002: BigInt Date-Time Storage
*   **Description**: All timestamp columns in Prisma schemas MUST be defined as `BigInt` storing UTC millisecond values.
*   **Priority**: P0
