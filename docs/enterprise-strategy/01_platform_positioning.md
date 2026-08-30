# Verity Enterprise — Strategic Platform Positioning

This document defines the core product transition of Verity from a multi-tenant cloud SaaS product into a deployable, enterprise-grade operations platform designed for high-ticket client contracts (₹10L to ₹1Cr+ commercial tenders, PSUs, private airports, and large corporates).

---

## 1. B2B Enterprise Reality
In high-ticket sectors, big corporates and government departments do not register accounts on public SaaS clouds. Security policies, data sovereignty laws (e.g., DPDP in India), and internal IT mandates require that the software be **deployed and owned inside the client's own infrastructure**.

Verity's strategic positioning must shift:
*   **Old Positioning**: "A standard ERP cloud software for small MSMEs."
*   **New Positioning**: "A modular, deployable enterprise operations platform running securely on your private cloud or on-premise infrastructure."

---

## 2. The Three Deployment Editions
To cover both high-density MSME markets and high-ticket enterprise contracts, the same core codebase must run in three distinct modes:

| Edition | Customer Segment | Hosting Infrastructure |
|---|---|---|
| **Verity Cloud** | Small and medium businesses (MSMEs) | Shared, multi-tenant cloud (Vercel + Supabase) managed by us. |
| **Verity Dedicated** | Large private companies | Single-tenant, isolated VM or private cloud account managed by us. |
| **Verity Enterprise** | PSUs, Government, Big Corporates | Client's internal data center, private cloud, or physical on-premise servers. |

---

## 3. Financial & Tender Economics
In a typical ₹40L–₹1Cr project, the value is not derived solely from writing fresh code from scratch. Instead, it turns on **integration, delivery execution, accountability, and customized workflows**.

### Typical ₹40 Lakh Tender Breakdown:
```
┌─────────────────────────────────────────────────────────┐
│  Verity Software License (Core Platform)     : ₹8,00000 │
├─────────────────────────────────────────────────────────┤
│  Custom Workflow & Feature Engineering       : ₹9,00000 │
├─────────────────────────────────────────────────────────┤
│  B2B/Gov Systems Integration (e.g. GST/SSO) : ₹7,00000 │
├─────────────────────────────────────────────────────────┤
│  Data Migration & Cleaning                   : ₹3,00000 │
├─────────────────────────────────────────────────────────┤
│  Infrastructure Deployment & Securing        : ₹4,00000 │
├─────────────────────────────────────────────────────────┤
│  UAT, Training & Operational Sign-off        : ₹2,00000 │
├─────────────────────────────────────────────────────────┤
│  Annual Maintenance Contract (AMC / SLA)     : ₹7,00000 │
└─────────────────────────────────────────────────────────┘
```
Reusing proven open-source architectures (like DIGIT for government registries or Keycloak for SSO) allows Verity to deliver a ₹1Cr-grade system with a small, high-leverage engineering team.
