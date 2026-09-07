# Verity — adversarial black-box security and conformance audit

**Status: IN PROGRESS.** Written continuously. Do not read a section's silence as a pass;
`COVERAGE.md` is the authority on what was and was not tested.

## Environment audited

| | |
|---|---|
| **Target** | `http://localhost:3000` — Next.js 16.3.3 dev server, this working tree, commit `f9aad80` |
| **Database** | Supabase project `ygkjidaggwvhjgpqlkmj`, region `ap-south-1`, pooler `aws-1-ap-south-1.pooler.supabase.com` |
| **Environment class** | **PRODUCTION DATA.** `.env` points the local app at the same Supabase project that serves `https://app.theverityai.xyz`. There is no separate development database. The product owner authorised the audit to run against it anyway. |
| **Runtime role** | `verity_app` — verified `rolsuper = false`, `rolbypassrls = false` |
| **Date** | 2026-09-06 |
| **Method** | Black-box. Phases 1–7 use only observed behaviour — pages loaded, requests replayed, rows read back. Source reading is confined to Phase 8. |

## Identities used

| Handle | Login | Tenant | Role |
|---|---|---|---|
| `operator` | `audit-operator@audit.local` | Verity Platform (`e01486e7…`) | Verity Operator |
| `ownerA` | `audit-owner-a@audit.local` | Shri Ganesh Timber Trading Co. (`96793a76…`) | Owner (248 permissions) |
| `managerA` | `audit-manager-a@audit.local` | Shri Ganesh (`96793a76…`) | Manager (16 permissions, Organization scope) |
| `ownerB` | `owner@tenant-b.audit.local` | Vireshwar Timber Mart (`b0000000…0001`) | Owner |
| `staffB` | `staff@tenant-b.audit.local` | Vireshwar (child org `…0003`) | Counter Staff |
| `rolelessB` | `roleless@tenant-b.audit.local` | Vireshwar | **no role** |

Created for this audit via the repository's own scripts (`seed:audit-tenant`, plus the
`create-login.ts` pattern). No existing account's password was changed.

---

## Executive summary

*Written last. See the ranked findings below until then.*

---

## Findings
