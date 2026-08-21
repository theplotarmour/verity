# Keycloak — Concept Inventory

Source: server-spi/src/main/java/org/keycloak/models/, server-spi-private/src/main/java/org/keycloak/authorization/model/, model/jpa/src/main/java/org/keycloak/models/jpa/entities/
Commit: 10ffa4a188bc56b5cb03fbed5d14701d9fc1572c

---

### Realm

Source evidence: `server-spi/src/main/java/org/keycloak/models/RealmModel.java:35` and `model/jpa/src/main/java/org/keycloak/models/jpa/entities/RealmEntity.java:59`
Definition: A realm manages a set of users, credentials, roles, and groups. A user belongs to and logs into a realm. Realms are isolated from one another.
Purpose: Multi-tenancy and security domain isolation.
Key fields/attributes: `id` (String), `name` (String), `enabled` (boolean), `sslRequired`, `passwordPolicy`.
Relationships: Contains Users, Roles (`RoleContainerModel`), Groups, and Clients.
Lifecycle states: Created, Updated, Removed.
Notes for Verity: The ultimate isolation boundary — analogous to Verity's Organization/Tenant.

---

### Role

Source evidence: `server-spi/src/main/java/org/keycloak/models/RoleModel.java:30`
Definition: A named role that can be granted to users or groups, representing a set of permissions or a persona.
Purpose: Role-based access control.
Key fields/attributes: `name`, `description`, `isComposite` (boolean).
Relationships: Belongs to a `RoleContainerModel` (either a Realm or a Client). Can contain other roles (Composite Roles).
Notes for Verity: The composite role pattern implements role inheritance without a separate entity.

---

### Group

Source evidence: `server-spi/src/main/java/org/keycloak/models/GroupModel.java:31`
Definition: A collection of users. Groups can be mapped to roles.
Purpose: Managing permissions for a large number of users at once.
Key fields/attributes: `id`, `name`, `type` (REALM or ORGANIZATION — NOTE: ORGANIZATION type was recently added).
Relationships: Implements `RoleMapperModel` (can have roles assigned). Users belong to groups.
Notes for Verity: Group hierarchy + role mappings simplifies user management. The new `Type.ORGANIZATION` in GroupModel suggests Keycloak is moving toward Orgs-within-Realm, not Realm-per-Org.

---

### User

Source evidence: `server-spi/src/main/java/org/keycloak/models/UserModel.java:33`
Definition: An entity that can authenticate and access the system.
Purpose: Identity management.
Key fields/attributes: `username`, `email`, `firstName`, `lastName`, `enabled`.
Relationships: Implements `RoleMapperModel` (can have direct roles). Belongs to Groups. Can have `UserSessionModel`.
Lifecycle states: Created, Disabled, Removed.

---

### Resource (UMA)

Source evidence: `server-spi-private/src/main/java/org/keycloak/authorization/model/Resource.java:30`
Definition: An entity representing a protected resource in a resource server.
Purpose: Resource-based authorization (UMA).
Key fields/attributes: `id`, `name`, `type`, `uris`, `owner`, `ownerManagedAccess`.
Relationships: Belongs to a `ResourceServer`. Has `Scope`s. Protected by `Policy`s.

---

### Policy

Source evidence: `server-spi-private/src/main/java/org/keycloak/authorization/model/Policy.java:34`
Definition: Represents an authorization policy (condition) and its configuration.
Purpose: Defines rules that must be satisfied to access a resource.
Key fields/attributes: `id`, `type`, `decisionStrategy`, `logic`.
Relationships: Applies to `Resource`s and `Scope`s. Can have associated (nested) policies.
Notes for Verity: Decouples "what" (Resource/Scope) from "who/how" (Policy).
