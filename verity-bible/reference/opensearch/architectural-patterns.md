# OpenSearch — Architectural Patterns

Source: OpenSearch Documentation (opensearch.org/docs/latest/)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Inverted Index for Text Retrieval

Source: Core Engine Architecture
Pattern: Analyzing and splitting text into tokens, mapping tokens back to documents in an inverted index.
Problem solved: Extremely fast text queries across millions of documents.
Trade-offs: Requires significant RAM and storage overhead; indices must be rebuilt/updated when documents mutate, causing slight index lag (eventual consistency).
Applicability to Verity: HIGH — But for v1, standard PostgreSQL full-text search (TSVector) is sufficient to avoid the operational overhead of a separate search cluster.

---

### Query-Filter Separation

Source: Query DSL
Pattern: Separating scoring queries (`must`, `should`) from non-scoring filter queries (`filter`).
Problem solved: Filters skip relevance scoring and are heavily cached in memory, improving performance.
Applicability to Verity: HIGH — When structuring search, tenant security isolation (e.g. `tenant_id = X`) must be treated as a strict cached filter, while the search query string participates in scoring.

---

### Geo-Hash Indexing

Source: Geo-Point Mapping
Pattern: Dividing the Earth's surface into a grid of geohashes (hierarchical strings) to index spatial data.
Problem solved: Accelerates geographical distance calculations, avoiding expensive trigonometric equations on every search pass.
Applicability to Verity: HIGH — Geospatial queries are a first-class citizen in service territories.
