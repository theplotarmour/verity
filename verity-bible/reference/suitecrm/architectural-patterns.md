# SuiteCRM — Architectural Patterns

Source: SuiteCRM Modules metadata (GitHub: salesagility/SuiteCRM master branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Three-Tier Commercial Sales Funnel (Lead → Account/Contact → Opportunity)

Source: CRM core modules
Pattern: A sales relationship begins as a transient `Lead` (person + company + interest merged). If qualified, it splits into structural entities: `Account` (the company), `Contact` (the person), and `Opportunity` (the commercial deal).
Problem solved: Keeps the primary customer database clean of unqualified prospects.
Applicability to Verity: HIGH — Service dispatchers often receive requests from non-customers. Modeling these as unqualified "Service Leads" before creating permanent Customer Accounts prevents database pollution.

---

### Module-based Field Override (Vardefs)

Source: SuiteCRM Vardefs Architecture
Pattern: Database schemas and layouts are configured via PHP arrays (`vardefs`). These can be customized locally on a per-module basis without editing standard table files.
Problem solved: Extensibility and customization of fields per deployment.
Applicability to Verity: MEDIUM — Evaluated under Frappe implications; dynamic JSONB is preferred over PHP array overrides.
