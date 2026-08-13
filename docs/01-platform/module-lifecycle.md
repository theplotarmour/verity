# Module Lifecycle

Modules move through a controlled lifecycle so Verity can develop new capabilities without accidentally selling unfinished software.

## States

| State | Meaning | Provisioning |
| --- | --- | --- |
| `DRAFT` | Idea or spec only | Not provisionable |
| `DEVELOPMENT` | Being built internally | Not provisionable except dev fixtures |
| `BETA` | Usable for selected tenants | Allowlisted provisioning |
| `ACTIVE` | Sold and supported | Standard provisioning |
| `DEPRECATED` | Still runs but should not be used for new clients | Existing tenants only |
| `ARCHIVED` | Retired | Not provisionable |

## Versioning

Every module needs a contract version.

Changing internal implementation without breaking the module contract does not require a major version bump. Breaking exported actions, data ownership, settings schema, permissions, navigation contract, workflow states, or event payloads does.

Target model:

```text
Module
  ModuleVersion
    TenantModuleDeployment
```

This allows:

- Client A on Inspections 1.2,
- Client B on Inspections 1.4,
- Client C on Inspections 2.0.

The current code has a static `version` field in the registry but no per-tenant deployment version yet.

## Custom Module Ownership

Client-funded work must record:

- origin client,
- business capability,
- scope,
- reuse potential,
- contractual ownership,
- whether it can be offered to other clients,
- related vertical/system templates.

Client-specific configuration is not a custom module. A custom module is reusable software unless explicitly documented otherwise.
