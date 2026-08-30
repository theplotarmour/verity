# Verity Enterprise — Architecture & Portability Roadmap

This document outlines the architectural changes required to transition Verity from a Cloud-only (Vercel + Supabase) platform into a portable, self-hostable system that can run inside any corporate or government data center.

---

## 1. Portability Abstraction Layer
To enable on-premise deployments, we must abstract convenience services (Supabase & Vercel) into self-hostable equivalents that run inside standard Linux/Docker environments.

| Supabase/Vercel Dependency | Self-Hostable Enterprise Equivalent |
|---|---|
| **Supabase PostgreSQL** | Standard PostgreSQL (with migration state) |
| **Supabase Auth** | Keycloak / Open-source IAM (LDAP/OIDC compatible) |
| **Supabase Storage** | MinIO (S3-compatible API) or standard file system storage |
| **Supabase Realtime** | WebSockets / Socket.io server |
| **Supabase Edge Functions** | Dedicated Node.js API server or background queue workers |
| **Vercel Hosting** | Dockerized Next.js Node container |
| **Vercel Cron** | Standard Node-cron or Redis Queue job runner (BullMQ) |

---

## 2. Target Container Architecture
Verity Enterprise will be packaged as a single deployable multi-container configuration via Docker Compose or Kubernetes manifests.

```
                           VERITY CLUSTER
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
            ┌─────────────┐             ┌─────────────┐
            │ Next.js Web │             │ Verity API  │
            │  Container  │             │  Container  │
            └──────┬──────┘             └──────┬──────┘
                   │                           │
                   └─────────────┬─────────────┘
                                 ▼
                     ┌──────────────────────┐
                     │     Keycloak IAM     │
                     └───────────┬──────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
  │  PostgreSQL  │        │  Redis / MQ  │        │ MinIO Object │
  │   Database   │        │ Cache & Jobs │        │   Storage    │
  └──────────────┘        └──────────────┘        └──────────────┘
```

---

## 3. Step-by-Step Portability Phase Plan

### Phase 1: Dockerize the Next.js App
*   Write a multi-stage `Dockerfile` that compiles the Next.js app in production mode.
*   Abstract environment variables (like `DATABASE_URL` and Auth providers) so they can be injected at startup rather than build time.

### Phase 2: Standalone Database Migration Engine
*   Decouple Prisma migrations from Next.js lifecycle.
*   Introduce an entrypoint script that executes `npx prisma db push` or runs migrations sequentially before booting the web server.

### Phase 3: Abstract File Uploads & Storage
*   Refactor the storage helper to use an S3 client.
*   If `STORAGE_PROVIDER` is set to `"S3"`, upload evidence/challans/invoices to MinIO/S3 instead of Supabase Storage buckets.

### Phase 4: Job Scheduling Decoupling
*   Implement a background polling thread or Redis-backed worker (e.g. BullMQ) to execute scheduled checks (like low-stock counts and invoice aging sweeps) without depending on Vercel Crons.
