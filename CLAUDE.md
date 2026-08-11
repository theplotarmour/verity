# Verity — Claude Code Project Memory

## What this is
Verity is a **multi-tenant Franchise Operating System** built on Next.js 15 / Prisma / Supabase. It targets four B2B business verticals:
- `auto_components` — Custom automotive upholstery manufacturers (Carxen and competitors)
- `facility_management` — Multi-site cleaning, security, and maintenance firms
- `franchise_qsr` — Quick-service restaurant franchise networks
- `franchise_retail` — Retail franchise store networks

## Core Rules (always apply)
- **Ponytail (lazy senior dev)**: Before writing code, ask if it already exists. Fewest files wins. No boilerplate.
- **Multi-tenant security**: Every DB query MUST be scoped by `factoryId`. Never trust `factoryId` from client payload — derive from session.
- **No duplicated logic**: If a helper exists in two places, delete one and import the other. This is AUDIT.md §6 — the source of our 3 recurring bugs.
- **Pack keys are strict**: Only 4 active packs (`auto_components`, `facility_management`, `franchise_qsr`, `franchise_retail`). See `src/platform/packs.ts`.
- **No default PINs**: `provisionClient` generates a random PIN. Never hardcode `"1234"`.
- **Phones are canonical**: Always use `phoneKey()` from `src/lib/phone.ts` when comparing phone numbers.

## Design System
- **Brand colors**: Scarlet `#FF102A` (primary), Deep Red `#89001E` (hover/glow), Graphite `#1F2328` (surface)
- **Typography**: Sora (`var(--font-sora)`) for headings/metrics, Inter for tables/dense data
- **Dark mode tokens**: Use `text-text-primary`, `text-text-secondary`, `text-text-tertiary`. NEVER hardcode `text-slate-900` inside dark cards.
- **Grid layouts**: Always `items-stretch` on twin columns, never `items-start`.
- **Scroll bounding**: Outer layout `h-screen overflow-hidden`. Inner lists `overflow-y-auto h-[520px]` — prevents PWA pull-to-refresh reload.
- **Active states**: Active pills use `bg-[var(--brand)] text-white` — never white-on-white.

## Headless API Layer
- `/api/orders/receive` — HMAC-signed, tenant key from `ApiKey` table (never payload)
- `/api/webhooks/drain` — durable outbox, guarded by `CRON_SECRET`
- Webhook URLs validated by `lib/webhooks/url-guard.ts` (SSRF protection)

## Key Files
- `src/platform/packs.ts` — pack definitions (moved from provision.ts to allow server-free imports)
- `src/platform/modules/registry.ts` — module entitlements
- `src/server/actions/hq.ts` — all HQ cross-tenant actions (all guarded by `requireHqAction()`)
- `src/lib/phone.ts` — canonical phone key normalization
- `src/app/owner/dashboard/page.tsx` — reads `factory.industry` and mounts the correct dashboard

## Skills active in this project
- `D:\Code\myskills\ui-ux-pro-max` — Premium UI/UX patterns
- `D:\Code\myskills\db-migration-helper` — Defensive migration rules
- `D:\Code\myskills\franchise-ops-helper` — Franchise OS patterns
- `D:\Code\myskills\emilkowalski-skills\skills\improve-animations` — Animation audit
- `D:\Code\myskills\emilkowalski-skills\skills\apple-design` — Fluid, natural interface feel
