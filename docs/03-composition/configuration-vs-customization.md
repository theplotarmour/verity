# Configuration vs Customization

Most client requests should not become new code.

## Decision Ladder

1. Configuration: settings, fields, labels, roles, workflow states.
2. Existing module: use the module differently.
3. Composition: combine modules.
4. Extension: add optional reusable behavior to a module.
5. New reusable module: build a new capability.
6. Client-specific code: documented exception only.

## Client-Specific Code Requirements

If client-specific code is unavoidable:

- document why configuration/composition cannot solve it,
- document the client,
- document the contract reason it is not reusable,
- isolate it from Core,
- add tests preventing leakage to other tenants,
- create a future removal or generalization plan.

## Examples

Kent wants table-specific service flow:

- First try `tables_orders` settings.
- Then try composing `tables_orders`, `kitchen`, `serving`.
- Then add an optional serving workflow setting.
- Only build Kent-specific code if the behavior is contractually unique and not reusable.
