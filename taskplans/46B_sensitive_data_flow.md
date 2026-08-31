# Task Plan 46B — Sensitive Data Flow

This document is the sensitive-data flow companion to Task 46.

It must trace actual repository flows, not theoretical ones.

## Required Flow Shape

```text
User input
  -> API
  -> Domain
  -> Database
  -> Storage
  -> Logs
  -> External systems
```

## Inventory

### 1. Auth credentials

```text
User input -> sign-in form -> server action -> Supabase auth -> session cookie
```

* Enters: `src/app/sign-in/SignInForm.tsx` through `FormData`
* Persisted: Supabase session cookie, active-membership cookie
* Access: browser session and server-side auth boundary
* Logs: password is intentionally passed via `FormData` to avoid action-argument logging
* External boundary: Supabase Auth
* Deletion / retention: sign-out clears Supabase session; active-membership cookie is overwritten via `setActiveMembership`

### 2. Membership / tenant selection

```text
User input -> membership id -> server action -> signed cookie -> database re-check -> tenant scope
```

* Enters: `switchOrganization(membershipId)`
* Persisted: `verity_active_membership` signed cookie
* Access: current browser session; server re-validates membership against the authenticated user
* Logs: not intentionally logged
* External boundary: none
* Deletion / retention: cookie expires after 30 days or is replaced

### 3. Cron secret

```text
Environment -> `/api/scheduled` and `/api/metrics`
```

* Enters: `process.env.CRON_SECRET`
* Persisted: process memory only
* Access: scheduler route and metrics route in production
* Logs: not intentionally logged; unauthorized responses reveal only status shape
* External boundary: Vercel Cron / operator caller
* Deletion / retention: redeploy / environment change

### 4. Database connection credentials

```text
Environment -> runtimeConfig -> Prisma / Supabase / storage clients
```

* Enters: `DATABASE_URL`, `DIRECT_URL`, Supabase auth variables, storage variables
* Persisted: runtime memory only
* Access: server process
* Logs: config loader prints a structured invalid-config error; it does not print the secret values themselves
* External boundary: database, Supabase Auth, storage provider
* Deletion / retention: redeploy / environment rotation

### 5. File metadata

```text
User input -> reserveUpload / confirmUpload -> storedFile row -> storage key -> object store
```

* Enters: file name, MIME type, size, checksum, entity association
* Persisted: `storedFile` row, object-store key, object bytes in storage backend
* Access: tenant-scoped database rows and short-lived signed URLs
* Logs: no explicit logging in the inspected helper
* External boundary: Supabase Storage or S3 driver when configured
* Deletion / retention: delete is driver-backed; lifecycle policies are deployment-dependent

### 6. Audit payloads

```text
Mutation / security event -> audit helpers -> activity / security_audit_event / domain_event
```

* Enters: command runtime and security events
* Persisted: append-only audit tables
* Access: tenant-scoped readers, plus dedicated operator projections where defined
* Logs: values are redacted by field name before write for sensitive fields
* External boundary: none
* Deletion / retention: operational stream is intended to be retained indefinitely; security stream is compliance-retained

### 7. Scheduled work and workflow payloads

```text
Cron request -> scheduler -> tenant-scoped workflow execution -> database mutations
```

* Enters: `tenant`, `cadence`, and authenticated cron secret
* Persisted: workflow and domain tables, audit tables
* Access: scheduler route and internal tenant-scoped execution
* Logs: returned errors are intended for the scheduler only
* External boundary: scheduler caller
* Deletion / retention: by the underlying domain tables and audit model

### 8. Observability data

```text
Request/runtime -> metrics/logging helpers -> in-memory registry / logs / operator endpoints
```

* Enters: request context, timings, error fields
* Persisted: in-memory metrics only; logs are process output / sink dependent
* Access: operator or production-authenticated callers only for `/api/metrics`
* Logs: explicitly redacted in the observability layer where sensitive fields are present
* External boundary: metrics endpoint, external log sink if configured
* Deletion / retention: metrics reset on restart; logs depend on sink retention

## Notes

* I did not find evidence of raw credential values being intentionally written to audit tables in the inspected helpers.
* The dominant sensitive-data paths are auth/session, tenant selection, file metadata, cron secrets, and audit payloads.
