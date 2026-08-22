# Capability Coverage Matrix

This matrix tracks how the 25 platform capabilities requested by the product team are mapped across the 18 reference systems in the Verity evidence corpus.

| Capability | High-Coverage Reference | Mid-Coverage Reference | Coverage Analysis |
| :--- | :--- | :--- | :--- |
| **1. Identity** | Keycloak | Frappe, SuiteCRM | Keycloak provides Realm/User schemas. |
| **2. Authorization** | Keycloak, Frappe | Metabase | Keycloak composite roles + Frappe's 3-tier rules cover RBAC/ABAC. |
| **3. Tenancy** | Keycloak | MinIO, Unleash | Realm-isolation (Keycloak) and prefix keys (MinIO). |
| **4. Metadata/modeling** | Frappe | ERPNext, Formbricks | Frappe DocTypes represent runtime schema modeling. |
| **5. Workflow** | Temporal | OpenProject | Temporal represents durable long-running workflows. |
| **6. Automation** | n8n | Temporal | n8n's DAG execution engine models composable automation paths. |
| **7. Scheduling** | Cal.com | ERPNext | Cal.com Availability, Schedules, and Host Weight rules. |
| **8. Work management** | OpenProject, Plane | ERPNext | OpenProject WorkPackages and Plane State Categories. |
| **9. CRM** | SuiteCRM | ERPNext | Leads, Opportunities, and Customer Conversion workflows. |
| **10. Commerce** | Saleor | Odoo | Saleor Order lines, Payments, and Invoices. |
| **11. Inventory** | Odoo | ERPNext | Odoo stock moves, warehouse zones, and serial lots. |
| **12. Documents** | OpenProject | Formbricks | Metadata attachments and signatures. |
| **13. Notifications** | Novu | n8n | Novu provider-agnostic multi-channel workflows. |
| **14. Search** | OpenSearch | Metabase | OpenSearch Query DSL, match/term separation. |
| **15. Analytics** | Metabase | Odoo | Metabase Saved Questions and Dashboard parameters. |
| **16. Collaboration** | Plane | OpenProject | Activities, comments, and mentions. |
| **17. Files** | MinIO | OpenProject | MinIO object buckets, presigned URLs. |
| **18. Audit** | OpenProject, Plane | ActivityWatch | delta-based journals (OpenProject) and activity logs (Plane). |
| **19. Observability** | Temporal | n8n | Execution logs, status flags, and step states. |
| **20. Offline** | *None* | ActivityWatch | **GAP**. ActivityWatch heartbeat pulses show partial synchronization. |
| **21. Geospatial** | OpenSearch | ERPNext | OpenSearch geo_point coordinates, distance-sorting. |
| **22. Integrations** | n8n | Novu | n8n credential registry, credential injection. |
| **23. Configuration** | Frappe | Unleash | Custom fields (Frappe) and feature toggles (Unleash). |
| **24. Extensions** | Frappe | n8n | App hooks (Frappe) and custom node types (n8n). |
| **25. Versioning** | OpenProject | MinIO | OpenProject journals and MinIO object versioning. |
