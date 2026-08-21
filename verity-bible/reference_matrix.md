# VERITY REFERENCE MATRIX
## The Research Contract and Reference Corpus Mapping

This document establishes the **Verity Reference Matrix**, mapping core platform concerns to curated primary and secondary open-source reference systems. These systems are used as architectural evidence and domain benchmarks to design Verity’s core model.

---

## 1. The Reference Matrix

| Verity Platform Concern | Primary Reference | Secondary References | What to Extract |
| :--- | :--- | :--- | :--- |
| **Entity / Meta-Model** | **Frappe Framework** | Odoo ORM, ERPNext | Metadata-driven DocTypes, dynamic schemas, fields, validation, and in-place classical extension mixins. |
| **Business Domains** | **Odoo** | ERPNext | Complete domain coverage, workflow boundaries, and edge cases across CRM, Inventory, Procurement, and HR. |
| **Workflow Engine** | **Temporal** | n8n | Durable state execution, retries, replay-determinism, timeout gates, and failure recovery semantics. |
| **Automation** | **n8n** | Temporal | Event $\rightarrow$ Condition $\rightarrow$ Action triggers, visual node compositions, integrations, and connection credentials. |
| **Identity & Security** | **Keycloak** | Odoo Base, Frappe | Realm isolation, RBAC role hierarchies, resource-based permissions, federated logins, and security audit logs. |
| **Scheduling** | **Cal.com** | Odoo Calendar | Availability slots, calendar bookings, timezone conversions, recursive bookings, and resource calendar locks. |
| **CRM** | **Odoo CRM** | SuiteCRM | Relationship lifecycle stages, pipeline forecasting, activity tracking, and client account hierarchies. |
| **Project & Work** | **OpenProject** | Plane, Odoo Project | Work breakdown hierarchies, Gantt timelines, collaborative tasks, and status transitions. |
| **Commerce** | **Saleor** | Odoo Sales, ERPNext | API-first commerce, catalogs, product variants, order lifecycles, checkout states, and pricing calculators. |
| **Search & Indexing** | **OpenSearch** | — | Search indexes, query parsing, filtering, faceting, relevance rankings, and operational observability logs. |
| **Analytics & BI** | **Metabase** | Odoo Reporting | Semantic data query definitions, dashboard parameters, questions, and self-serve visual reports. |
| **Storage & Blobs** | **MinIO** | Frappe File, Odoo Attach | Object/blob storage mapping, separation of files from database records, signature URLs, and security scopes. |
| **Activity Tracking** | **ActivityWatch** | Odoo Mail | Time-series event logging, user activity streams, and timestamp-based telemetry records. |
| **Platform Builder** | **Frappe Framework** | n8n | Visual workspace composition, form configuration, and packaging capabilities into vertical industry packs. |

---

## 2. The Reference Pipeline

The architectural derivation of Verity flows sequentially through these stages:

```text
  REFERENCE ARCHITECTURE CORPUS (Odoo, Frappe, Temporal, Cal.com, etc.)
               │
               ▼
      VERITY BIBLE & CONCEPT MODEL (Primitives, laws, composition rules)
               │
               ▼
     TRANSFORMATION MATRIX (Strip ERP bloat, map to canonical primitives)
               │
               ▼
             VERITY PRD (Definitive capabilities and requirements)
               │
               ▼
       VERITY IMPLEMENTATION (Codebase construction from scratch)
```

---

## 3. Reference Principles (How We Extract Evidence)
1.  **No Blind Cloning:** We do not copy code or schemas from Odoo or ERPNext. We extract the *business problem* and *operational invariants* they solved, and reconstruct them using Verity’s clean meta-model.
2.  **Framework/Application Separation:** Inspired by Frappe, Verity separates the platform engine (Workspaces, Rules, Event Bus, Tenancy RLS, Sync Engine) from the domain applications (Scheduling, Billing, CRM) to ensure modular upgrades.
3.  **Horizontal Durability:** We reject simple cron loops for complex processes. Inspired by Temporal, long-running business workflows (like employee onboarding, invoice collection schedules, or multi-day service agreements) are modeled as durable state machines with explicit failure/retry states.
