# Missing Capability Report

This report identifies critical business capabilities requested for Verity that are unsupported or not modeled by the 18 reference systems, requiring custom design.

---

### 1. Document Lifecycle & Approval Workflows

* **Description**: Verity requires formal document lifecycles (e.g. drafting, review, compliance approval, electronic signature capture) for work order sign-offs.
* **Why References Fall Short**: MinIO provides pure object storage (buckets/keys). OpenProject has basic attachment references. No reference models the compliance workflow of a document (e.g. PDF generation, signature sealing, revision locking).
* **Verity Design Requirement**: Verity must implement a dedicated `Document` entity carrying a state machine (Draft | In Review | Approved | Sealed) and an integration with signature providers (or local cryptographic hash signing).

---

### 2. Geographic Service Territories and Travel Routing

* **Description**: Work orders must be grouped into geofenced service territories (polygons) and technicians must be routed to optimize travel time.
* **Why References Fall Short**: Cal.com has zero geographical awareness. OpenSearch has radial filters (`geo_distance`) but cannot calculate road travel distance, routing paths, or travel time matrices between multiple site locations.
* **Verity Design Requirement**: Verity requires a specialized `Territory` entity representing polygon bounds (GIS coordinates). Scheduling logic must call external routing engines (e.g. OSRM, Google Maps API) to compute travel time buffers between consecutive work bookings.

---

### 3. Offline Client Data Synchronization and Merge Resolution

* **Description**: Technicians must execute work orders (fill checklists, upload photos, change status) in areas without cellular connectivity, with changes syncing back seamlessly upon reconnection.
* **Why References Fall Short**: Systems like Keycloak, Temporal, n8n, and Metabase assume constant server connectivity. ActivityWatch is local-first but has no server-merge conflict resolution protocol for multi-user transactional data.
* **Verity Design Requirement**: Verity must implement an offline sync queue on the mobile client. Local mutations are queued and signed with a client-side timestamp. The server resolves sync conflicts using a Last-Write-Wins (LWW) register scoped to specific fields or prompts dispatchers for manual merges.

---

### 4. Real-time Collaboration Presence

* **Description**: Prevent two dispatchers from editing the same work order scheduling details simultaneously.
* **Why References Fall Short**: Plane has issue comments and assignments but lacks real-time operational presence (indicating who is currently viewing/editing a dashboard widget).
* **Verity Design Requirement**: Verity needs a WebSocket presence service (using Redis pub/sub) that broadcasts active user sessions viewing specific entity IDs, lock-protecting forms when a user begins editing.
