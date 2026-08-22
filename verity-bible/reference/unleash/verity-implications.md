# Unleash — Verity Implications

Source: Unleash Documentation (docs.getunleash.io)
Date inspected: 2026-08-22
Confidence: HIGH

---

### In-Memory Capability Validation

Confidence: HIGH
Recommendation: ADOPT
Rationale: Verity is a multi-tenant platform where different tenants subscribe to different tiers (e.g. Basic, Premium). Checking subscription-level capabilities (like GIS geo-routing) on every API request or UI render will thrash the database if done via SQL queries.
If ADOPT: Tenant capability flags are cached in-memory (e.g. in Redis or local process cache) and evaluated locally using a tenant context object.
Affects Bible sections: Volume V (Data Architecture), Volume VI (Configuration & Extension)

---

### Decouple Feature Flags from Subscription Entitlements

Confidence: HIGH
Recommendation: ADOPT
Rationale: A billing subscription (e.g. "Enterprise Plan") is not the same as a feature flag. Unleash's context-driven strategies allow mapping multiple subscription tiers to specific capabilities.
If ADOPT: The application checks for named capabilities: `CapabilityService.has(tenantId, "gis.routing")`. A separate mapping registry maps subscription plans or individual tenant overrides to these capabilities. The codebase never references billing plans directly — only capabilities.
Affects Bible sections: Volume II (Tenant/Organization model), Volume VI (Capabilities capability)
