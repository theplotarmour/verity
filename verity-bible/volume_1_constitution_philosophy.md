# VERITY MASTER BIBLE — VOLUME I
## Constitution, Product Philosophy, Category & Identity

This volume establishes the foundational constitution of Verity: its purpose, category boundaries, product thesis, visual language foundations, and absolute non-negotiables.

---

## 1. Absolute Constitutional Charter
Verity represents a clean break from traditional legacy enterprise software. We declare these core rules:
1.  **Codebase Subordination [FACT]:** The existing legacy codebase is a secondary draft. If code conflicts with the principles in this Bible, the code must be refactored or discarded.
2.  **Product Over Code [FACT]:** We do not write software to accommodate legacy database schemas or frameworks. We define the business world first, establish its laws and invariants, and enforce them at the compiler level.
3.  **ERP Separation [FACT]:** Verity uses Odoo's feature set solely as a completeness inventory, not as an architectural blueprint. We reject the bloated, module-heavy, accounting-centric models of traditional ERPs.

### Absolute Hierarchy of Authority:
1.  **Explicit Verity Constitutional Decisions**
2.  **Verity Master Bible (This Document & Volumes)**
3.  **Explicit Approved Verity Architecture/Product Decisions**
4.  **Transformed Verity PRD**
5.  **Verified External/Domain Research**
6.  **Odoo-Derived Reference PRD**
7.  **Legacy Verity Codebase (Non-Authoritative)**
8.  **Assumptions / Inference**

---

## 2. The Core Thesis of Verity

> **Verity is an enterprise operations platform for service-driven organizations.**

We define each component of this thesis with absolute precision:

### A. Enterprise
An "Enterprise" in Verity's domain is not defined merely by company size or annual revenue. It is defined by the presence of:
*   **Structured Authority & Multi-Role Hierarchies [FACT]:** Clear boundaries of responsibility between executives, deskless workers, schedulers, supervisors, and external customer contacts.
*   **Operational Scoping Boundaries [FACT]:** Work divided across multiple sites, branches, regions, legal entities, or business units.
*   **Auditability & Non-Repudiation [FACT]:** Strict operational tracking where every mutation, status change, and override is attributable to a specific identity.
*   **Policy Enforcement [FACT]:** Business rules, service level agreements (SLAs), and workflow gates that are programmatically enforced rather than based on manual trust.

### B. Operations
Operations is defined as **the systemized execution of work through people, processes, resources, information, decisions, and events**. 
*   **Operational Data [INFERRED]:** Data that represents action, location, and time (e.g., GPS clock-in telemetry, work orders, photos of completed repairs, checklist submissions).
*   **Operational Exclusion [INFERRED]:** Verity is NOT a general-purpose productivity tool, general document editor, or marketing suite. If an activity does not directly coordinate people, resources, and work lifecycles to fulfill customer obligations, it is excluded.

### C. Service-Driven Organization
Organizations where the product sold is **the execution of work over time by human or physical resources**. Examples optimized for Verity:
*   **Facilities Management & Maintenance Operations [RESEARCHED]:** Managing site cleanings, building repairs, plumbing work, and machinery maintenance.
*   **Field Operations & Technical Services [RESEARCHED]:** Fleet repair, equipment installation, site inspections, and telecom technician deployments.
*   **Security & Guarding Services [RESEARCHED]:** Roster scheduling, patrol verification, shift swaps, incident reporting, and geo-fenced attendance tracking.
*   **Staffing & Shift-Based Workforce Operations [RESEARCHED]:** Roster planning, shift check-ins, and performance reporting.
*   **Contracting & Professional Services [RESEARCHED]:** SLA-governed contracts, dispatching resources, and verifying outcomes.

Verity deliberately excludes **assembly-line manufacturing with physical raw material recipes (BOMs)** and **direct consumer retail storefronts**. It focuses entirely on service delivery operations.

---

## 3. Category Definition
Verity is a **Configurable Operating System for Service-Driven Organizations**. 

### A. The Core Principle: Standardize the Foundation, Not Every Behavior
Verity provides a common operational foundation of standardized primitives, execution semantics, and platform services upon which deeply specialized capabilities and operating systems can be built.

*   **Opinionated Depth**: Rather than forcing every operation into a universal, generic "configurable workflow builder" that compromises usability and depth, Verity allows capabilities to be purpose-built and highly specialized internally.
*   **The Contract Boundary**: A capability may be hard-coded internally to optimize for specialized domains (e.g. security patrol sequencing, field service dispatch engines), but it must expose a stable contract to the platform and other capabilities.
*   **Rule of Specialization**: Prefer purpose-built implementation where specialization materially improves workflow depth, performance, reliability, usability, or domain correctness. Prefer configuration where variation is expected across organizations without compromising those qualities.

### B. Level/Flexibility Matrix
Verity's architectural layers maintain distinct balances between standardization and flexibility:

| Layer | Flexibility | Key Boundary |
| :--- | :--- | :--- |
| **Platform Primitives** | Highly Standardized | Immutable foundation (Party, Work, Location, User). |
| **Reusable Capabilities** | Purpose-Built + Extensible | Opinionated logic exposing a stable contract interface. |
| **Industry Packs** | Deeply Specialized | Structured groupings of capabilities for vertical markets. |
| **Client Systems** | Configurable + Composed | Managed customization; client-specific extensions are isolated. |

