# Task Plan 18 — Combined Verity Enterprise PRD

This Product Requirements Document (PRD) defines the target scope, architecture, and functional specifications of Verity Enterprise as a portable, self-hostable operations platform.

---

## 1. Executive Summary
Verity Enterprise transitions from a Cloud-locked SaaS app into a containerized, self-hostable, and modular operations platform. It allows implementation teams to deploy custom operational panels for high-ticket clients (PSUs, private airports, logistics networks) using a single, unified codebase.

## 2. Product Vision
To serve as the definitive "Open Source Systems Integration" engine for India. Verity provides a rock-solid, secure, and auditable Platform Core while isolating industry-specific logic into clean, configurable Vertical Packs.

## 3. Product Principles
*   **Decoupled Portability**: The platform must run on any infrastructure (on-prem, private cloud, or VM) with zero third-party cloud lock-in.
*   **Audit-First Ledger**: All stock movements and critical state transactions are recorded as append-only ledger entries; direct mutations to balances are forbidden.
*   **Separation of Core vs. Domain**: Core infrastructure (auth, RBAC, workspaces, notifications) must remain clean; domain logic resides exclusively in Vertical modules.

## 4. Target Customer Segments
*   **MSME (Cloud)**: Small traders renting space on Verity's shared multi-tenant SaaS cloud.
*   **Mid-Market (Dedicated)**: Private firms requesting dedicated, single-tenant hosting.
*   **Enterprise / PSU (On-Prem)**: Large companies, public sectors, and airports demanding deployment inside private intranets.

## 5. Deployment Modes
*   **Verity Cloud**: Standard Next.js server hosting, utilizing Supabase PostgreSQL and S3-compatible cloud storage.
*   **Verity Dedicated**: Isolated VM container deployment.
*   **Verity Enterprise**: Local Docker Compose or Kubernetes Helm charts deployed on the client's internal servers.

## 6. Enterprise Product Model
Verity Enterprise separates static platform features (Platform Core) from dynamic operations (Domain Engine).

---

## 7. Verity Platform Core

### 7.1 Identity
*   *Requirement*: Externalize credentials database.
*   *Evidence*: Keycloak patterns.
*   *Decision*: ADR-003 (Federated Identity).
*   *Status*: MANDATORY.

### 7.2 Organizations
*   *Requirement*: Nested hierarchical structures (HQ -> region -> depot).
*   *Evidence*: DIGIT Works / Twenty models.
*   *Decision*: ADR-004.
*   *Status*: MANDATORY.

### 7.3 Users
*   *Requirement*: Relational user registry linked to external SSO tokens.
*   *Status*: MANDATORY.

### 7.4 Roles & Permissions
*   *Requirement*: Scope-aware authorization checks on records and fields.
*   *Evidence*: Payload CMS access model.
*   *Status*: MANDATORY.

### 7.5 Multi-tenancy
*   *Requirement*: Logical tenancy isolation via Postgres column-level partitioning.
*   *Evidence*: DIGIT spatial `tenantId` / Twenty workspaces.
*   *Decision*: ADR-009.
*   *Status*: MANDATORY.

### 7.6 Audit
*   *Requirement*: Central append-only database logs tracking modifications.
*   *Evidence*: DIGIT Works audits / ERPNext transaction history.
*   *Status*: MANDATORY.

### 7.7 Documents
*   *Requirement*: Abstract file storage referencing standard S3 buckets.
*   *Evidence*: SeaweedFS / Payload cloud storage.
*   *Decision*: ADR-006.
*   *Status*: MANDATORY.

### 7.8 Notifications
*   *Requirement*: Asynchronous notification dispatch via queues.
*   *Status*: MANDATORY.

### 7.9 Forms
*   *Requirement*: Configuration-driven checklist form builder for field logs.
*   *Evidence*: Formbricks JSON template structures.
*   *Status*: MANDATORY.

### 7.10 Search
*   *Requirement*: Native database lookups using Postgres indexes.
*   *Evidence*: Twenty pg_trgm searches.
*   *Decision*: ADR-007.
*   *Status*: MANDATORY.

### 7.11 Reporting
*   *Requirement*: Asynchronously compiled materialized views for dashboards.
*   *Status*: MANDATORY.

### 7.12 Workflow
*   *Requirement*: Centralized state machines verifying permissions before status edits.
*   *Evidence*: DIGIT Works state workflow.
*   *Decision*: ADR-005.
*   *Status*: MANDATORY.

### 7.13 Automation
*   *Requirement*: Asynchronous job handlers executing background updates.
*   *Evidence*: Twenty BullMQ setup.
*   *Decision*: ADR-008.
*   *Status*: MANDATORY.

