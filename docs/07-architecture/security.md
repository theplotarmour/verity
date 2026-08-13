# Security

Security in Verity depends on tenant isolation, module entitlement, permission checks, and workflow/subscription state.

## Required Backend Checks

Every module-owned operation must verify:

1. authenticated session,
2. tenant/workspace context from session,
3. module entitlement,
4. user permission,
5. resource ownership,
6. workflow state,
7. subscription writability for writes.

## Forbidden Patterns

- Accepting `tenantId`, `organizationId`, or `factoryId` from the browser as the security boundary.
- Using frontend conditional rendering as the only guard.
- Using role names alone to grant access.
- Using pack name or industry string as authorization.
- Fetching records by bare id where another tenant could enumerate them.

## Current Tools

- `guardModulePage`
- `guardModuleAction`
- `guardModuleWrite`
- `resolveAccess`
- tenant-scoped Prisma queries
- tenant isolation tests

## Audit Requirement

Any module completion claim must include direct URL and server-action disabled-module tests.
