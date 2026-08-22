# OpenSearch — Concept Inventory

Source: OpenSearch Documentation (opensearch.org/docs/latest/)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Index

Source evidence: Index APIs (Create Index)
Definition: A logical namespace that maps to one or more physical shards, containing a collection of Documents with similar characteristics (analogous to a database table).
Key attributes: `settings` (shards, replicas, analyzers), `mappings` (field types).
Notes for Verity: Verity will need separate indexes for Work Orders, Customers, Locations, and Resources to optimize search performance.

---

### Mapping

Source evidence: Index Mappings
Definition: Defines how a Document and its fields are stored and indexed (e.g. text analyzer, keyword type, integer, date, geo_point).
Key attributes: `properties` dictionary defining field configurations.
Types of interest:
- `text`: for full-text search (analyzed, tokenized)
- `keyword`: for exact matching and aggregations (not analyzed)
- `geo_point`: for latitude/longitude coordinate indexing (critical for geofencing/distance sorting)
- `knn_vector`: for semantic vector search embeddings

---

### Query DSL (Domain Specific Language)

Source evidence: Query DSL Reference
Definition: The JSON-based query language used to execute searches.
Core structure:
- `leaf queries`: look for a value in a specific field (e.g. `match`, `term`, `range`)
- `compound queries`: combine leaf queries using boolean logic (`bool` query with clauses: `must`, `should`, `must_not`, `filter`)

---

### Aggregation

Source evidence: Aggregations Reference
Definition: Computes metrics or builds buckets over a set of search results (analogous to GROUP BY in SQL, used for faceted search navigation).
Key categories:
- `bucket aggregations`: group documents into buckets (e.g. group by work order status, group by city)
- `metric aggregations`: calculate metrics (e.g. avg travel time, sum revenue)
