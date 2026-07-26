# Blueprint System

## Purpose

The Blueprint System is the reusable operational DNA of Verity.

## What a Blueprint Must Control

- product variant context
- active versioning
- route steps by department
- estimated execution time
- linked QC template
- linked BOM
- linked factory knowledge documents
- downstream planning and execution behavior

## Canonical Rules

- Every product family that enters production should resolve to a blueprint version.
- Blueprint versions are explicit and auditable.
- Route and QC logic should be derived from blueprints, not duplicated ad hoc in separate modules.
- Knowledge assets should be attached directly to blueprint versions.

## Current Schema Alignment

The current Prisma schema already includes `Blueprint`, `BlueprintVersion`, `BlueprintRouteStep`, `FactoryDocument`, `BOM`, and `BOMItem`. This confirms that the codebase is aligned with the blueprint-first direction even if the docs were previously fragmented.
