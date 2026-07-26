# Database, Offline, And PWA Strategy

## Database Strategy

PostgreSQL via Prisma is the system of record. The live Prisma schema is currently the real authority over data shape, but production-grade operation requires restoring migration discipline and removing dangerous schema-push assumptions from production paths.

## Current Risks

- `npm run build` currently runs `prisma db push --accept-data-loss`
- the checked-in migration history is behind the schema
- package metadata still carries old naming drift

## Offline Strategy

Offline support is a product requirement for worker and execution surfaces. The system should allow bounded local capture for work that must proceed during connectivity loss, then synchronize through explicit conflict-safe rules.

## PWA Strategy

- installable app shell
- worker and inspector friendly mobile behavior
- route-safe caching boundaries
- explicit sync and recovery UX
- background revalidation where appropriate

## Sync Strategy

- local intent queue
- server-side validation on replay
- idempotent event handling
- audit trail for offline-originated submissions
- evidence upload retry policies
