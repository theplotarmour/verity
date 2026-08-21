# VERITY — MASTER BIBLE
## The Constitution, Product Philosophy, Operating Model, Architecture Principles, and Design Law of Verity

This directory contains the **Verity Master Bible**, the highest-level source of truth for the Verity Operating System. Every design decision, engineering implementation, and business rule in the future Verity platform must conform strictly to the laws and primitives defined in these volumes.

---

## Absolute Hierarchy of Authority
When documentation, implementation, or design sources disagree, the following hierarchy of authority must be applied:
1.  **Explicit Verity Constitutional Decisions**
2.  **Verity Master Bible (This Document & Volumes)**
3.  **Explicit Approved Verity Architecture/Product Decisions**
4.  **Transformed Verity PRD**
5.  **Verified External/Domain Research**
6.  **Odoo-Derived Reference PRD**
7.  **Legacy Verity Codebase (Non-Authoritative)**
8.  **Assumptions / Inference**

---

## Directory Structure & Volumes

### 📄 [Volume I: Constitution, Philosophy & Identity](file:///D:/Code/verity/verity-bible/volume_1_constitution_philosophy.md)
*   **Constitutional Charter:** Purpose, identity, and the category definition.
*   **Product Thesis:** Detailed definition of "Enterprise", "Operations", and "Service-Driven Organizations".
*   **The Verity Promise:** Defining clarity, control, execution, continuity, and accountability.
*   **Anti-Vision:** What Verity will never become.

### 📄 [Volume II: Meta-Model & Core Primitives](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md)
*   **The Meta-Model:** Dynamic relations between Entity, Field, Action, State, Transition, Rule, Event, Workflow, Role, and Workspace.
*   **Core Primitives:** Definitions, lifecycles, and invariants for `Party`, `Organization`, `User`, `Role`, `Permission`, `Location`, `Asset`, `Work`, `Request`, and `Contract`.
*   **Configuration Philosophy:** Boundaries between Configuration, Customization, Extension, and Forking.

### 📄 [Volume III: Execution Engine, Workflows & Automations](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md)
*   **Workflow Philosophy:** Modelling real-world operational messiness, human overrides, and exception paths.
*   **State & Event Models:** Core state machine invariants and transactional event rules.
*   **Automation Philosophy:** Explainability, tracing side-effects, and preserving human judgment.
*   **Accountability & Audit:** Audit classifications and tracing business truth vs. system state.

### 📄 [Volume IV: Experience Shells, Workspaces & UX Law](file:///D:/Code/verity/verity-bible/volume_4_experience_ux.md)
*   **UX Constitution:** Information density, visual restraint, table behaviors, detail panels, and empty/error states.
*   **Apple-Level Design Law:** typography precision, negative space, progressive disclosure, and the glassmorphic ban.
*   **Role-Centric Shells & Workspaces:** The design of separate interfaces for the Executive, Manager, Worker, and B2C Customer worlds.

### 📄 [Volume V: Platform Operations, Data, Security & Tenancy](file:///D:/Code/verity/verity-bible/volume_5_operations_security.md)
*   **Tenancy & Security:** Multi-tenant database isolation, cross-tenant leaks, and least-privilege role boundaries.
*   **Data & Integration:** Single-source identity, APIs, webhook structures, and offline-first queue reconciliations.
*   **Ecosystem & Evolution:** Observability rules, versioning, capability upgrades, and the AI position.

### 📄 [Volume VI: Registries & Odoo Transformation Framework](file:///D:/Code/verity/verity-bible/volume_6_registries_transformation.md)
*   **Glossary:** Canonical terms, definitions, prohibited synonyms, and contextual variants.
*   **Invariant & Principle Registers:** Machine-readable invariants and core platform principles.
*   **Odoo Transformation Framework:** Concrete rules for transforming Odoo's module-heavy structures into clean Verity capabilities.
