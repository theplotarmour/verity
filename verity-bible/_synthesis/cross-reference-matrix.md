# Cross-Reference Matrix

This matrix maps every reference system in the Verity evidence corpus to the core platform concerns it informs.

| Reference System | Core Platform Concern Addressed | Key Source Pinned / Inspected | Primary Concept Extracted |
| :--- | :--- | :--- | :--- |
| **Odoo** | Domain breadth, ERP features | `odoo-prd/` | Modularity, Active-Record business objects |
| **Frappe** | Metamodel & Extensibility | `frappe/model/document.py` | DocTypes, runtime Custom Fields, Child Tables |
| **Temporal** | Workflow durability & Orchestration | `service/history/workflow/mutable_state_impl.go` | Event-sourcing, MutableState, Activity boundaries |
| **Keycloak** | Identity, Auth & Tenancy | `server-spi/.../RealmModel.java` | Realms as tenancy, Composite Roles, UMA |
| **n8n** | Dynamic Workflow Engine | `packages/core/.../workflow-execute.ts` | Node-graph DAG execution, Credentials injection |
| **Cal.com** | Resource Availability & Scheduling | `packages/prisma/schema.prisma` | EventTypes, Schedules, TTL soft-reservations |
| **ERPNext** | Business Domain Layer | `projects/doctype/project/project.json` | Project/Task hierarchy, Periodicity-based PM Visits |
| **OpenProject** | WBS & Dependency Relations | `app/models/relation.rb` | WorkPackages, decoupling hierarchy from DAG relations |
| **Saleor** | Commerce & Order Lifecycle | `saleor/order/models.py` | Decoupling logistical status from billing status |
| **OpenSearch** | Search and Analytics | Query DSL, Geo-Distance APIs | Cached filters, geo-point coordinates, text indexing |
| **Metabase** | Operational Reports & Dashboards | `src/metabase/models/card.clj` | AST-based query sandboxing, Collection inheritance |
| **Plane** | Collaborative Work | `apiserver/plane/db/models/issue.py` | State Categories vs. Status Labels, Activity logs |
| **MinIO** | Document/File Storage | Object Management & Presigned APIs | Presigned client uploads, prefix-based multi-tenancy |
| **ActivityWatch** | Time Tracking & Logging | `aw_core/models.py` | Duration-based Events, heartbeat pulse-merging |
| **SuiteCRM** | Customer Pipeline | Leads/Opportunities metadata | Lead Conversion, Opportunity stage values |
| **Novu** | Multi-channel Notifications | Workflow SDK, Subscribers API | Provider-agnostic routing, template Handlebars parsing |
| **Unleash** | Feature Gating & Capabilities | Feature Toggles, Context properties | In-memory evaluation, context-driven strategies |
| **Formbricks** | Evidence Forms & Checklists | `packages/types/surveys/types.ts` | JSON Survey schemas, skip logic, Response decoupling |

---

## Synthesis Insights

1. **Monolithic Data (Odoo/Frappe) vs. Event-Sourced Operations (Temporal/ActivityWatch)**: Odoo and Frappe use mutable rows representing entity state. Temporal and ActivityWatch use append-only logs. Verity adopts a hybrid: snapshotted DB rows for operational dispatch, backed by immutable event logs for SLA auditing.
2. **Hard Isolation (Keycloak/MinIO) vs. Shared Identity (Frappe/Metabase)**: Keycloak Realms and MinIO Buckets support hard isolation. Metabase and Frappe support dynamic filters. Verity adapts: hard database-level tenant routing (tenant_id in all queries), with shared identity capability for cross-tenant users.
3. **Template vs. Execution Decoupling (Cal.com/Formbricks)**: Cal.com (EventTypes vs. Bookings) and Formbricks (Surveys vs. Responses) show that business platforms must define layout/rule templates separately from active instances. Verity standardizes this pattern for Work Order templates and checklist tasks.
