# Data Model

This document defines the target model and current migration reality.

## Target Core Entities

- Organization
- Workspace / Location
- User
- Membership
- Role
- Permission
- Module
- Module Version
- Organization Module / Module Entitlement
- Pack
- System Template
- Workflow Definition
- Event
- Audit Log
- File
- Notification

## Current Core Reality

The current Prisma schema uses:

- `Organization` for tenant/commercial boundary,
- `Factory` for workspace/location and many existing relationships,
- `ModuleEntitlement` for organization-scoped module enablement,
- `Role` and `RolePermission` for registry-based permissions,
- many legacy/module records scoped by `factoryId`.

## Rule

Do not rename schema objects cosmetically and call the migration complete. The target is behavioral separation:

- Core owns tenant/platform infrastructure.
- Modules own business records.
- Client configuration owns settings/composition.
- Client data stays tenant-scoped and retained.

## Module-Owned Tables

Until schema is physically split, module ownership must be documented and enforced by service/action boundaries.

Direct cross-module Prisma access should be treated as technical debt unless it goes through a declared dependency and stable service API.
