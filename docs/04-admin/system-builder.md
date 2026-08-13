# System Builder

The System Builder is the internal construction environment for client workspaces.

## Target Flow

```text
Create/Open Client
  Select System Template
  Add/Remove Packs
  Add/Remove Modules
  Configure Module Settings
  Configure Roles
  Configure Workflows
  Configure Fields
  Configure Dashboard
  Preview Client Workspace
  Deploy
```

## Preview Requirements

Before deployment the admin should see:

- enabled modules,
- dependencies that will be pulled in,
- disabled modules,
- visible client navigation,
- dashboard widgets,
- role permissions,
- estimated billing change,
- blocked/deprecated/beta module warnings,
- data retention warning for disabled modules.

## Deployment Rules

- Apply changes transactionally where possible.
- Never delete module data during normal disable.
- Revalidate entitlement/navigation caches.
- Write audit log.
- Update subscription lines.
- Run post-deploy validation.

## Current Status

Current client detail UI can toggle modules and apply packs. It is not yet a complete visual System Builder.
