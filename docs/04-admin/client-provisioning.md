# Client Provisioning

Client provisioning creates a tenant workspace and applies an initial configuration.

## Target Blank Tenant

A blank tenant has:

- organization,
- workspace/location,
- owner user,
- core settings,
- roles,
- module entitlement table with only Core enabled,
- no business module data,
- no VEDA demo data,
- no restaurant demo data,
- no manufacturing stages unless manufacturing is enabled.

## Target Provisioning Flow

```text
Create Organization
  Create Workspace
  Create Owner User
  Seed Core Roles
  Enable Core
  Optionally Apply System Template
  Optionally Apply Pack
  Seed Only Template-Owned Starter Data
  Validate Portal
```

## Current Code

Provisioning code lives in:

- `src/platform/tenancy/provision.ts`
- `src/platform/tenancy/provision-core.ts`
- `src/server/actions/hq.ts`

Current behavior must be audited before claiming blank-client support.
