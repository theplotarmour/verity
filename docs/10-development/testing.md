# Testing

Tests must prove platform behavior, not only component rendering.

## Required Module Tests

For each optional module:

- route blocks when module disabled,
- server actions block when module disabled,
- navigation appears only when enabled and permitted,
- permissions are filtered by entitlement,
- data is tenant-scoped,
- disable retains data,
- re-enable restores access,
- dependencies are expanded or enforced,
- writes respect subscription state.

## Blank Tenant Tests

Must prove:

- only Core enabled,
- no business nav,
- empty dashboard,
- optional direct URLs blocked,
- optional server actions blocked,
- no VEDA/restaurant demo data.

## Current Commands

```bash
npm run typecheck
npm run test
npm run build
```

Use focused tests for migration passes, then run broader verification before completion claims.
