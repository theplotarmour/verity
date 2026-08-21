# VERITY REFERENCE CORPUS — VOLUME 4
## Identity, Security & Scheduling: Keycloak & Cal.com

This volume documents our architectural findings and concept extractions from Keycloak and Cal.com, establishing Verity’s access-control boundaries and timezone-aware resource scheduling.

---

## 1. Keycloak
*   **Domain Focus:** Identity and Access Management (IAM).
*   **Target Extract:** Organizations/realms, groups, user federation, authentication, and scopes.

### A. Concept Comparison & Mappings:
*   *Keycloak Realm:* Maps to Verity’s **`Organization`** (Tenant) boundary. Realms share zero data and define independent authentication realms.
*   *Keycloak Group:* Maps to Verity’s role groupings. Users belong to Groups, which inherit Roles.
*   *Keycloak Resource Permission:* Maps to Verity’s granular action permissions (Scope-based validation).

### B. Invariants Discovered:
*   **Isolation Integrity:** Authentication tokens are scoped to exactly one Organization. Switching tenants invalidates the active token and issues a new session context.

### C. Edge Cases & Operational Reality:
*   *Impersonation Audit:* When a platform admin impersonates a tenant user to troubleshoot, the session must record the actor ID and impersonation ticket. Verity implements a strict audit lock on impersonated transactions.

---

## 2. Cal.com
*   **Domain Focus:** Scheduling, bookings, and availability.
*   **Target Extract:** Timezone complexity, slot calculations, resource calendars, and recursive bookings.

### A. Concept Comparison & Mappings:
*   *Cal.com Booking:* Maps to Verity’s **`Appointment`** / scheduling lock.
*   *Cal.com Availability Schedule:* Maps to Verity’s **`Resource`** working hours calendar.

### B. Invariants Discovered:
*   **Conflict Prevention:** A Resource cannot be booked in overlapping start-to-end datetime slots unless the calendar is flagged as a shared pool.
*   **Timezone Normalization:** All calendar locks must store in UTC. Timezone calculations must apply at the presentation layer based on the Location or User timezone settings.

### C. Edge Cases & Operational Reality:
*   *Daylight Saving Time (DST) Jumps:* When scheduling a recurring shift (e.g., every Tuesday at 09:00 AM) in a location that implements DST, the slot offset changes relative to UTC. Verity resolves this by storing recurrent rules in local time and calculating UTC dates dynamically.
