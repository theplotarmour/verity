# Unleash — Concept Inventory

Source: Unleash Documentation (docs.getunleash.io)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Feature Toggle (Flag)

Source: Unleash Toggles Reference
Definition: A configuration object representing a feature or capability that can be dynamically enabled/disabled without changing code.
Key attributes:
- `name` (String) — unique identifier
- `enabled` (Boolean) — master switch
- `type` (release | kill-switch | experiment | operational | permission)
- `strategies` (List of Activation Strategies)
- `variants` (Optional payloads for testing or configurations)
Notes for Verity: Essential mechanism for capability gating.

---

### Activation Strategy

Source: Unleash Activation Strategies
Definition: Rules determining whether a feature is active for a given query context.
Types:
- `default`: on for everyone
- `userWithId`: active for specified user IDs
- `gradualRollout`: active for a percentage of users (hashed by ID)
- `flexibleRollout`: rollout using custom sticky properties
- `remoteAddress`: active for specific IP ranges
- `custom`: rules evaluated against custom context variables (e.g. tenant_id, branch, role)

---

### Context (Unleash Context)

Source: Unleash Context
Definition: The environmental and user properties passed to the evaluation engine to evaluate strategies.
Key attributes: `userId`, `sessionId`, `remoteAddress`, `environment`, `appName`, `properties` (arbitrary key-value map).
Notes for Verity: Verity can pass `tenantId`, `role`, and `region` in the context properties to dynamically enable features.
