# Service Operations Modules

Service operations are the best pilot area for the module-platform contract because they are newer and less entangled with VEDA manufacturing assumptions.

## Candidate Modules

- `projects`
- `assets`
- `helpdesk`
- `sites`
- `scheduling`
- `billing`

## Why Use These As Pilot Modules

- They already use module guards in several pages/actions.
- They are less tied to production stages and automotive item configuration.
- They represent reusable capabilities for facility management, field service, professional services, and franchise operations.

## Required Proof

Pick one module, preferably `helpdesk`, `assets`, or `projects`, and prove:

1. Blank tenant can enable it.
2. Navigation appears from module manifest.
3. Dashboard widget appears from module manifest.
4. Page access is blocked when disabled.
5. Server actions are blocked when disabled.
6. Tenant A cannot see Tenant B data.
7. Disable hides and blocks but retains data.
8. Re-enable restores access.
