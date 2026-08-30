# Verity Enterprise — Platform Core & Vertical Packs

This document defines how Verity divides its software assets into a stable "Platform Core" and highly customizable "Vertical Packs" to quickly target diverse industry tenders (Healthcare, Construction, Logistics, PSU, Manufacturing, etc.) without mutating core application code.

---

## 1. Architectural Separation

To allow rapid development without regressions, the platform is partitioned:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              VERTICAL PACKS                            │
│  (Plywood / Sawn Lumber) (PSU Workflows) (Hospital EMR) (Construction) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Runs inside
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           VERITY PLATFORM CORE                         │
│  (Identity & SSO) (Org Hierarchy) (Workforce) (Approvals) (Auditing)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Verity Core Module Specifications
The platform core provides the non-negotiable enterprise infrastructure that every client expects:

1.  **Identity & RBAC**: Keycloak-compatible SSO, active session control, multi-factor authentication (MFA).
2.  **Organizations & Tenancy**: Dynamic nested organization hierarchy (HQ -> Regions -> Yards/Depots -> Teams).
3.  **Workflow & State Engine**: Generic state machine substrate that drives business entity lifecycles.
4.  **Approvals Substrate**: Multi-step approvals queue, delegate routing, and authority checking.
5.  **Evidence Locker**: Secure, checksum-verified file storage for compliance audits, signatures, and PDFs.
6.  **Security Audit Trail**: Non-nullable, append-only logs tracking every user command and access event.
7.  **Report Engine**: Mappings to construct custom charts (KPI grids, donut graphs, bar charts).

---

## 3. Industry Vertical Packs

### Verity Logistics
*   *Transporter Registry*: Track carrier details, vehicle assets, and dispatch queues.
*   *Shipment Tracker*: Lorry Receipt (LR) tracking, transit status milestones (`In Transit`, `Delivered`), and freight cost allocation.

### Verity Construction
*   *Project Sites & Teams*: Site-specific workforce and equipment allocations.
*   *BOQ (Bill of Quantities)*: Estimate material requirements, track logs/ballies, and compute wastage ratios.
*   *Subcontractor Desk*: Manage job cards, contractor invoicing, and progress verifications.

### Verity Government & PSU
*   *Registry Modules*: Multi-tenant database registries for citizens, beneficiaries, or assets.
*   *Case Management*: Dynamic routing of citizen applications through departmental approvals.
*   *DIGIT Integration*: Reference adapters to map municipal services to the eGov DIGIT Works platform.
