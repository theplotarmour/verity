# OpenSearch — Behavior Inventory

Source: OpenSearch Documentation (opensearch.org/docs/latest/)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Full-Text vs. Exact-Match Resolution

Source evidence: Query DSL (Match vs. Term queries)
Trigger: Evaluating a search request.
Steps:
1. `term` query: compares input string directly to the inverted index values without analysis. Requires exact matches (case-sensitive). Used for status codes, IDs.
2. `match` query: passes input string through the configured analyzer (lowercasing, stemming, tokenizing) before comparing against token index. Enables partial and case-insensitive matching.
Notes for Verity: Verity search must use `keyword` exact-matching for entity ID filtering (e.g. `tenant_id`, `status`), but use analyzed `text` matching for search strings (e.g. problem descriptions, notes).

---

### Geo-Distance Search & Sorting

Source evidence: Query DSL (Geo-queries)
Trigger: Searching for resources within a radius, or sorting work orders by distance from a technician.
Preconditions: Fields indexed as `geo_point`.
Steps:
1. Execute `geo_distance` filter to restrict results within N miles/km of a point (lat/lon).
2. Calculate distances from the origin coordinate to each document's `geo_point` field.
3. Sort results ascending by calculated distance.
Notes for Verity: Essential behavior for geospatial routing and finding the "nearest resource" for urgent work orders.

---

### k-NN Vector Search

Source evidence: Search Plugins (k-NN)
Trigger: Executing semantic search (similarity search based on text meaning, not exact keyword matching).
Preconditions: Index mapping contains a `knn_vector` field; model is loaded.
Steps:
1. Client passes query vector (embedding computed by an external model).
2. OpenSearch performs a nearest-neighbor search using cosine similarity or Euclidean distance.
3. Returns N documents with the closest vector distance.
Notes for Verity: Useful for searching historic work orders or technician notes to find similar past issues ("how was this resolved last time?").
