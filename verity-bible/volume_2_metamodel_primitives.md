# VERITY MASTER BIBLE — VOLUME II
## Meta-Model, Core Primitives & Configuration Philosophy

This volume defines the conceptual schema of Verity: the dynamic Meta-Model that enables composability, the universal primitives that represent business reality, and the rules of configuration and extension.

---

## 1. The Verity Meta-Model
Verity's architectural core is composed of a unified, highly consistent meta-model:

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                        CAPABILITY                           │
  │  (e.g., Scheduling)                                         │
  └──────┬──────────────┬──────────────┬──────────────┬─────────┘
         │              │              │              │
  ┌──────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐  ┌─────▼──────┐
  │  ENTITIES  │  │  ACTIONS   │  │  STATES  │  │  WORKFLOWS │
  └────────────┘  └────────────┘  └──────────┘  └────────────┘
```

*   **Capability:** A self-contained, domain-specific slice of business functionality (e.g., `Scheduling`, `Billing`, `CRM`). It encapsulates all its Entities, Actions, States, Permissions, and Events.
*   **Entity:** A structured data model representing a physical or logical object in the domain. Every Entity belongs to exactly one Capability.
*   **Field:** An attribute of an Entity with strict validation, naming, and type rules.
*   **Relationship:** A semantic link between Entities (one-to-one, one-to-many, many-to-many).
*   **Action:** A mutating transaction that changes the state of one or more Entities. Actions are the only way to write to the database. They enforce preconditions, validate inputs, check permissions, and emit events.
*   **State:** A static status representation of an Entity. An Entity must always exist in exactly one valid State.
*   **Transition:** An allowed movement from one State to another, triggered exclusively by an Action.
*   **Event:** An immutable, historical fact emitted by a Capability when an Action completes. Events are broadcast to the platform's Event Bus.
*   **Rule:** A deterministic logical assertion that validates data or enforces policy constraints.
*   **Workflow:** A sequence of Actions and State transitions coordinating multiple Entities and Capabilities to complete a business outcome.
*   **Role:** A collection of permissions representing an archetype of authority in the workspace.
*   **Workspace:** A customized screen layout and action queue optimized for a specific Role.

---

## 2. Core Primitives
Every industry-specific concept in Verity is built on top of these 10 universal primitives. They must never be duplicated or bypassed.

### 1. Party
*   **Definition:** Any individual, organization, or system actor that participates in the business.
*   **Purpose:** Unifies identity and relation-mapping to avoid duplicate data models (e.g., separating Customer vs. Employee into different tables with redundant contact fields).
*   **Lifecycle:** `Prospect` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Archived`.
*   **Invariants:** Must have a unique global ID, name, and contact details (email or phone).
*   **Anti-Example:** Creating a separate `Stylist` table and a separate `Guard` table; instead, both are a `User` (a specialized Party) linked to different capability profiles.

### 2. Organization (Tenant)
*   **Definition:** The legal or operational entity that holds the workspace.
*   **Purpose:** The ultimate boundary for database multi-tenancy and configuration inheritance.
*   **Lifecycle:** `Provisioned` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Terminated`.
*   **Ownership:** The platform owns the Organization record; the Organization owns all other operational data.
*   **Invariants:** All tenant data (sites, shifts, tickets) must partition logically by `organizationId`.

### 3. User
*   **Definition:** An individual principal linked to an active Party who is authenticated to access Verity.
*   **Purpose:** Represents credentialed human actors.
*   **Lifecycle:** `Invited` $\rightarrow$ `Active` $\rightarrow$ `Suspended` $\rightarrow$ `Deactivated`.
*   **Invariants:** Linked to exactly one `Party` record. Authentication credentials must never live in the `Party` table.

### 4. Role & Permission
*   **Definition:** A Role is a group of Permissions; a Permission is a claim allowing an actor to run an Action on an Entity within a specific Scope.
*   **Scope Levels:** `Global`, `Tenant`, `Site`, `Self`.
*   **Invariants:** Permissions are checked before any Action is executed. There is no silent bypassing of permission validation.

### 5. Location (Site)
*   **Definition:** A physical address or geofenced coordinate region where work occurs.
*   **Purpose:** The context for shift assignments, geo-fenced clock-ins, and asset deployments.
*   **Lifecycle:** `Active` $\rightarrow$ `Inactive` $\rightarrow$ `Archived`.
*   **Invariants:** Must contain latitude, longitude, and radius boundaries if geofencing is enabled.

### 6. Asset
*   **Definition:** A physical item deployed to a Location that requires tracking, maintenance, or schedule locking (e.g., vehicles, specialized tools, rental spaces).
*   **Purpose:** Prevents double-booking of physical resources and tracks operating history.
*   **Invariants:** Must have a unique serial or registration key and be mapped to an owner Location.

### 7. Work (Work Order)
*   **Definition:** An intentional unit of action representing an obligation to perform service.
*   **Purpose:** The central operational thread of Verity.
*   **Lifecycle:** `Draft` $\rightarrow$ `Scheduled` $\rightarrow$ `In-Progress` $\rightarrow$ `Pending-Verification` $\rightarrow$ `Completed` $\rightarrow$ `Closed`.
*   **Invariants:** Must specify a target customer Party, a Location, a deadline/duration, and a target status.

### 8. Request (Ticket)
*   **Definition:** An inbound signal of intent, support, or incident reporting.
*   **Purpose:** The entry point for work before it is committed.
*   **Lifecycle:** `Open` $\rightarrow$ `Assigned` $\rightarrow$ `Resolved` $\rightarrow$ `Closed`.
*   **Invariants:** Can generate a `Work Order` but must preserve original client details.

### 9. Contract & SLA
*   **Definition:** A Contract defines commercial terms; an SLA (Service Level Agreement) defines operational performance deadlines.
*   **Purpose:** Enforces response and resolution targets on Work.
*   **Invariants:** SLA clocks start, pause, and stop based on explicit State transitions.

### 10. Resource
*   **Definition:** An operating unit with scheduled availability (human worker, physical asset, or team).
*   **Purpose:** Used by the scheduling engine to map capacity.
*   **Invariants:** Must declare weekly schedule matrices and skill qualifications.

---

## 3. Configuration Philosophy
Verity is highly configurable, but to prevent system decay, we establish clear boundaries:

| Dimension | Definition | Implementation Method | Governance |
| :--- | :--- | :--- | :--- |
| **Configuration** | Changing parameters, rules, and flags. | Tenant settings, toggle switches, form layout builders. | Self-serve by Tenant Admin. |
| **Customization** | Custom field additions, layout adjustments. | Metadata schema tables (no code changes). | Self-serve within platform boundaries. |
| **Extension** | Custom business logic, API integrations. | External webhooks, platform APIs, sandboxed modules. | Partner or developer code. |
| **Forking** | Modifying core platform logic. | **Prohibited.** | Strictly disallowed to ensure upgrade compatibility. |

### The Configuration Laws:
1.  **Schema Preservation:** Tenant configuration must never mutate the physical PostgreSQL database tables directly. Custom fields must be stored in standardized metadata structures (e.g., JSONB columns) or mapped key-value tables.
2.  **Zero Coding in Admin Panels:** Administrators configure workflows by linking actions and states visually or declaratively; they do not write Javascript, SQL, or custom scripts inside Verity text boxes.
3.  **Upgrade Immunity:** Any configuration or extension must remain fully compatible with platform core upgrades. If a core database migration occurs, all custom fields and tenant-specific workflows must migrate cleanly without manual code refactoring.
