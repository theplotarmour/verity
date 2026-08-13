# ADR-004: VEDA Logic Must Be Extracted, Not Renamed

## Decision

VEDA-derived manufacturing and automotive behavior must be extracted into modules or retired. It must not define Verity Core.

## Consequences

- Production, floor, QC, automotive, and Carxen behavior are not Core by default.
- Reusable infrastructure can be promoted to Core only after classification.
- Future work must not add new VEDA assumptions into shared platform code.
