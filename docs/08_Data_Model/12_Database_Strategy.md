# 12 Database Strategy

## Scope

This document governs migration discipline, indexes, versioning, audit, and production safeguards.

## Required Coverage

- purpose of each entity
- field intent
- key relationships
- lifecycle expectations
- validation rules
- indexing and query expectations
- event implications
- UI and API touchpoints

## Canonical Note

The current implementation schema is defined in `prisma/schema.prisma`. These docs define the intended stable model and should be used to drive future schema cleanup and migration repair.
