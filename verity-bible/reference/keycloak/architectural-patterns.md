# Keycloak — Architectural Patterns

Source: server-spi/src/main/java/org/keycloak/models/, server-spi-private/src/main/java/org/keycloak/authorization/model/
Commit: 10ffa4a188bc56b5cb03fbed5d14701d9fc1572c

---

### Realm as Full Isolation Boundary

Source evidence: `server-spi/src/main/java/org/keycloak/models/RealmModel.java`
Pattern: The Realm is an absolute boundary. Users, Roles, Clients, and Groups do not cross realms.
Problem solved: Hard multi-tenancy. Ensuring Tenant A cannot accidentally see Tenant B's users or roles.
Implementation sketch: Every entity is scoped to a Realm. `RealmModel` acts as factory/container (`RoleContainerModel`) for its entities.
Trade-offs: Cross-tenant operations (a super-admin managing multiple tenants) require explicit realm-switching or master realm federation.
Applicability to Verity: HIGH — but note the emerging `Type.ORGANIZATION` in GroupModel suggests the industry is moving toward Orgs-within-one-Realm.

---

### Composite Roles (Role Inheritance)

Source evidence: `server-spi/src/main/java/org/keycloak/models/RoleModel.java`
Pattern: A Role can contain other Roles. Granting the parent role implicitly grants all child roles.
Problem solved: Role inheritance and persona modeling without exploding direct role assignments.
Implementation sketch: `RoleModel` has `isComposite()`, `addCompositeRole()`, `getCompositesStream()`.
Trade-offs: Can become difficult to audit if hierarchies are too deep or circular.
Applicability to Verity: HIGH

---

### Resource-Scope-Policy Authorization (UMA)

Source evidence: `server-spi-private/src/main/java/org/keycloak/authorization/model/`
Pattern: A Resource (document) has Scopes (read, write). Policies (must be manager) govern access.
Problem solved: Fine-grained ABAC rather than coarse RBAC.
Implementation sketch: `Resource` has `Set<Scope>`, `Policy` links to `Resource` and `Scope`.
Trade-offs: Significant cognitive overhead for administrators. Can be overkill for simple systems.
Applicability to Verity: MEDIUM — flat RBAC + entity-level scopes may be simpler for Verity v1.

---

### Group Hierarchy for Org Sub-Structures

Source evidence: `server-spi/src/main/java/org/keycloak/models/GroupModel.java`
Pattern: Groups can contain sub-groups, each inheriting role assignments from parents.
Problem solved: Modeling organizational hierarchies (Region → Branch → Team) without separate entity types.
Applicability to Verity: HIGH — Verity's Location hierarchy maps to this conceptually.
