# VERITY REFERENCE CORPUS — VOLUME 5
## Commerce, Search, Analytics, Storage & Collaboration

This volume documents findings from specialized application systems, defining how Verity handles checkout lifecycles, search indexing, data analytics, file storage, and event streams.

---

## 1. Saleor
*   **Domain Focus:** Modern headless commerce.
*   **Target Extract:** Product variants, checkout lifecycle, catalog structure.

### A. Concept Mappings:
*   *Saleor ProductVariant:* Maps to Verity’s `Product` variant definitions.
*   *Saleor Checkout:* Maps to Verity’s `Cart & Checkout` flow for digital menus.

### B. Invariants:
*   Product price is stored as an integer (`pricePaise`) to prevent floating-point rounding errors during tax calculations.

---

## 2. OpenSearch
*   **Domain Focus:** Search, indexing, and observability.
*   **Target Extract:** Search relevance, filters, faceting.

### A. Concept Mappings:
*   *OpenSearch Index:* Maps to Verity’s read-optimized search projections (caches).

### B. Invariants:
*   Search results must respect tenant and role permissions at query-time (access-aware search).

---

## 3. Metabase
*   **Domain Focus:** Data exploration and BI.
*   **Target Extract:** Semantic query definitions, self-serve dashboards.

### A. Concept Mappings:
*   *Metabase Question:* Maps to Verity’s reporting `Metric` definitions.

### B. Invariants:
*   Analytics queries run against a read-replica database to prevent reporting queries from locking active execution transactions.

---

## 4. Plane
*   **Domain Focus:** Work collaboration.
*   **Target Extract:** Modern UI layout lists, Gantt views.

### A. Concept Mappings:
*   *Plane Issue:* Maps to Verity’s **`Work`** order queue.

---

## 5. MinIO
*   **Domain Focus:** Object storage.
*   **Target Extract:** Blob storage isolation.

### A. Concept Mappings:
*   *MinIO Bucket:* Scoped per Tenant Organization to prevent cross-tenant media access.

---

## 6. ActivityWatch
*   **Domain Focus:** Time-series event logging.
*   **Target Extract:** Event-timeline concepts.

### A. Concept Mappings:
*   *ActivityWatch Bucket:* Maps to Verity’s chronological `Activity` logs.
