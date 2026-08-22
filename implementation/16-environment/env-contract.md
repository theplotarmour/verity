# Purpose
Defines the complete environment variable contract for the Verity platform.

# Scope
All `.env` configurations across local, staging, and production environments.

# Authority
- Authority: EXISTING INFRASTRUCTURE (Environment variables from audit)

# Prerequisites
- `.env.example` file setup.

# Specification Requirements
- WHAT MUST EXIST: Strict definition of all required environment variables and their lifecycle classifications.

# Approved Architecture
- Next.js environment variables loaded securely.

# Implementation Contract
- NEVER expose actual secret values in this document.
- **RETAINED VARIABLES (As-is):**
  - `DATABASE_URL`, `DIRECT_URL`, `DATABASE_POOL_LIMIT` (Prisma/Postgres)
  - `NEXT_PUBLIC_SITE_URL` (Core routing)
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Client)
  - `NEXT_PUBLIC_SENTRY_DSN` (Sentry)
  - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (PostHog)
  - `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM` (Email)
  - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` (WhatsApp Integration)
  - `GROQ_API_KEY` (LLM Services)
  - `SUPABASE_MEDIA_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `NEXT_PUBLIC_S3_PUBLIC_URL` (Storage)
  - `INNGEST_EVENT_KEY` (Inngest)
- **DEPRECATED VARIABLES:**
  - `VERITY_HQ_PHONES` (Remove from platform)
- **SECRET ROTATION REQUIRED:**
  - `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `MAINTENANCE_TOKEN`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `INNGEST_SIGNING_KEY`
- **NEW VARIABLES REQUIRED:**
  - IMPLEMENTATION DECISION REQUIRED: Specific new variables for Greenfield infrastructure.

# Constraints & Invariants
- `.env.example` must contain dummy values (e.g., `your_secret_here`) for all secrets.
- `NEXT_PUBLIC_` prefix must ONLY be used for variables safe to expose to the browser.

# Dependencies
- None.

# Failure Modes
- Secrets leaked to source control. Mitigate via `.gitignore` enforcing `.env` exclusion.

# Testing Requirements
- Application must crash on startup if required variables are missing (validate via Zod schema at boot).

# Conformance Checks
- Boot validation of `env.mjs` or similar schema parser.

# Traceability
- N/A

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Zod environment validation library integration method.
