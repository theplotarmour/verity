# VERITY CONSTITUTIONAL CONCEPT INVENTORY
## Inventory of Platform Concepts, Entities, and Metadata

This document defines the canonical conceptual inventory of the Verity Operating System. Every concept listed here represents a distinct, defined building block with specific ownership, lifecycle, and composition boundaries.

---

## 1. Constitutional Concept Inventory

### 1. Party [FACT]
*   **Definition:** A physical person or corporate entity that interacts with the business.
*   **Purpose:** Unifies all identity relationships (customers, employees, contractors, contacts).
*   **Owner:** Core Identity Capability.
*   **Lifecycle:** `Prospect` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Archived`.
*   **Relationships:** Has zero-or-more `User` identities; has zero-or-one `Resource` capacity representations; holds roles.
*   **Allowed Compositions:** Composite teams, vendor agencies.
*   **Prohibited Compositions:** Cannot be directly assigned to a scheduling calendar without a `Resource` mapping.
*   **Universality:** Core Universal Primitive.

### 2. Organization (Tenant) [FACT]
*   **Definition:** The legal tenant boundary of the operational workspace.
*   **Purpose:** The isolation boundary for multi-tenancy and configuration.
*   **Owner:** Control Plane.
*   **Lifecycle:** `Provisioned` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Terminated`.
*   **Relationships:** Parent of all Locations, Parties, Work, and configurations.
*   **Universality:** Core Universal Primitive.

### 3. User [FACT]
*   **Definition:** An authenticated login credential mapping to a human actor.
*   **Purpose:** System authorization and session tracing.
*   **Owner:** Identity & Access.
*   **Lifecycle:** `Invited` $\rightarrow$ `Active` $\rightarrow$ `Locked` $\rightarrow$ `Deactivated`.
*   **Relationships:** Mapped $1:1$ to a human `Party`.
*   **Universality:** Core Universal Primitive.

### 4. Role [FACT]
*   **Definition:** A named collection of access permissions.
*   **Purpose:** Restricts user interactions based on archetype of authority.
*   **Owner:** Authorization.
*   **Lifecycle:** Static or User-Defined.
*   **Relationships:** Assigned to `TenantMemberships` linking Users to Organizations.
*   **Universality:** Core Universal Primitive.

### 5. Permission [FACT]
*   **Definition:** An explicit grant of authority (Verb + Entity + Scope).
*   **Purpose:** Action-level authorization validation.
*   **Owner:** Authorization.
*   **Relationships:** Contained within Roles.
*   **Universality:** Core Universal Primitive.

### 6. Resource [FACT]
*   **Definition:** Schedulable capacity (human, equipment, space, or team).
*   **Purpose:** The target for calendar reservations and shift assignments.
*   **Owner:** Scheduling & Dispatch.
*   **Lifecycle:** `Active` $\rightarrow$ `In-Maintenance` $\rightarrow$ `Inactive`.
*   **Relationships:** Maps to a human `Party` or physical `Asset`.
*   **Universality:** Core Universal Primitive.

### 7. Asset [FACT]
*   **Definition:** A physical machine, vehicle, tool, or space owned by the organization.
*   **Purpose:** Tracks depreciation, maintenance, and serial identity.
*   **Owner:** Assets Capability.
*   **Lifecycle:** `Acquired` $\rightarrow$ `Deployed` $\rightarrow$ `Maintenance` $\rightarrow$ `Disposed`.
*   **Relationships:** Mapped to a `Location` (deployment site); maps to a `Resource` profile when scheduled.
*   **Universality:** Core Universal Primitive.

### 8. Location [FACT]
*   **Definition:** A geofenced coordinate boundary or physical address.
*   **Purpose:** Sets spatial context for work, roster check-ins, and asset locations.
*   **Owner:** Sites Capability.
*   **Lifecycle:** `Setup` $\rightarrow$ `Active` $\rightarrow$ `Decommissioned`.
*   **Relationships:** Arbitrary parent-child nesting structure (Site $\rightarrow$ Zone $\rightarrow$ Bin).
*   **Universality:** Core Universal Primitive.

