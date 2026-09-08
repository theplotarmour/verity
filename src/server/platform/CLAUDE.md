Migrated from root `CLAUDE.md` (doctor check 4 — subdirectory-scoped, not universal). Root
`CLAUDE.md` still governs the constitutional invariants, ADRs, and terminology these sections
depend on.

## Identity shape (already decided, do not re-litigate)

`Party` and `User` are **global** tables with no `tenantId`. Authority: Bible V2
Primitive 2 §2 ("Scoped globally to the Platform database, mapped to Organizations
via TenantMembership records") and INV-003, which requires exactly one Party per
person even when they work for several tenants (PLA-IDE-004, the subcontractor).
Adding a `tenantId` to either would force one row per tenant and break INV-003.

F-021 decision: keep the existing globally shared identity contract. Display name,
verified contact details, and Party lifecycle are platform-wide attributes, not
private tenant profile fields. Authorized updates are visible to every tenant
with membership reachability; concurrent updates use the last committed value.
Tenant-specific labels belong on a tenant-scoped capability or membership profile,
never on Party. Use membership revocation for tenant-local access removal;
Party suspension affects the shared identity across all its memberships.


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

**Authorization is fail-closed at all three layers.** Layer 1 checks the entity
verb. The command/query pipeline requires a Tenant grant unless the definition
explicitly declares `scopeHandling: "handler"`; such handlers must filter or guard
every row using their organization/location anchor. Unanchored records and
capabilities without those guards require Tenant scope. Organization grants never
silently become Tenant grants. Layer 3 removes declared restricted fields from
arrays, detail objects and nested values before returning or grounding results.

Shared roles can be assigned anywhere in a tenant, so conferring a permission
requires the actor to hold that permission at Tenant scope. Role assignment,
composition and both permission editors share this ceiling. Self-role assignment
is refused. See `audit/2026-09-07/REMEDIATION.md` for rollout requirements.

- Restricted fields are declared in `FieldPermission` and granted by an ordinary
  `Read` on the field-qualified key `<entityKey>#<fieldName>` — no separate
  numeric "level" ladder, which would be a second authorization model to keep in
  sync with the first.
- Redaction **omits** a field rather than nulling it; a null cannot be told apart
  from a genuinely absent value.
- Location grants require a registered resolver and a handler that explicitly scopes its rows.

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
  trigger. Confirmation verifies actual bytes and seals a fresh key; storage drivers bind only with deployment credentials.
- **Notifications** (`notification.ts`) — suppressed notifications are recorded, not dropped.
  Templates substitute literally; an expression language would make a tenant template a stored program.
- **Custom fields** are rendered, validated and submitted end to end. The command re-validates
  server-side because a client check is a convenience, never a control.
