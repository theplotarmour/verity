# Metabase — Verity Implications

Source: Metabase Documentation and repository models (GitHub: metabase/metabase master branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Abstract Query Pipeline (AST) for Tenant Isolation

Confidence: HIGH
Recommendation: ADOPT
Rationale: Allowing arbitrary reporting queries is insecure. By enforcing an AST-based JSON query builder for reports (similar to Metabase's `dataset_query`), Verity's query processor can automatically inject tenant isolation criteria (`tenant_id = X`) before SQL is generated.
If ADOPT: Analytical endpoints take a structured JSON query object (e.g. specifying select columns, filters, groupings) and compile it into a Prisma/Kysely query, automatically appending tenant filters. Direct raw SQL execution by clients is prohibited.
Affects Bible sections: Volume V (Security & Multi-tenancy), Volume V (Data Architecture)

---

### Collection-based Asset Organization

Confidence: HIGH
Recommendation: ADOPT
Rationale: Reports, dashboards, and automation templates must be organized hierarchically. Metabase's collection model handles folder nesting and inherits permissions.
If ADOPT: Verity implements a `Collection` entity. Work Order templates, report definitions, and custom dashboard layouts are grouped under a Collection. Permissions set on a Collection (e.g. visible to Branch Managers only) cascade to child records.
Affects Bible sections: Volume VI (Configuration & Extension)

---

### Decouple Operational Reports (Built-In) from Self-Service Analytics

Confidence: HIGH
Recommendation: ADOPT
Rationale: Building a full self-service query builder (like Metabase) from scratch is a massive YAGNI violation. Verity needs built-in operational reports (SLA breach rates, technician load, revenue), but self-service BI should be deferred to external integrations via database read-replicas.
If ADOPT: Verity provides pre-built dashboards using fixed widgets. Custom query/exploration features are rejected; instead, document how tenants connect Metabase, PowerBI, or Tableau directly to a dedicated read-replica.
Affects Bible sections: Volume VI (Analytics capability)
