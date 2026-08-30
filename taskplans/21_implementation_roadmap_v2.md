# Task Plan 21 — Implementation Roadmap v2

This roadmap outlines the implementation milestones, workstream dependencies, and execution phases to migrate Verity to the Enterprise v2 target architecture.

---

## 1. Workstream Sequencing Matrix

```
  [ FOUNDATION ]
        │
        ├── P0: Containerization & Portability (VM Ready)
        │     ├── Docker Compose packaging (Postgres + Redis + Web)
        │     ├── S3 SDK storage adapter refactoring
        │     ├── Decoupling Supabase Auth client references
        │     └── Schema JSONB fields & BigInt date refactoring
        │
        ├── P1: Core Enterprise Capabilities (SSO & Workflows)
        │     ├── NextAuth Keycloak OIDC integration
        │     ├── Decoupled state transition workflow engine
        │     └── BullMQ background queue worker setup
        │
        ├── P2: Vertical Scale (Packs Deployment)
        │     └── Logistics, Construction, and PSU Modules mapping
        │
        └── P3: Optimization (Analytics & Materialized Views)
              └── Dashboards migration to materialized views
```

---

## 2. P0 Foundation Workstream Specifications

### Docker Containerization (P0-01)
*   **Goal**: Package the Next.js monorepo into Docker containers.
*   **Current State**: Running locally via raw `npm run dev`.
*   **Target State**: Assembly of Postgres, Redis, and Web servers via a single `docker-compose.yml`.
*   **Files Affected**: `package.json`, `next.config.js`, creation of `Dockerfile`, `.dockerignore`, `docker-compose.yml`.
*   **Acceptance Criteria**: Running `docker compose up --build` compiles Next.js successfully and starts all containers.
*   **Rollback Strategy**: Maintain local `npm run dev` support.

### S3 Storage Adapter (P0-02)
*   **Goal**: Decouple file storage from Supabase buckets.
*   **Current State**: Files uploaded using Supabase client libraries.
*   **Target State**: standard S3 upload helpers via `@aws-sdk/client-s3` targeting local MinIO or SeaweedFS.
*   **Files Affected**: `src/server/storage/` module files.
*   **Acceptance Criteria**: Uploading invoices, photos, and signatures successfully routes binaries to S3 buckets.

### Supabase Auth Decoupling (P0-03)
*   **Goal**: Enable self-hosted credential sessions.
*   **Current State**: Hardlocked to Supabase database user profiles.
*   **Target State**: NextAuth OIDC adapter validating incoming cryptographically signed tokens.
*   **Files Affected**: Auth layout, NextAuth middleware files.
*   **Acceptance Criteria**: Validating tokens without calling Supabase authentication servers.
