# Unleash — Behavior Inventory

Source: Unleash Documentation (docs.getunleash.io)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Feature Toggle Evaluation Lifecycle

Source: Unleash Client SDK evaluation
Trigger: Code calls `unleash.isEnabled('my-feature', context)`.
Preconditions: Client has synced latest toggle configurations from server.
Steps:
1. Lookup toggle configuration by name.
2. If `enabled` is false, return false immediately (kill-switch check).
3. If no strategies are defined, return true.
4. For each strategy in the toggle's list:
   - Run the strategy evaluation function using the provided `context`.
   - If any strategy returns true, stop evaluation and return true.
5. If all strategies evaluate to false, return false.
Notes for Verity: Evaluating toggles in-memory on the client/backend SDK side is critical for performance — it avoids database queries on every authorization check.

---

### Tenant Context Filtering

Source: Unleash Custom Strategies
Trigger: Checking if a feature is enabled for a specific tenant or branch.
Preconditions: The evaluation call passes `tenant_id` inside `context.properties`.
Steps:
1. Custom strategy compares `context.properties.tenant_id` against the list of allowed tenant IDs configured on the server.
2. If matched, returns true.
Notes for Verity: This behavior enables dynamic feature toggling for multi-tenant SaaS environments.
