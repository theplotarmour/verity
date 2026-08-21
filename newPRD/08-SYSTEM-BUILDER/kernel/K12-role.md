---
doc_id: KERNEL-K12
title: Kernel construct K12 — Role
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K12 — Role

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A named bundle of Permissions, instantiated per tenant, mapped to one or more platform role archetypes.

## Required attributes

- **name**: archetypes
- **name**: permissions; **ref**: K11
- **name**: assignable_scopes; **note**: which scopes may be bound when this role is granted to a person
- **name**: is_system; **note**: system roles cannot be deleted, only cloned

## Invariants

- Every tenant must retain at least one principal holding a role with tenant_owner archetype and tenant scope. Enforced at revoke time, not at read time.

