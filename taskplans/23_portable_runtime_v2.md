# Task Plan 23 — Verity Portable Runtime v2 (P0)

This implementation plan orchestrates the engineering work required to decouple the existing Verity application from Vercel and Supabase Cloud services, rendering it fully runnable in a self-hosted Docker Compose container environment.

---

## 1. Objective & Scope
*   **Core Objective**: Make Verity portable. A developer or system administrator must be able to boot the entire stack (web, database, queue, storage) on a fresh VM with a single `docker compose up` command.
*   **Constraint**: No major business domain rewrites. Maintain complete functional parity and support the existing cloud deployment path.

---

## 2. Workstream Definitions

*   **P0-01: Repository Baseline**: Create the baseline document (`24_current_runtime_baseline.md`) detailing all Vercel/Supabase imports, variables, and API calls.
*   **P0-02: Runtime Configuration**: Abstract hard-coded connection values to environment-injected variables.
*   **P0-03: Containerization**: Write the Next.js production `Dockerfile` and initial `docker-compose.yml`.
*   **P0-04: PostgreSQL Portability**: Establish a clean local database container and verify trigger/migration compatibilities.
*   **P0-05: Object Storage Abstraction**: Write a generic S3-compatible client wrapper interface, replacing direct Supabase storage calls.
*   **P0-06: Authentication Decoupling**: Isolate Supabase Auth calls behind an adapter, preparing the codebase for Keycloak/OIDC integration.
*   **P0-07: Background Worker Abstraction**: Decouple task schedulers and background queues from Vercel crons.
*   **P0-08: Health & Readiness**: Implement `/api/health` and `/api/ready` endpoints.
*   **P0-09: Database Migration Discipline**: Automate Prisma migrations on container startup.
*   **P0-10: Backup / Restore Verification**: Script standard pg_dump backup utilities.
*   **P0-11: Local Enterprise Reference Deployment**: Set up the `deploy/` directory structure with configuration templates.
*   **P0-12: Regression / Acceptance Test**: Execute tests to guarantee that no existing features (ordering, logging, seating) are broken.
