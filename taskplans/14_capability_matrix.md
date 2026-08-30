# Task Plan 14 — Capability Matrix

This matrix synthesizes research across the 12 frozen repository audits, outlining how core enterprise capabilities are implemented, their tradeoffs, and the specific strategic directives (ADOPT, ADAPT, INSPIRE, EXTERNALIZE, DEFER, REJECT) for Verity.

---

## 1. Evidence Classification Key
To prevent assumptions from being treated as established architectural facts, all entries use the following prefixes:
*   `[OBSERVED]`: Directly verified in source code or project documentation.
*   `[INFERRED]`: Architectural conclusion deduced from code patterns.
*   `[RECOMMENDATION]`: Specific proposal for Verity's vNext design.
*   `[UNKNOWN]`: Requires further verification or testing.

---

## 2. Enterprise Capability Matrix

| Capability | Reference Implementations | Key Findings & Tradeoffs | Verity Strategic Directive |
|---|---|---|---|
| **Identity & SSO** | **Keycloak** (Strong), **Payload** (Medium) | * `[OBSERVED]`: Keycloak uses dedicated OIDC/SAML providers.<br>* `[INFERRED]`: Storing credentials locally inside the app DB is an enterprise anti-pattern.<br>* `[RECOMMENDATION]`: Delegate login flows to external enterprise identity providers (Keycloak/Azure AD). | **EXTERNALIZE** (Use NextAuth / OIDC adapters) |
| **RBAC & Authorization** | **Payload** (Strong), **Twenty** (Strong), **DIGIT** (Very Strong) | * `[OBSERVED]`: Payload supports document-level and field-level permissions.<br>* `[INFERRED]`: Rigid role tables fail at scale. Permissions must map dynamically to actions/scopes.<br>* `[RECOMMENDATION]`: Implement scope-aware permission checks at the API router handler layer. | **ADAPT** (Redesign for spatial/site hierarchy scope) |
| **Multi-Tenancy** | **DIGIT** (Very Strong), **Twenty** (Strong), **Plane** (Strong) | * `[OBSERVED]`: DIGIT partitions data using a spatial `tenantId` (e.g. `pg.amritsar`) in every table.<br>* `[INFERRED]`: Database schema-per-tenant adds operational maintenance overhead. Shared database with logical Row Level Security (RLS) is optimal for Docker. | **ADOPT** (Logical partition via tenant_id column + RLS) |
| **Workflow State Engine** | **DIGIT** (Very Strong), **Plane** (Strong), **Temporal** (Very Strong) | * `[OBSERVED]`: DIGIT offloads state transitions to a centralized workflow service.<br>* `[RECOMMENDATION]`: Do not embed order status changes in individual database routes. Manage them through a centralized config engine. | **ADAPT** (Central state transition config module) |
| **Audit Log Provenance** | **DIGIT** (Strong), **ERPNext** (Strong) | * `[OBSERVED]`: DIGIT uses standard metadata fields on all tables.<br>* `[INFERRED]`: Logging diffs to a text file is unsearchable. Changes must write to a structured, queryable table.<br>* `[RECOMMENDATION]`: Maintain an append-only `AuditLog` table tracking user, change type, and payload diffs. | **ADOPT** (Append-only AuditLog database table) |
| **Document Storage** | **SeaweedFS** (Strong), **Payload** (Strong) | * `[OBSERVED]`: Payload and SeaweedFS use S3 API compatibility layers.<br>* `[INFERRED]`: Storing file binaries directly in PostgreSQL or saving physical local file paths is not portable.<br>* `[RECOMMENDATION]`: Standardize file operations via an S3 client wrapper, saving a `fileId` UUID in database rows. | **ADOPT** (S3-compliant SDK wrapper interface) |
| **Analytical Reporting** | **OpenSearch** (Strong), **ERPNext** (Strong) | * `[OBSERVED]`: OpenSearch uses Lucene for search indices.<br>* `[INFERRED]`: Hitting live transactional tables for analytical widgets (like monthly revenue charts) causes locking.<br>* `[RECOMMENDATION]`: Build Postgres Materialized Views updated out-of-band for dashboards. | **ADAPT** (Materialized Views + Redis refresh jobs) |
| **Task Scheduling** | **Cal.diy** (Strong), **Formbricks** (Strong) | * `[OBSERVED]`: Cal.diy schedules events in UTC and computes local timezone offsets dynamically.<br>* `[INFERRED]`: Running local cron threads inside Next.js API route handlers blocks request cycles.<br>* `[RECOMMENDATION]`: Offload email and alert schedules to a Redis-backed queue worker. | **ADAPT** (Redis queues + UTC storage offsets) |
| **Database Portability** | **Payload** (Strong), **Plane** (Strong) | * `[OBSERVED]`: Payload uses Drizzle to support Postgres/SQLite/MongoDB.<br>* `[INFERRED]`: Multi-DB support dilutes query optimization. Enforce a single target database.<br>* `[RECOMMENDATION]`: Standardize strictly on PostgreSQL, but avoid Vercel-specific Supabase Cloud dependencies. | **REJECT** (Multi-DB adapters); **ADOPT** (Raw PostgreSQL self-hosting) |

---

## 3. Justification of Directives

1.  **Why EXTERNALIZE Identity**: Large enterprise clients (PSUs, airports) already maintain active directories (AD, LDAP, Keycloak). Forcing them to create accounts inside a separate database table is a security block. Delegating auth to Keycloak solves authentication, leaving Verity to focus only on authorization.
2.  **Why REJECT Multi-DB Support**: Supporting Postgres, SQLite, and MongoDB (like Payload does) requires writing lowest-common-denominator code that prevents utilizing PostgreSQL-specific performance features (like JSONB indexings and trigram search extensions).
3.  **Why ADOPT Submit/Lock Immutable Ledger**: ERPNext proved that mutating transactional balances (like updating product inventory amounts directly) leads to audit failures. Representing stock movements as immutable delta records is a robust, production-grade pattern.
