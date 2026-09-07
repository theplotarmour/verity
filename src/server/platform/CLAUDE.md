Migrated from root `CLAUDE.md` (doctor check 4 — subdirectory-scoped, not universal). Root
`CLAUDE.md` still governs the constitutional invariants, ADRs, and terminology these sections
depend on.

## Identity shape (already decided, do not re-litigate)

`Party` and `User` are **global** tables with no `tenantId`. Authority: Bible V2
Primitive 2 §2 ("Scoped globally to the Platform database, mapped to Organizations
via TenantMembership records") and INV-003, which requires exactly one Party per
person even when they work for several tenants (PLA-IDE-004, the subcontractor).
Adding a `tenantId` to either would force one row per tenant and break INV-003.

Isolation for them is **reachability**, not a tenant column: a tenant sees an
identity only when that identity holds a `TenantMembership` in it. `TenantMembership`
is tenant-scoped and carries the ordinary RLS policy.

- Create identities only via `provisionIdentity()` (`src/server/platform/identity.ts`),
  which calls `verity.provision_identity` and writes Party + User + first membership
  atomically. Direct INSERT into `party` / `user` is denied by RLS, deliberately:
  Postgres applies SELECT policies to `INSERT ... RETURNING`, so a just-created
  identity is unreachable and the write fails.
- Never hard-delete an identity. Bible V2 Primitive 2 §3 ends the lifecycle at
  `Archived`. There is intentionally no deprovision path.
- The model is named `TenantMembership` after Bible V2 Primitive 2 §2/§7; the
  implementation handoff's shorter `Membership` is the same thing, and the Bible
  outranks it.
- No address field on Party — ADR-004 makes Address a separate concept.
- No credential material on User; Supabase Auth owns it, and `authUserId` references
  `auth.users`. Bible V2 Primitive 2 §1 says User "stores credentials and passwords",
  which predates the Supabase decision (EXISTING INFRASTRUCTURE) and is superseded
  in practice by implementation/03-platform-foundation/identity.md.

## Authorization shape (already decided, do not re-litigate)

Permissions are `Verb + Entity + Scope`. `Role` composes into other roles
(`RoleComposition`, spec's name — the handoff's `RoleInheritance` is the same
thing and the spec outranks it), and a parent inherits every permission its
children hold (PLA-AUT-001).

- `entity` is a free string, never an enum — a new capability must add entities
  without touching the platform ontology.
- Verbs are a closed set (PLA-AUT-003); a bespoke capability action is
  `ActionExecute` against a named entity.
- Scopes are `Global | Tenant | Organization | Location` (PLA-AUT-002, refining
  Bible V2 Primitive 2 §13 which omits Organization; ADR-005 requires it). The
  handoff's extra `own` scope appears in neither the Bible nor the spec and was
  deliberately NOT added.
- Flattening runs in the database (`verity.resolve_permissions`) so the recursive
  walk respects the same RLS boundary as any other read.
- Inheritance cycles are blocked by a database trigger, not by application code —
  a cycle would make resolution non-terminating, and resolution runs on every check.
- `TenantMembership.roleId` is nullable: a membership with no role grants nothing,
  so an unassigned membership fails closed.
- `authorize()` throws `ForbiddenError` (`code: "E_FORBIDDEN"`) rather than
  returning false, so forgetting to branch on the result cannot permit the action.
  MET-ACT-002 requires this on every command.

**All three layers are enforced.** Layer 1 `authorize()` decides whether the role
may touch the entity type; Layer 2 `assertRowInScope()` / `scopeFilter()` decides
which records are theirs (Organization scope resolves to the actor's node plus
descendants — PLA-ORG-002 downward visibility and PLA-ORG-003 sibling isolation
in one subtree); Layer 3 `redactFields()` removes restricted fields. The query
pipeline applies Layer 3 automatically to a top-level array result and offers
Layer 2 through `ctx.scope()`.

- Restricted fields are declared in `FieldPermission` and granted by an ordinary
  `Read` on the field-qualified key `<entityKey>#<fieldName>` — no separate
  numeric "level" ladder, which would be a second authorization model to keep in
  sync with the first.
- Redaction **omits** a field rather than nulling it; a null cannot be told apart
  from a genuinely absent value.
- A `Location`-scoped grant currently reaches **nothing**, because Location does
  not exist as an entity yet. It fails closed rather than widening to the tenant.

## Platform substrate added after the foundation (do not re-litigate)

- **Capability contributions** (`contribution.ts`) — a capability declares its own navigation and
  workspace queues. The shell must never hold a capability-to-route map again; that was the coupling
  this replaced. The contract declares *where* a capability appears, never how to draw its page.
- **Temporal model** (`temporal.ts`) — instants are UTC, zones are resolved (organization → tenant →
  explicit UTC) and never guessed. Zones are validated on write because an unrecognised zone silently
  degrades to UTC.
- **SLA substrate** (`sla.ts`) — clock transitions derive from `StateCategory`, never from state keys
  or labels. A capability that declares its states honestly gets correct SLA behaviour with no clock
  code. A resumed clock continues its budget; a record that ran over then completed keeps its breach.
- **Files** (`files.ts`) — two-phase upload; a confirmed file's key, checksum and size are frozen by
  trigger. No storage driver is bound; that is a deployment step, not a missing contract.
- **Notifications** (`notification.ts`) — suppressed notifications are recorded, not dropped.
  Templates substitute literally; an expression language would make a tenant template a stored program.
- **Custom fields** are rendered, validated and submitted end to end. The command re-validates
  server-side because a client check is a convenience, never a control.
