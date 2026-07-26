# Verity — Suggested Next Steps (20 Jul 2026)

> Concrete, prioritized options now that all 8 factory-core milestones are live.
> Grouped by effort so you can pick what's worth doing next.

---

## Quick wins (small, low-risk, high value)

1. **Gate or remove the dev endpoints.** `/api/reseed-catalog`, `/api/delete-productions`, `/api/seed-owner` are unauthenticated and destructive in production right now. Add an owner-session + explicit confirmation check, or delete them if they were only ever needed for demo seeding.
2. **Admin-editable permission matrix.** `lib/permissions.ts` is a hardcoded `Record<Role, Permission[]>`. Move it into `Factory.settings` JSON (same pattern already used for `themeColor`) with a simple checkbox grid on the Settings page — closes a PRD requirement with a small, contained change.
3. **Inventory item QR/barcode labels.** You already have QR generation infrastructure for the passport flow (`/verify/[id]`); reuse it to print a SKU+bin label per raw-material item from Master Data, and add a "scan to find" input on the stock-entry modals.
4. **Switch `prisma db push` to `prisma migrate deploy` in the build script.** Right now `npm run build` runs `prisma db push --accept-data-loss` against the live database on every deploy — that's how the FieldType enum drift bit us earlier. Generate a migration history once and deploy becomes deterministic and reversible.

## Medium effort

5. **Batch traceability UI.** You capture `batchNumber` on GRN receipt already — add a batch picker when issuing stock (FIFO/manual selection) and a "remaining qty by batch" view per item, matching the chats' batch management spec.
6. **QC-hold / rejected stock as real inventory states.** Right now a QC rejection routes the *job* to rework but doesn't move *stock* into a distinct bucket. Add a `QC_HOLD` bin-balance state so rejected finished goods are visibly quarantined instead of just sitting in the same location.
7. **Design-system spacing/button audit.** I did *not* blind-edit this across the app this session — styling changes on a dozen authenticated pages need visual verification I don't currently have (no browser access to your logged-in app). Recommend either: (a) share screenshots of the pages that feel cramped so I can target fixes precisely, or (b) grant a way to preview the authenticated app so I can do a verified pass rather than guessing.
8. **Bundle/perf audit with real numbers.** The Turbopack build output doesn't print per-route bundle sizes the way the classic webpack build does. Worth running `next build` with the webpack compiler once (or `@next/bundle-analyzer`) to get real First Load JS numbers per route and confirm nothing (e.g. `MasterSheetView.tsx` at 1,600+ lines) is bloating a route it shouldn't.

## Bigger decisions (worth a conversation before starting)

9. **Revisit the CRM/portal boundary.** The PRD's own roadmap treats CRM → Dealer Portal → Customer Portal as phases 2, 4, 5 of the *original* plan. Factory-core is now solid; if there's business pressure to start taking B2B orders digitally, Dealer Portal is the natural next phase and reuses everything already built (orders, stages, timeline, dispatch, notifications).
10. **Live-bus deployment scaling.** The SSE channel added this session uses an in-process pub/sub — perfect for a single server/container, but a change on one instance won't reach clients connected to another instance if you ever deploy to multiple serverless instances (Vercel functions, multiple containers). If/when you scale horizontally, swap it for Postgres `LISTEN/NOTIFY` or Supabase Realtime (documented in `lib/server/live-bus.ts`).
11. **Multi-factory support**, explicitly deferred by the PRD itself to "future enhancements" — only worth planning once you have a second physical factory to onboard.

---

## What I'd do first, if it were my call

1 → 4 (gate the dangerous endpoints, fix the deploy script) — these are risk reduction, not features, and take almost no time.
Then 2 and 3 (permission matrix, item QR) — they're the last two PRD items with no UI at all.
Then 7/8 only once you can give me eyes on the running app, so styling changes are verified instead of guessed.