### 9. Work [FACT]
*   **Definition:** The universal execution primitive representing a single committed service obligation.
*   **Purpose:** Tracks delivery execution, compliance evidence, and status progression.
*   **Owner:** Work Order Capability.
*   **Lifecycle:** `Draft` $\rightarrow$ `Scheduled` $\rightarrow$ `In-Progress` $\rightarrow$ `Pending-Verification` $\rightarrow$ `Completed` $\rightarrow$ `Closed`.
*   **Relationships:** Links to customer `Party`, `Resource`, `Location`, and `SLA`.
*   **Universality:** Core Universal Primitive.

### 10. Request [FACT]
*   **Definition:** An inbound signal of customer intent or operational incident.
*   **Purpose:** Intake triage prior to committing resource capacity.
*   **Owner:** Helpdesk/Booking Capability.
*   **Lifecycle:** `Triage` $\rightarrow$ `Approved` $\rightarrow$ `Rejected`.
*   **Relationships:** Spawns one-or-more `Work` items upon approval.
*   **Universality:** Core Universal Primitive.

### 11. Activity [FACT]
*   **Definition:** A chronological logging entry of a communication attempt, system action, or timeline event.
*   **Purpose:** Audit-trail and timeline visualization (non-mutating for business state).
*   **Owner:** Timeline Capability.
*   **Lifecycle:** Immutable once created.
*   **Relationships:** Linked to any entity target.
*   **Universality:** Core Universal Primitive.

### 12. Task [FACT]
*   **Definition:** A checklist item or sub-step within a Work Order.
*   **Purpose:** Guides frontline execution steps.
*   **Owner:** Work Order Capability.
*   **Lifecycle:** `Pending` $\rightarrow$ `Completed`.
*   **Relationships:** Owned by a parent `Work` order.
*   **Universality:** Core Universal Primitive.

### 13. Assignment [FACT]
*   **Definition:** The binding relation linking a `Resource` to a specific `Work` or `Shift`.
*   **Purpose:** Lock resource availability.
*   **Owner:** Scheduling & Dispatch.
*   **Relationships:** Maps `Resource` to `Work` or `ShiftSchedule`.
*   **Universality:** Core Universal Primitive.

### 14. Schedule [FACT]
*   **Definition:** The aggregate timeline representing locked capacity allocations.
*   **Purpose:** Dispatch visualization and conflict validation.
*   **Owner:** Scheduling & Dispatch.
*   **Universality:** Core Universal Primitive.

### 15. Shift [FACT]
*   **Definition:** A time window template defining operational working hours (e.g., "Night Shift").
*   **Purpose:** Roster templates.
*   **Owner:** Scheduling & Dispatch.
*   **Universality:** Core Universal Primitive.

### 16. Appointment [FACT]
*   **Definition:** A customer-booked, time-locked scheduling slot for a service product.
*   **Purpose:** Self-serve booking intake.
*   **Owner:** Booking Capability.
*   **Relationships:** Converts to a committed `Work` order and scheduling lock.
*   **Universality:** Core Universal Primitive.

### 17. Contract [FACT]
*   **Definition:** A commercial agreement defining pricing, scopes, and SLA policies.
*   **Purpose:** Revenue management and service compliance bounds.
*   **Owner:** Commercial Contracts.
*   **Lifecycle:** `Draft` $\rightarrow$ `Signed` $\rightarrow$ `Active` $\rightarrow$ `Expired`.
*   **Relationships:** Binds Customer `Party` to a set of billing rules and `SLA` configurations.
*   **Universality:** Core Universal Primitive.

### 18. SLA (Service Level Agreement) [FACT]
*   **Definition:** Explicit response and resolution performance deadlines.
*   **Purpose:** Enforces operational compliance times.
*   **Owner:** SLA Capability.
*   **Relationships:** Attached to `Work` or `Request` based on `Contract` rules.
*   **Universality:** Core Universal Primitive.

### 19. Workflow [FACT]
*   **Definition:** A sequence of actions and state transitions mapping a business process.
*   **Purpose:** Standardizes operational paths.
*   **Owner:** Workflow Engine.
*   **Universality:** Core Universal Primitive.

### 20. State [FACT]
*   **Definition:** A static status enum value of an Entity.
*   **Purpose:** Dictates allowed transitions and actions.
*   **Owner:** Core Engine.
*   **Universality:** Core Universal Primitive.

### 21. Transition [FACT]
*   **Definition:** A valid movement path between States.
*   **Purpose:** Restricts how status changes can occur.
*   **Owner:** Core Engine.
*   **Universality:** Core Universal Primitive.

