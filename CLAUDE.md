# Verity — Claude Code Project Memory

## What this is
Verity is a **multi-tenant Franchise Operating System** built on Next.js 15 / Prisma / Supabase. It targets three B2B business verticals:
- `facility_management` — Multi-site cleaning, security, and maintenance firms
- `franchise_qsr` — Quick-service restaurant franchise networks
- `franchise_retail` — Retail franchise store networks

## Core Rules (always apply)
- **Ponytail (lazy senior dev)**: Before writing code, ask if it already exists. Fewest files wins. No boilerplate.
- **Multi-tenant security**: Every DB query MUST be scoped by `factoryId`. Never trust `factoryId` from client payload — derive from session.
- **No manufacturing**: the MES layer (blueprints, routing, production plans, work orders, job cards, stage capture, the BOM and spec engines) was withdrawn along with the `manufacturing` and `automotive` modules and the `auto_components` pack. `ItemMaster` is now `Product`, a plain catalogue. Do not reintroduce a shop floor without a customer asking for one.
- **No duplicated logic**: If a helper exists in two places, delete one and import the other. This is AUDIT.md §6 — the source of our 3 recurring bugs.
- **Pack keys are strict**: Only 3 active packs (`facility_management`, `franchise_qsr`, `franchise_retail`). See `src/platform/packs.ts`. `booking` and `crm` belong to no pack — enable them per tenant from the HQ builder.
- **Workflows are declared, not implied**: a composed chain lives in `src/platform/events/workflows.ts` and is wired in `reactions.ts`. `reactions.test.ts` fails if a declared step has no listener. Publish through `publish()`, never `emit()` directly.
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
- `src/platform/events/workflows.ts` — declared composed workflows, read by the HQ builder
- `src/platform/events/reactions.ts` — the listeners that implement them (each scoped by `factoryId`, entitlement-checked, idempotent)
- `src/platform/events/publish.ts` — the only supported way to raise a platform event
- `src/platform/billing/service-invoice.ts` — shared customer-invoice write (server action and reactions both use it)
- `src/server/actions/hq.ts` — all HQ cross-tenant actions (all guarded by `requireHqAction()`)
- `src/lib/phone.ts` — canonical phone key normalization
- `src/app/owner/dashboard/page.tsx` — reads `factory.industry` and mounts the correct dashboard

## Skills active in this project
- `D:\Code\myskills\ui-ux-pro-max` — Premium UI/UX patterns
- `D:\Code\myskills\db-migration-helper` — Defensive migration rules
- `D:\Code\myskills\franchise-ops-helper` — Franchise OS patterns
- `D:\Code\myskills\emilkowalski-skills\skills\improve-animations` — Animation audit
- `D:\Code\myskills\emilkowalski-skills\skills\apple-design` — Fluid, natural interface feel

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