### C. The Stable Contract Interface
Every reusable capability must expose its boundary to the platform through:
1.  **Entities**: Domain schemas extending custom fields.
2.  **Actions**: Validated execution commands.
3.  **Events**: Idempotent event bus notifications.
4.  **Permissions**: Scoped RBAC tokens (Verb + Entity + Scope).
5.  **Configuration**: Meta parameters adjusting behavior.
6.  **Extension Points**: Registered lifecycle hooks.
7.  **UI Contributions**: Composable dashboard and table surfaces.

### D. The Four Category Systems
Verity unifies four system categories:

```text
       ┌────────────────────────┐
       │   SYSTEM OF RECORD     │ (Prisma / Postgres) -> Canonical truth
       └───────────┬────────────┘
                   │
       ┌───────────▼────────────┐
       │   SYSTEM OF CONTROL    │ (Rules / SLAs) -> Policy enforcement
       └───────────┬────────────┘
                   │
       ┌───────────▼────────────┐
       │  SYSTEM OF EXECUTION   │ (Mobile / Frontline) -> Task completion
       └───────────┬────────────┘
                   │
       ┌───────────▼────────────┐
       │  SYSTEM OF ENGAGEMENT  │ (B2C Portals / Messaging) -> Dynamic views
       └────────────────────────┘
```

*   **System of Record [FACT]:** Storing structured master data (parties, contracts, locations, assets) and transactional history.
*   **System of Control [FACT]:** Permitting managers to enforce operational boundaries, SLA escalations, and automated approval paths.
*   **System of Execution [FACT]:** Giving frontline, deskless workers a touch-screen friendly, simplified interface to clock into shifts, view tasks, and record completion evidence.
*   **System of Engagement [FACT]:** Exposing whitelabel portals to B2C clients so they can self-book appointments, view catalogs, and track service status.

---

## 4. The Verity Promise

*   **Clarity [INFERRED]:** Operational visibility. Schedulers know who is deployed where; workers know exactly what to do next; clients have clear confirmation of their booking status.
*   **Control [INFERRED]:** Systems cannot run out of bounds. If a site requires a certified technician, the scheduling engine blocks unqualified deployments. If a supervisor attempts to override a policy, the override is logged.
*   **Execution [INFERRED]:** Minimal UI friction. A frontline worker can log in, view their day, clock in via geo-fence, and capture photo evidence in under three taps.
*   **Continuity [INFERRED]:** Information flows cleanly. A B2C booking automatically becomes a scheduled shift, which triggers a worker notification, which generates attendance records, which drafts the customer invoice. No manual re-entry.
*   **Accountability [INFERRED]:** Verifiable operations. All actions are attributable to an authenticated session, with timestamp, geo-location, and associated client credentials.

---

## 5. The Verity North Star

> **To become the universal operational engine that service organizations run on — where complex, industry-specific workflows are composed dynamically from simple, immutable primitives.**

If Verity succeeds:
*   A company can build a security patrol, a cleaning schedule, a medical clinic, or a field technician fleet in under 10 minutes by composing the same underlying primitives (`Work`, `Party`, `Resource`, `Location`) with distinct terms and rules.

---

## 6. What Verity Will Never Become (Anti-Vision)

*   **A Bloated Feature Dump [FACT]:** We do not build features simply because Odoo or a competitor has them. If a feature does not fit within our core primitives, it must not exist in the core.
*   **An Accounting-Centric Model [FACT]:** ERPs often model the world through double-entry ledger lines, forcing operations to look like account balances. In Verity, operational reality (shifts, visits, check-ins) is the first-class model. Accounting is an output.
*   **A "Pretty Spreadsheet" SaaS [INFERRED]:** We do not build static databases. Every entity has a state machine, an event lifecycle, and active invariants.
*   **An Unstructured Low-Code Toy [INFERRED]:** We do not allow customers to write arbitrary, un-versioned database code. We support configuration, not chaotic code injection.
*   **An AI Wrapper [INFERRED]:** Natural language assists, but deterministic platform logic regulates the business. We never trust LLMs to compute payroll, enforce security permissions, or assign shifts.

---

## 7. Product Language & Tone of Voice
Verity communicates with confidence, clarity, and precision.
*   **Calm & Credible [INFERRED]:** We do not use SaaS hype, exclamation marks, or terms like "magical", "transformative", or "revolutionary".
*   **Precise Terminology [INFERRED]:** We call things by their canonical names (e.g., "Shift", "Work Order", "Assigned Resource") rather than developer slang ("jobs", "tasks", "stuff").
*   **Actionable Feedback [INFERRED]:** If an error occurs, the copy explains what happened, why, and exactly how the user can recover.

---

## 8. Brand & Landing Page Law
The landing page and brand visuals must convey **Precision, Control, and Trust**.
*   **Real Product Visuals [INFERRED]:** The landing page displays real interfaces showing actual workflows (e.g., dispatch boards, worker check-ins) instead of abstract gradients or generic 3D illustrations.
*   **Consistent Promise [INFERRED]:** Marketing must never promise capability profiles that the underlying configuration models do not support.

---

## 9. Principle Priority Framework
When two core principles conflict, the following priority list must be applied:
1.  **Safety & Security [INFERRED]:** Data isolation and least-privilege access override all.
2.  **Truth & Correctness [INFERRED]:** Operational data must represent physical reality (e.g., we do not allow backdating check-ins).
3.  **Platform Coherence [INFERRED]:** Primitives must remain unified; we do not build vertical spaghetti.
4.  **Operational Usefulness [INFERRED]:** Solving real-world user issues takes precedence over theoretical aesthetic ideals.
5.  **Simplicity [INFERRED]:** The minimal code footprint and shortest logical path wins.
6.  **Flexibility [INFERRED]:** Configuring is preferred over hardcoding.
7.  **Polish [INFERRED]:** Visual refinements and animations.
