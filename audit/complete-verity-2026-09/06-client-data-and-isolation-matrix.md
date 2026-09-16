# Client Data and Isolation Matrix

## Verdict

Database catalog enforcement is **PASS**. Current adversarial tenant-behavior proof is **UNTESTED** because the only configured database is remote and the suite refused to mutate it.

| Data class | Tenant key / isolation | Read/write path | Additional controls | Result |
|---|---|---|---|---|
| Tenant-owned operational tables | `tenant_id`; RLS + FORCE RLS | `withTenant` transaction | role/scope/field controls in command/query plane | PASS catalog; runtime scenarios untested |
| Party/User shared identity | visibility helper functions | membership-derived identity paths | no email-based cross-tenant merging | PARTIAL; sensitive and not current e2e-tested |
| TenantMembership | tenant + organization | auth bootstrap function, admin commands | signed active-membership cookie reverified | Strong static/catalog evidence |
| Capability definitions | global metadata | registry/migrations | no tenant mutation of Global scope | BUILT |
| Tenant activations | tenant-owned | HQ/operator commands | dependency enforcement | BUILT; presentation enforcement gap |
| Configuration | scoped Global/Tenant/Org/User | command + direct scoped reads | precedence, permission-gated admin page | PARTIAL |
| Files | tenant DB row + tenant-prefixed object key | two-phase reserve/confirm/read | magic bytes, size cap, sealed key, signed URL | Strong source; live storage untested |
| Activity/domain/security events | tenant-owned append-only rows | command/audit paths | DB triggers/immutability | Built; current mutation proof untested |
| Request quota | global hashed identifier counter | SECURITY DEFINER function only | raw table grants revoked | PASS live grants |
| Migration ledger | global operational table | migration role only | no runtime grant; RLS not required | PASS |
| Credentials | encrypted tenant row | SECURITY DEFINER store/reveal | key supplied by app, tenant GUC | PARTIAL; PUBLIC execute hygiene issue |
| Operator projections | cross-tenant SECURITY DEFINER functions | platform-operator checks | intended minimal projections | Static/live privilege metadata; behavior untested |

## Live catalog proof

`evidence/check-db-catalog.mjs` returned:

- 140 tables total, 139 application tables with both RLS and FORCE RLS.
- 170 policies covering all 139 RLS tables.
- zero RLS tables without a policy.
- runtime grants to 138 application tables for SELECT/INSERT/UPDATE/DELETE; no grant on `_prisma_migrations` or `request_quota`.
- no runtime or PUBLIC CREATE permission on `public` or `verity` schemas.

The difference between 139 protected tables and 138 directly granted tables is intentional: `request_quota` is function-only.

## Unproved scenarios

- Tenant A cannot select/update/delete Tenant B rows across representative platform, trading, dine-in, outreach, and file tables.
- Cross-tenant foreign keys and helper functions fail under hostile IDs.
- Platform-operator entry creates the expected impersonation/support audit markers.
- Field-level redaction holds across direct pages as well as registered queries.
- RLS remains effective after a fresh migration into a new PostgreSQL cluster.
- Backup/restore preserves policies, FORCE RLS, grants, triggers, and tenant separation.

These are mandatory retest gates, not inferred passes.

