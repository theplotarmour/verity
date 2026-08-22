# Deployment

## Purpose
This document defines the deployment pipeline, environments, and configuration required to run the Verity platform in production.

## Scope
**In Scope:** Build commands, environment variables, Vercel config, cron jobs.
**Out of Scope:** Local development setup (covered elsewhere).

## Authority
- EXISTING INFRASTRUCTURE (Vercel)

## Prerequisites
- Application builds successfully locally.

## Specification Requirements
- Automated, reproducible deployments.

## Approved Architecture
- Next.js deployed on Vercel.

## Implementation Contract
- **Hosting:** Vercel deployment (Authority: EXISTING INFRASTRUCTURE).
- **Region:** bom1 (Mumbai) (Authority: EXISTING INFRASTRUCTURE, vercel.json).
- **Cron jobs:**
  - `/api/webhooks/drain` (3am daily)
  - `/api/cron/subscriptions` (2am daily)
  (Authority: EXISTING INFRASTRUCTURE)
- **Build command:** `prisma generate && next build` (Authority: EXISTING INFRASTRUCTURE).
- **Environment variable management:** Reference `16-environment/env-contract.md`.
- **Preview deployments:** Enable Vercel preview deployments for Pull Requests.
- **Production deployment checklist:**
  - Verify zero-downtime database migrations.
  - Smoke tests pass on staging.
  - Analytics and observability tools are connected.

## Constraints & Invariants
- Database migrations must be backwards-compatible to support zero-downtime deployments.

## Dependencies
- Vercel platform, GitHub Actions (if used).

## Failure Modes
- Destructive database migrations cause application downtime.
- Missing environment variables crash the build.

## Testing Requirements
- Pre-deploy checks (lint, test, build).

## Conformance Checks
- Vercel build configuration validation.

## Traceability
- EXISTING INFRASTRUCTURE

## Open Decisions
- NONE.
