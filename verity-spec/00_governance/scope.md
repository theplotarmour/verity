# Verity Master Platform Specification

## 00_governance/scope.md

## Provenance
*   **Primary Sources**: None
*   **Verity Bible Authority**: [verity-bible/volume_1_constitution_philosophy.md](file:///D:/Code/verity/verity-bible/volume_1_constitution_philosophy.md) (Section 2.C: Service-Driven Organization, Section 6: What Verity Will Never Become)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Core Target Industries (In-Scope)

Verity is designed for enterprises where the primary business product is the execution of work over time by human or physical resources. The specification details the domain scope for these core sectors:

### GOV-SCO-001: Facilities Management & Maintenance Operations
*   **In-Scope Sub-domains**:
    *   Dynamic checklist templates for safety, cleaning, and equipment inspection tasks.
    *   Recurring maintenance schedules (monthly, quarterly, yearly PM) generating individual site visits.
    *   Manual supervisor verification gates for job sign-offs.
    *   Asset registries tracking location history and maintenance logs.
*   **Source Reference**: ERPNext Maintenance Schedule, Odoo Maintenance.
*   **Status**: `[UNKNOWN]`

### GOV-SCO-002: Field Operations & Technical Services
*   **In-Scope Sub-domains**:
    *   Geofenced check-in and check-out tracking for technician field shifts.
    *   SLA response time and resolution tracking tied to customer contracts.
    *   Mobile-first evidence collection (compulsory photo upload, digital signature capture).
    *   Optimistic travel time calculations and site-transit warnings.
*   **Source Reference**: Odoo Field Service, Cal.com scheduling.
*   **Status**: `[UNKNOWN]`

### GOV-SCO-003: Security & Guarding Services
*   **In-Scope Sub-domains**:
    *   Roster planning, shift rosters, and real-time attendance check-ins.
    *   Geofenced patrol route verification (checking coordinates at specific waypoint timestamps).
    *   Incident log reporting with compulsory photo/text attachments.
    *   Shift swaps, overtime limits validation, and replacement routing.
*   **Source Reference**: ActivityWatch pulse tracking, Keycloak role groupings.
*   **Status**: `[UNKNOWN]`

### GOV-SCO-004: Staffing & Shift-Based Workforce Operations
*   **In-Scope Sub-domains**:
    *   Roster templates matching resource skill tags to job requirements.
    *   Worker timesheet logging, spent hours aggregation, and billing drafting.
    *   Leave management, out-of-office blocking, and automated substitute assignments.
*   **Source Reference**: Odoo HR, Cal.com scheduling.
*   **Status**: `[UNKNOWN]`

---

## 2. Excluded Domains (Out-of-Scope)

To prevent feature bloat and maintain a lean operational core, the following domains are strictly out-of-scope for the Verity platform:

### GOV-SCO-005: Raw Material Manufacturing & Assembly (BOM)
*   **Excluded**: Assembly-line tracking, physical raw material bills of materials (BOM), work center routing operations, and shop-floor machinery execution tracking.
*   **Status**: `[UNKNOWN]`

### GOV-SCO-006: Consumer Retail Storefronts & POS Hardware
*   **Excluded**: B2C retail storefront web checkouts, retail inventory barcode scanners, physical cashier cash drawer registry, and retail store return policies.
*   **Status**: `[UNKNOWN]`

### GOV-SCO-007: General Ledger Accounting (Double-Entry Ledger)
*   **Excluded**: Double-entry ledger postings, chart of accounts management, tax reconciliation reports, bank statement feed sync, and asset depreciation calculations. Verity generates *billing drafts* and *invoices* (operational data), but general ledger execution must be handled by external integrations.
*   **Status**: `[UNKNOWN]`
