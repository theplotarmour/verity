# Admin Control Center

The Verity Admin Control Center is the internal platform console.

It is where Verity staff create tenants, manage modules, apply packs, build systems, request custom modules, inspect billing/subscription status, and monitor deployments.

## Admin Responsibilities

- create organization,
- create workspace/location,
- enable modules,
- apply packs,
- apply system templates,
- configure module settings,
- configure roles and permissions,
- preview client portal,
- deploy/revert module changes,
- inspect module versions,
- request new custom/reusable modules,
- view audit trail and billing impact.

## Current Code

Current HQ/admin code lives under:

- `src/app/verity`
- `src/server/actions/hq.ts`
- `src/server/actions/modules.ts`

This is a beginning, not the full target control plane.
