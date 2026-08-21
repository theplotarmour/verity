# Keycloak — Behavior Inventory

Source: server-spi/src/main/java/org/keycloak/models/RoleModel.java, RoleMapperModel.java, authorization/model/
Commit: 10ffa4a188bc56b5cb03fbed5d14701d9fc1572c

---

### Role Inheritance via Composite Roles

Source evidence: `server-spi/src/main/java/org/keycloak/models/RoleModel.java:116-138`
Trigger: Evaluating permissions or resolving user roles.
Preconditions: Role A is marked as composite (`isComposite() == true`) and contains Role B.
Steps:
1. When checking if a user has Role B, check direct role mappings.
2. If not found, traverse the composite role tree of directly assigned roles (e.g., Role A contains Role B).
State changes: None (read-only evaluation).
Failure handling: Circular dependencies must be prevented during composite role assignment.
Notes for Verity: Highly efficient way to model role hierarchies (Manager includes Worker roles) without complex logic.

---

### User Role Resolution via Groups

Source evidence: `server-spi/src/main/java/org/keycloak/models/RoleMapperModel.java:54-67`
Trigger: System checking `hasRole(role)`.
Preconditions: User belongs to Group G, and Group G has Role R mapped.
Steps:
1. `hasRole(R)` checks direct assignment.
2. Checks composite assignments.
3. Checks group memberships — if Group G has Role R, returns true.
4. Checks nested group memberships.
Notes for Verity: Role mappings at the group level act as templates for user access. A Verity "team" maps naturally to this.

---

### UMA Authorization Evaluation

Source evidence: `server-spi-private/src/main/java/org/keycloak/authorization/model/Policy.java` and `Resource.java`
Trigger: A client requests access to a Resource/Scope.
Preconditions: Resource is registered; Policies are attached.
Steps:
1. Identify the Resource and Scope requested.
2. Fetch associated Policies.
3. Evaluate Policies based on user identity and context (roles, time).
4. Combine results using Policy's `DecisionStrategy` (AFFIRMATIVE, UNANIMOUS, CONSENSUS).
Side effects: Emits authorization decision (granted/denied).
Failure handling: Defaults to deny.
Notes for Verity: Flexible but has significant admin cognitive overhead.