### 22. Event [FACT]
*   **Definition:** An immutable, historical log of a completed Action.
*   **Purpose:** Asynchronous workflow orchestration.
*   **Owner:** Event Bus.
*   **Universality:** Core Universal Primitive.

### 23. Rule [FACT]
*   **Definition:** A deterministic validation statement (e.g., geofence boundary rules).
*   **Purpose:** Enforces policies on actions.
*   **Owner:** Rules Engine.
*   **Universality:** Core Universal Primitive.

### 24. Automation [FACT]
*   **Definition:** A listener reaction that executes an action when triggered by an event.
*   **Purpose:** Automates repetitive tasks.
*   **Owner:** Rules Engine.
*   **Universality:** Core Universal Primitive.

### 25. Evidence [FACT]
*   **Definition:** Immutably captured verification data (GPS, photos, signatures).
*   **Purpose:** Non-repudiation of field operations.
*   **Owner:** Evidence Capture.
*   **Relationships:** Mapped to `Work` completions or attendance check-ins.
*   **Universality:** Core Universal Primitive.

### 26. Document [FACT]
*   **Definition:** A file record containing metadata (URI, security parameters).
*   **Purpose:** Tracks attachments and records securely.
*   **Owner:** Document Management.
*   **Universality:** Core Universal Primitive.

### 27. Attachment [FACT]
*   **Definition:** A link connecting a `Document` to a specific Entity instance.
*   **Purpose:** Exposes files contextually.
*   **Owner:** Document Management.
*   **Relationships:** Joins `Document` to any target Entity.
*   **Universality:** Core Universal Primitive.

### 28. Notification [FACT]
*   **Definition:** A message sent to an actor across in-app or external channels (SMS, Email, WhatsApp).
*   **Purpose:** Alerts and workflow triggers.
*   **Owner:** Notifications Capability.
*   **Universality:** Core Universal Primitive.

### 29. Approval [FACT]
*   **Definition:** A formal authorization token signed by an privileged principal.
*   **Purpose:** Gates transition execution.
*   **Owner:** Approval Engine.
*   **Universality:** Core Universal Primitive.

### 30. Exception [FACT]
*   **Definition:** A recorded deviation from the planned workflow happy path.
*   **Purpose:** Triggers recovery escalations and flags alerts.
*   **Owner:** Exceptions Engine.
*   **Universality:** Core Universal Primitive.

### 31. Audit Record [FACT]
*   **Definition:** An immutable log tracking who, what, when, and where for every mutation.
*   **Purpose:** Security and operational tracing.
*   **Owner:** Audit Log Capability.
*   **Universality:** Core Universal Primitive.

### 32. Metric [FACT]
*   **Definition:** An aggregate data parameter definition (e.g., "SLA Breach Rate").
*   **Purpose:** Performance analysis.
*   **Owner:** Reporting & Analytics.
*   **Universality:** Core Universal Primitive.

### 33. Configuration [FACT]
*   **Definition:** Parameter settings that alter runtime behavior without modifying code schemas.
*   **Purpose:** Adapts the platform to different business units.
*   **Owner:** Core Configuration.
*   **Universality:** Core Universal Primitive.

### 34. Capability [FACT]
*   **Definition:** A self-contained operational domain containing related entities and workflows.
*   **Purpose:** Modular packaging and billing entitlements.
*   **Owner:** Platform Control Plane.
*   **Universality:** Core Universal Primitive.

### 35. Business System [FACT]
*   **Definition:** A composed instance of Verity configured for a specific tenant organization.
*   **Purpose:** Defines active capabilities, roles, and rules.
*   **Owner:** Platform Control Plane.
*   **Universality:** Core Universal Primitive.

### 36. Industry Pack [FACT]
*   **Definition:** A pre-configured set of capabilities, templates, roles, and forms for a vertical industry.
*   **Purpose:** Speeds up tenant onboarding.
*   **Owner:** Platform Control Plane.
*   **Universality:** Core Universal Primitive.

### 37. Extension [FACT]
*   **Definition:** External code or webhook reactions added without modifying core files.
*   **Purpose:** Customization safety.
*   **Owner:** Platform Control Plane.
*   **Universality:** Core Universal Primitive.
