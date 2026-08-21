# Keycloak — Verity Implications

Source: server-spi/src/main/java/org/keycloak/models/, server-spi-private/src/main/java/org/keycloak/authorization/model/
Commit: 10ffa4a188bc56b5cb03fbed5d14701d9fc1572c

---

### Organization Boundary Model: Realm vs. Group

Confidence: HIGH
Recommendation: INVESTIGATE
Rationale: Keycloak uses Realms for absolute isolation (`RealmModel.java:35`). However, `GroupModel.java:35` now has `Type.ORGANIZATION`, suggesting the industry is moving toward Orgs-within-one-Realm. If a user can be a manager in Org A AND a worker in Org B with a single login, the Group-as-Organization model is far simpler. If Orgs must have completely separate authentication policies, use Realm-per-Org.
If INVESTIGATE: Determine whether Verity users will ever share a single identity across multiple organizations. If yes, Organization = Group-with-roles. If no, Organization = Realm.
Affects Bible sections: Volume V (Tenancy isolation), Volume II (Party/Organization model)

---

### Composite Roles

Confidence: HIGH
Recommendation: ADOPT
Rationale: `RoleModel.java` composite roles make "Manager inherits Worker permissions" trivially expressible. No custom inheritance logic required.
If ADOPT: Verity Role entity has `isComposite: boolean` and a self-referential many-to-many `parentRoles`/`childRoles`. Permission resolution traverses the composite tree recursively.
Affects Bible sections: Volume V (Authorization), Volume II (Role model)

---

### Resource-Scope-Policy (UMA) Authorization

Confidence: MEDIUM
Recommendation: ADAPT
Rationale: Full UMA is extremely complex but the core insight — decouple Resources, Scopes, and Policies — is valuable. Flat RBAC ("Manager can do X on any Work Order") is insufficient for row-level data access ("Manager can only see Work Orders in their branch").
If ADAPT: Implement simplified UMA: Permission = Role + EntityType + Scope. Row-level restriction via User Permission overrides (following Frappe's pattern) rather than dynamic Policies.
Affects Bible sections: Volume V (Authorization model)

---

### Admin Events vs. User Events — Separate Audit Streams

Confidence: MEDIUM
Recommendation: INVESTIGATE
Rationale: Keycloak separates authentication events from admin configuration events. Verity should consider whether IAM/configuration changes (role assignments, tenant config edits) need a separate, higher-retention audit stream from operational events (work order completions).
If INVESTIGATE: Define two audit event categories: SECURITY_AUDIT (IAM, config, impersonation) and OPERATIONAL_AUDIT (work, scheduling, billing).
Affects Bible sections: Volume V (Audit model)