### 7.14 Integrations
*   *Requirement*: Generic integration adapters keeping domain code decoupled from third-party APIs.
*   *Status*: MANDATORY.

### 7.15 APIs
*   *Requirement*: Automatic JSON REST endpoint mappings for resources.
*   *Status*: MANDATORY.

### 7.16 Configuration
*   *Requirement*: Application settings (tax, system units) configurable in DB.
*   *Status*: MANDATORY.

### 7.17 Extensibility
*   *Requirement*: Custom parameters stored in `additionalDetails` JSONB columns.
*   *Evidence*: DIGIT Works schema patterns.
*   *Decision*: ADR-003.
*   *Status*: MANDATORY.

---

## 8. Domain Engine
The Domain Engine translates platform core configurations into actual inventory transactions, purchase entries, and sales logs. It enforces transactional integrity through Prisma database events.

---

## 9. Vertical Packs

### Manufacturing
*   BOM (Bill of Materials) registries, production work orders, and Quality Control (QC) check forms.

### Construction
*   Site material registers, BOQ logs, subcontractor work checklists, and site photo evidence uploads.

### Logistics
*   Transporter registries, Lorry Receipt (LR) tracking, vehicle dispatch queues, and transit status trackers.

### Professional Services
*   Staff timesheets, client contract scopes, and service progress approvals.

### Government / PSU
*   Department registries, municipal works case routing, and citizen feedback portals.

---

## 10. Data Architecture
*   Standardized on PostgreSQL database schemas.
*   Prisma serves as the object-relational mapping (ORM) client.
*   Date-times are stored strictly as `BigInt` UTC milliseconds.

## 11. Application Architecture
*   Next.js monorepo containing both API routes (backend) and React Server Components (frontend UI).

## 12. Infrastructure Architecture
*   Includes three core Docker services: Web (Next.js), Database (Postgres), and Cache (Redis).

## 13. Enterprise Deployment Architecture
*   Packaged as a single, multi-container Docker Compose file. Supports Helm deployments.

## 14. Security Architecture
*   OIDC authentication validation, CSRF protections on routes, column-level credential encryption, and logical database RLS filters.

## 15. Backup & Disaster Recovery
*   Standard pg_dump schedules backing up database structures to S3 storage buckets.

## 16. Migration & Upgrade Architecture
*   Migrations are versioned and executed automatically by the Docker entrypoint script on server startup.

## 17. Observability
*   Prometheus metrics endpoint (`/api/metrics`) tracking server request times and database transaction rates.

## 18. Administration
*   Consolidated admin console allowing operators to add locations, manage roles, and review audit logs.

## 19. Configuration vs Customization
*   *Configuration*: Toggling settings (tax rates, column orders) via database records.
*   *Customization*: Writing vertical pack modules inside isolated directories.

## 20. Product Boundaries
*   **Verity Cloud**: Standard database operations, utilizing shared multi-tenant resources.
*   **Verity Enterprise**: Complete single-tenant isolation running in the client's secure network.

## 21. Enterprise Implementation Model
The client provides server hardware, directory services (LDAP/AD), and SMTP endpoints. Verity's implementation team configures the vertical pack, sets up organization structures, and runs data imports.

## 22. Commercial Packaging
Billed as an initial deployment license (Core + selected Vertical Pack) plus a recurring Annual Maintenance Contract (AMC) covering security updates.

## 23. Non-Goals / Things We Will NOT Build
*   **Identity Registry**: User management stays in Keycloak/Azure AD.
*   **Object Storage Engine**: Binary storage is delegated to SeaweedFS/MinIO.
*   **Search Engine**: Searching stays in PostgreSQL via pg_trgm.

## 24. Functional Requirements
*   *REQ-F-01*: System MUST support OIDC single sign-on.
*   *REQ-F-02*: Stock ledger entries MUST be append-only.

## 25. Non-Functional Requirements
*   *REQ-NF-01*: System MUST boot using less than 1GB RAM in single-VM mode.
*   *REQ-NF-02*: Next.js API routes MUST respond in under 200ms for standard CRUD actions.

## 26. Acceptance Criteria
*   *AC-01*: Running `docker compose up` starts the database, cache, and web app.
*   *AC-02*: Authenticated user roles correctly scope database query parameters.

## 27. Future Roadmap
*   Phase 1: Implement PostgreSQL and S3 client portability (P0).
*   Phase 2: Build OIDC Keycloak authentication modules (P1).
*   Phase 3: Package Docker Compose deployment scripts.
