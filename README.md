
# Verity

Verity is a Next.js 16 production-grade Factory Operating System backed by Prisma on PostgreSQL. The active application code lives in `src/`, the database contract lives in `prisma/schema.prisma`, and the canonical product authority now lives entirely under `docs/`.

## Canonical References

- `docs/README.md`: canonical documentation entrypoint
- `docs/00_Vision/01_Verity_Vision.md`: mission, philosophy, and non-goals
- `docs/01_Product/01_Product_Bible.md`: product strategy and operating thesis
- `docs/03_Architecture/01_Architecture_Overview.md`: current and intended platform shape
- `docs/04_Business_Engines/`: engine-level authority
- `docs/06_Modular_Workflows/`: workflow authority
- `docs/08_Data_Model/`: data-model authority

## Current Technical Baseline

- Framework: Next.js `16.2.10`
- Runtime: React `19.2.4`
- Database: Prisma Client with PostgreSQL
- Build command: `npm run build`

## Notes

- `prisma/schema.prisma` is still ahead of the checked-in SQL migration history, so database hardening remains an open implementation concern.
- The old `prd/` and `prd-v2/` trees were intentionally removed because they are no longer canonical.
