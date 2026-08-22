# Unleash — Architectural Patterns

Source: Unleash Documentation (docs.getunleash.io)
Date inspected: 2026-08-22
Confidence: HIGH

---

### In-Memory Evaluation with Periodic Server Sync

Source: Unleash SDK Architecture
Pattern: The application backend imports the Unleash SDK which downloads the entire flag configuration into memory. Evaluation calls (`isEnabled`) run locally in microsecond speeds. A background thread polls the Unleash server (or uses WebSockets) to keep configurations fresh.
Problem solved: Eliminates network latency and prevents the database from bottlenecking on authorization checks.
Applicability to Verity: HIGH — Verity's tenant capability check (e.g. "Does Tenant X have GPS tracking active?") must be checked in-memory without hits to SQL.

---

### Context-driven Strategy Routing

Source: Unleash Activation Strategies
Pattern: Toggles are decoupled from specific users/tenants. Instead, they are mapped to abstract rules (Strategies) evaluated against a dynamic `Context` envelope.
Problem solved: Avoids hardcoding tenant IDs in application code; configuration remains purely declarative on the server.
Applicability to Verity: HIGH — Capability validation should read rules from the tenant context.
