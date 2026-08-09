from __future__ import annotations

from pathlib import Path
import shutil
import textwrap


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


def dedent(text: str) -> str:
    return textwrap.dedent(text).strip() + "\n"


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dedent(content), encoding="utf-8")


def reset_docs() -> None:
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir(parents=True, exist_ok=True)

    for legacy in [ROOT / "prd", ROOT / "prd-v2"]:
        if legacy.exists():
            shutil.rmtree(legacy)


def build_docs() -> None:
    write(
        DOCS / "README.md",
        """
        # Verity Documentation Authority

        `docs/` is the only canonical source of truth for Verity product, architecture, workflow, data, design, API, security, deployment, and roadmap decisions.

        ## Canon Rules

        - If a feature is not documented here, it is not ready to be implemented.
        - If code and docs disagree, the docs define the intended system and the code must be brought back into alignment.
        - Research material is input, not authority. Canonical decisions must graduate into architecture, engine, workflow, data model, or ADR documents.
        - Verity is described as a production-grade configurable Factory Operating System. Do not describe it as an MVP.

        ## Reading Order

        1. `00_Vision/01_Verity_Vision.md`
        2. `01_Product/01_Product_Bible.md`
        3. `14_DECISIONS/0001-why-verity-docs-are-canonical.md`
        4. `03_Architecture/01_Architecture_Overview.md`
        5. `04_Business_Engines/`
        6. `06_Modular_Workflows/`
        7. `08_Data_Model/`
        8. `09_Design_System/`
        9. `10_API/`
        10. `11_Security/`
        11. `12_Deployment/`
        12. `13_Roadmap/`

        ## Folder Map

        - `00_Vision`: mission, philosophy, principles, non-goals
        - `01_Product`: product strategy, operating thesis, market, value capture
        - `02_Research`: research inputs and inspiration map
        - `03_Architecture`: platform structure and technical strategy
        - `04_Business_Engines`: one canonical document per major business engine
        - `05_Factory_Builder`: owner-configurable systems
        - `06_Modular_Workflows`: operational lifecycle and cross-engine workflows
        - `07_User_Experiences`: role-based operating journeys
        - `08_Data_Model`: domain entities and schema authority
        - `09_Design_System`: actual interface language and interaction rules
        - `10_API`: module API contracts and integration boundaries
        - `11_Security`: auth, authorization, audit, secrets, recovery, and offline safeguards
        - `12_Deployment`: production infrastructure and operational runbook
        - `13_Roadmap`: maturity phases
        - `14_DECISIONS`: architecture decision records
        """,
    )

    write(
        DOCS / "00_Vision/01_Verity_Vision.md",
        """
        # Verity Vision

        ## Why Verity Exists

        Manufacturing SMEs do not need another generic ERP menu tree. They need a configurable operating system that translates products, materials, departments, quality rules, and execution logic into daily production behavior without repeated data entry and without permanent developer dependence.

        Verity exists to let a factory define its business once and reuse that definition across sales, production, inventory, quality, dispatch, reporting, worker guidance, and future automation.

        ## Mission

        Build the most operator-friendly Factory Operating System for production-led manufacturers, with blueprints and business engines as the reusable core.

        ## Product Philosophy

        - Configure once. Reuse everywhere.
        - Blueprints are the DNA of operational execution.
        - Engines own business logic. Tasks are downstream artifacts, not the core abstraction.
        - Factory owners configure the business. Developers extend platform capabilities.
        - Every role should experience Verity as a focused operating surface, not a back-office form dump.

        ## Core Principles

        - Production-grade first: documentation, implementation, data, and deployment must be designed for durable operation.
        - Event-driven coordination: engines react to business events and create the operational side effects they own.
        - Role clarity: owner, manager, inspector, and worker surfaces must stay distinct and purpose-built.
        - Bounded complexity: the platform may be deep, but each screen and workflow should remain understandable to the actor using it.
        - Reusability over duplication: product setup should propagate through planning, execution, quality, and reporting.
        - Canon over drift: product intent lives in docs before it lives in code.

        ## Non-Goals

        - Verity is not a generic horizontal task manager.
        - Verity is not a report-only BI shell.
        - Verity is not a clone of ERPNext, SAP, Odoo, or Katana.
        - Verity should not require developer intervention for ordinary factory configuration such as product, route, QC, or dashboard updates.

        ## Product Statement

        Verity is a configurable Factory Operating System where business engines and reusable blueprints let a manufacturing organization launch products, run departments, control quality, guide workers, and scale execution without fragmenting operational truth across disconnected modules.
        """,
    )

    write(
        DOCS / "01_Product/01_Product_Bible.md",
        """
        # Product Bible

        ## Product Identity

        Verity is a production-grade Factory Operating System for manufacturing organizations that need configurable operational depth without enterprise-software complexity leaking into daily execution.

        ## Strategic Thesis

        The differentiator is not broad module count alone. The differentiator is that every module is powered by reusable blueprint and engine logic, then surfaced through role-specific experiences that feel simple to operators.

        ## Target Market

        - Primary: manufacturing SMEs and growth-stage factories with multi-step production, quality control, stock movement, and dispatch coordination
        - Strong fit: operators who need route control, QC evidence, inventory accountability, and configuration flexibility
        - Initial operational bias in the current codebase: seat covers and automotive fitment-heavy production, but the platform direction is broader than one vertical

        ## Ideal Customer Profile

        - Production-led owner or co-owner
        - Small operations team managing departments and shift execution
        - Repetitive but configurable product workflows
        - Need for worker-facing mobile execution and owner-facing desktop oversight
        - Need for offline-tolerant PWA behavior

        ## Business Model Direction

        - Platform subscription anchored in operational value
        - Setup and onboarding fees for factory enablement
        - Optional expansion through automation, advanced planning, AI, multi-factory, portals, and intelligence layers

        ## Competitive Positioning

        - Against ERP suites: Verity wins on operator clarity, blueprint-centered reuse, and configurable execution
        - Against narrow QC tools: Verity wins by connecting quality to sales, planning, stock, routing, and dispatch
        - Against generic SaaS dashboards: Verity wins by owning the operating system, not just reporting

        ## Core Product Pillars

        - Business Engines
        - Blueprints
        - Factory Builder
        - Modular Workflows
        - Role-Specific Experiences
        - Event-Driven Operational Coordination

        ## Owner Philosophy

        The owner should be able to define products, production routes, quality requirements, team structure, dashboard views, and supporting documents without waiting for developers.

        ## Worker Philosophy

        The worker should see exactly one relevant job context at a time, with large actions, clear instructions, evidence capture where required, and minimal cognitive overhead.

        ## Success Metrics

        - New product configuration time
        - Time from sales order to production release
        - QC evidence completion rate
        - Rework rate by blueprint, department, and product family
        - Dispatch readiness accuracy
        - Daily active execution users by role
        - Time for owner/admin to update operational configuration without engineering support

        ## Canonical Product Language

        - Factory Operating System
        - Business Engine
        - Blueprint
        - Factory Builder
        - Modular Workflow
        - Universal Inbox
        - Production-Grade PWA
        """,
    )

    write(
        DOCS / "02_Research/01_Research_Map.md",
        """
        # Research Map

        ## Purpose

        This folder captures research inputs that inform Verity. These references are useful inputs, but they are not canonical requirements until converted into decision, architecture, workflow, or engine documents.

        ## Research Buckets

        - Real manufacturing ERP and MES case studies
        - SaaS dashboard and navigation patterns
        - Component-level design systems and Figma references
        - Manufacturing implementation stories from ERPNext, Odoo, Katana, Tulip, FactoryFour, Zoho Inventory, and related products

        ## How Research Should Be Used

        - Extract workflow logic from real manufacturing systems
        - Borrow visual patterns only after adapting them to Verity role semantics
        - Use research to identify operational expectations, not to justify copying another product
        - Promote durable conclusions into canonical docs

        ## Current Research Conclusions

        - Blueprints should own reusable operational definition
        - Engines should coordinate around events rather than generic task abstractions
        - Owner configuration should feel closer to Shopify-style guided building than ERP-grade form overload
        - Worker mobile experiences must remain single-job and action-first
        - Knowledge artifacts should be directly linked to blueprint execution
        """,
    )

    write(
        DOCS / "03_Architecture/01_Architecture_Overview.md",
        """
        # Architecture Overview

        ## Current Technical Base

        - Next.js 16.2.10 with App Router
        - React 19.2.4
        - TypeScript
        - Prisma with PostgreSQL
        - Supabase packages for auth and backend access
        - Serwist-based PWA support
        - S3-compatible storage support

        ## Architectural Shape

        Verity should be organized as a configurable operating platform where business engines own state transitions and operational decisions, while route surfaces, server actions, storage utilities, and worker UIs expose those capabilities to specific roles.

        ## Architectural Layers

        - Experience layer: owner, worker, inspector, onboarding, verification, agreement, offline
        - Workflow layer: multi-step operational lifecycles spanning engines
        - Engine layer: CRM, Blueprint, Production, Inventory, Purchase, Quality, Dispatch, People, Analytics, Knowledge
        - Platform layer: auth, permissions, notifications, audit, storage, PWA, sync, offline
        - Data layer: Prisma schema, relational integrity, event emission, materialized operational state

        ## Current Code Surface

        The current repository already exposes:

        - owner routes for dashboard, floor, inventory, orders, production, purchase, QC floor, reports, review, search, settings, system, team, users
        - worker routes for home, inspection, history, profile
        - inspector routes for inbox, review, rejected, verified, profile
        - agreement and verification routes
        - server actions for auth, orders, production, purchase, inventory, QC, employees, departments, workers, inspectors, team, users, storage, setup, and HQ flows

        ## Required Direction

        The implementation should converge on:

        - explicit business events
        - reusable blueprints and templates
        - owner-controlled configuration via Factory Builder
        - offline-safe execution surfaces
        - durable migration strategy and production deployment posture
        """,
    )

    write(
        DOCS / "03_Architecture/02_Event_System.md",
        """
        # Event System

        ## Purpose

        Verity should coordinate engines through business events, not through a generic task table pretending to represent every operational action.

        ## Canonical Event Philosophy

        A business event captures that something meaningful happened in the factory operating system. Engines subscribe to those events and create the side effects they own.

        ## Example Event Chain

        - Sales order created
        - Material reservation requested
        - Production plan generated
        - Work order released
        - Department job started
        - QC submitted
        - Rework requested
        - Dispatch marked ready

        ## Event Requirements

        - clear event names
        - emitting actor and factory context
        - timestamps
        - affected aggregate identifiers
        - idempotent downstream handling
        - audit visibility
        - notification hooks

        ## Current Gap

        The current codebase has timeline and audit-related models, but it does not yet formalize the event system as the operating spine. This document establishes that direction as canonical.
        """,
    )

    write(
        DOCS / "03_Architecture/03_Blueprint_System.md",
        """
        # Blueprint System

        ## Purpose

        The Blueprint System is the reusable operational DNA of Verity.

        ## What a Blueprint Must Control

        - product variant context
        - active versioning
        - route steps by department
        - estimated execution time
        - linked QC template
        - linked BOM
        - linked factory knowledge documents
        - downstream planning and execution behavior

        ## Canonical Rules

        - Every product family that enters production should resolve to a blueprint version.
        - Blueprint versions are explicit and auditable.
        - Route and QC logic should be derived from blueprints, not duplicated ad hoc in separate modules.
        - Knowledge assets should be attached directly to blueprint versions.

        ## Current Schema Alignment

        The current Prisma schema already includes `Blueprint`, `BlueprintVersion`, `BlueprintRouteStep`, `FactoryDocument`, `BOM`, and `BOMItem`. This confirms that the codebase is aligned with the blueprint-first direction even if the docs were previously fragmented.
        """,
    )

    write(
        DOCS / "03_Architecture/04_Folder_Structure_and_Coding_Standards.md",
        """
        # Folder Structure And Coding Standards

        ## Source Structure

        - `src/app`: route surfaces and route-local clients
        - `src/server/actions`: domain actions
        - `src/lib`: shared utilities, storage, auth, prisma, types
        - `src/components`: UI system and role-specific components
        - `prisma`: schema, migrations, seed
        - `scripts`: operational scripts and generators
        - `docs`: canonical product authority

        ## Documentation Rules

        - docs must be specific enough to drive implementation
        - each canonical file must own one clear concept
        - implementation should cite the relevant doc during major feature work
        - deprecated ideas should be removed rather than left ambiguous

        ## Code Standards Direction

        - business logic belongs in engines and action layers, not scattered through view code
        - route surfaces should stay role-specific
        - naming should favor operational clarity over generic SaaS vocabulary
        - design tokens and semantic UI rules must be preserved
        """,
    )

    write(
        DOCS / "03_Architecture/05_Database_Offline_and_PWA_Strategy.md",
        """
        # Database, Offline, And PWA Strategy

        ## Database Strategy

        PostgreSQL via Prisma is the system of record. The live Prisma schema is currently the real authority over data shape, but production-grade operation requires restoring migration discipline and removing dangerous schema-push assumptions from production paths.

        ## Current Risks

        - `npm run build` currently runs `prisma db push --accept-data-loss`
        - the checked-in migration history is behind the schema
        - package metadata still carries old naming drift

        ## Offline Strategy

        Offline support is a product requirement for worker and execution surfaces. The system should allow bounded local capture for work that must proceed during connectivity loss, then synchronize through explicit conflict-safe rules.

        ## PWA Strategy

        - installable app shell
        - worker and inspector friendly mobile behavior
        - route-safe caching boundaries
        - explicit sync and recovery UX
        - background revalidation where appropriate

        ## Sync Strategy

        - local intent queue
        - server-side validation on replay
        - idempotent event handling
        - audit trail for offline-originated submissions
        - evidence upload retry policies
        """,
    )

    engine_docs = {
        "01_CRM_Engine.md": ("CRM Engine", "lead capture, customer records, quotes, and sales order initiation"),
        "02_Blueprint_Engine.md": ("Blueprint Engine", "product DNA, route definition, versioning, linked BOM, and linked knowledge"),
        "03_Production_Engine.md": ("Production Engine", "production plans, work orders, job cards, department flow, and execution visibility"),
        "04_Inventory_Engine.md": ("Inventory Engine", "item master, warehouses, bins, stock ledger, balances, and reservations"),
        "05_Purchase_Engine.md": ("Purchase Engine", "supplier sourcing, purchase requests, purchase orders, receipts, and invoice coordination"),
        "06_Quality_Engine.md": ("Quality Engine", "templates, inspections, submissions, approvals, rework, and verifiable quality reports"),
        "07_Dispatch_Engine.md": ("Dispatch Engine", "dispatch readiness, tracking, handoff evidence, and delivery state"),
        "08_People_Engine.md": ("People Engine", "users, teams, employment profiles, attendance, leave, and assignment context"),
        "09_Analytics_Engine.md": ("Analytics Engine", "operational metrics, role dashboards, trend surfaces, and decision support"),
        "10_Knowledge_Engine.md": ("Knowledge Engine", "documents, SOPs, videos, manuals, troubleshooting, and blueprint-linked guidance"),
    }
    for filename, (title, purpose) in engine_docs.items():
        write(
            DOCS / "04_Business_Engines" / filename,
            f"""
            # {title}

            ## Purpose

            The {title} owns {purpose}.

            ## Responsibilities

            - define the domain boundary
            - own key entities and lifecycle transitions
            - emit and react to business events
            - expose role-specific UI needs
            - define permission expectations
            - expose API and automation touchpoints

            ## Required Sections For Future Expansion

            - core entities
            - lifecycle
            - upstream triggers
            - downstream side effects
            - notifications
            - dashboards and KPIs
            - API and action contracts
            - audit and security rules

            ## Current Repo Alignment

            This engine is already partially represented by current route and action surfaces. The document here is canonical and should be expanded before major implementation work in this domain continues.
            """,
        )

    builder_docs = {
        "01_Factory_Setup.md": "factory identity, modules, teams, departments, defaults, and onboarding state",
        "02_Product_and_Vehicle_Builder.md": "product categories, products, variants, and fitment structures",
        "03_Blueprint_Builder.md": "blueprint versions, route definitions, BOM, and linked quality and knowledge",
        "04_QC_and_Document_Builder.md": "QC templates, checkpoints, evidence rules, and supporting files",
        "05_Dashboard_and_Report_Builder.md": "owner-facing metrics, summaries, and configurable operational views",
        "06_Notification_and_Permission_Builder.md": "notification rules, role scopes, and access policies",
        "07_Template_System.md": "starter templates that preconfigure new products and workflows",
        "08_Automation_Builder.md": "future owner-configurable automation rules triggered by business events",
    }
    for filename, purpose in builder_docs.items():
        title = filename.replace("_", " ").replace(".md", "")
        write(
            DOCS / "05_Factory_Builder" / filename,
            f"""
            # {title}

            ## Purpose

            This builder governs {purpose}.

            ## Canonical Direction

            - configuration should feel guided, not bureaucratic
            - owners should complete ordinary setup without developer assistance
            - every configuration surface must feed reusable downstream behavior
            - templates should reduce setup effort and protect consistency

            ## Inputs

            - factory context
            - permissions
            - product and blueprint context where relevant
            - engine-specific configuration metadata

            ## Outputs

            - updated configuration state
            - new or revised blueprint-linked behavior
            - auditable changes
            - downstream engine readiness
            """,
        )

    workflow_docs = {
        "01_Lead_to_Order.md": "sales qualification through order conversion",
        "02_Order_to_Production.md": "sales order release into production planning and work execution",
        "03_Production_Planning.md": "planning quantity, route, timing, and resource readiness",
        "04_Material_Reservation.md": "reservation of required stock against planned execution",
        "05_Purchase_Replenishment.md": "procurement trigger and inbound replenishment flow",
        "06_Department_Execution.md": "department-level work progression from start through completion",
        "07_Worker_Job_Execution.md": "single-job worker interaction pattern",
        "08_Inspector_QC_Review.md": "inspection, evidence, approval, rejection, and rework decisions",
        "09_Rework_Loop.md": "failed quality back into corrected execution",
        "10_Packing_and_Dispatch.md": "final operational handoff to dispatch readiness",
        "11_Inventory_Adjustment_and_Transfer.md": "stock correction and stock movement workflows",
        "12_Team_and_People_Operations.md": "user, role, attendance, leave, and staffing actions",
        "13_Blueprint_Creation_and_Publication.md": "definition, versioning, approval, and release of blueprint logic",
        "14_Factory_Configuration_Workflow.md": "owner-driven setup and operational change management",
        "15_Offline_Sync_and_Recovery.md": "capture, replay, conflict handling, and support recovery",
    }
    for filename, purpose in workflow_docs.items():
        title = filename.replace("_", " ").replace(".md", "")
        write(
            DOCS / "06_Modular_Workflows" / filename,
            f"""
            # {title}

            ## Purpose

            This workflow governs {purpose}.

            ## Required Workflow Definition

            - trigger
            - actor
            - inputs
            - outputs
            - events emitted
            - automation opportunities
            - permissions
            - notifications
            - audit trail
            - edge cases
            - desktop and mobile screens involved

            ## Current Canon

            This workflow is part of the production-grade operating lifecycle and should be detailed further before implementation expands in this area.
            """,
        )

    role_docs = {
        "01_Owner.md": "factory-wide control, configuration, visibility, and commercial oversight",
        "02_Co_Owner.md": "shared ownership with bounded delegation and auditability",
        "03_Factory_Manager.md": "operational balancing across people, departments, and throughput",
        "04_Production_Manager.md": "release, sequencing, progress control, and bottleneck management",
        "05_QC_Manager.md": "quality standards, inspection load, rejection analysis, and rework control",
        "06_Purchase_Manager.md": "replenishment readiness, vendor coordination, and inbound visibility",
        "07_Accounts.md": "invoice, payment, and financial coordination",
        "08_Sales.md": "customer, quote, order, and relationship management",
        "09_Dispatch.md": "shipment readiness, coordination, and delivery proof",
        "10_Supervisor.md": "department execution oversight and exception handling",
        "11_Inspector.md": "mobile-first inspection, evidence capture, and approval decisions",
        "12_Worker.md": "single-job execution with clear instructions and issue reporting",
    }
    for filename, purpose in role_docs.items():
        title = filename.replace("_", " ").replace(".md", "")
        write(
            DOCS / "07_User_Experiences" / filename,
            f"""
            # {title}

            ## Role Purpose

            This role is responsible for {purpose}.

            ## Experience Framework

            - morning priorities
            - active-shift operating loop
            - afternoon correction and exception handling
            - end-of-day closure
            - KPIs
            - notifications
            - common actions
            - desktop vs mobile expectations
            - permissions and data boundaries

            ## Design Rule

            The {title} experience should expose only the operational depth needed by this role, while keeping workflow speed and signal clarity high.
            """,
        )

    data_docs = {
        "01_Data_Model_Overview.md": "overall schema authority, relational philosophy, and naming rules",
        "02_Identity_and_Access.md": "Factory, User, Agreement, SupportSession, WorkflowStage, Role",
        "03_Reference_and_Catalog.md": "Department, ProductCategory, Product, ProductVariant, fitment hierarchy, Design, Color, ProductType, ProductField",
        "04_Blueprint_and_Knowledge.md": "Blueprint, BlueprintVersion, BlueprintRouteStep, FactoryDocument, BOM, BOMItem",
        "05_Inventory_and_Warehouse.md": "ItemMaster, MaterialCategory, UOMConversion, Warehouse graph, ledger, balances, reservations",
        "06_Sales_and_CRM.md": "Customer, Deal, SalesOrder, SalesOrderItem, SalesInvoice, PaymentReceipt",
        "07_Production_Execution.md": "ProductionPlan, WorkOrder, JobCard",
        "08_Quality.md": "QCTemplate, TemplateSection, Checkpoint, Inspection, CheckpointSubmission, ImageEvidence, QualityApproval, QualityReport, ReworkRecord",
        "09_Purchase_and_Supplier.md": "Supplier, PurchaseRequest, PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseInvoice",
        "10_People_and_Workforce.md": "EmployeeProfile, Shift, AttendanceLog, LeaveApplication",
        "11_Platform_and_Audit.md": "TimelineEvent, Comment, Attachment, Notification, AuditLog, Approval, DispatchLog",
        "12_Database_Strategy.md": "migration discipline, indexes, versioning, audit, and production safeguards",
    }
    for filename, purpose in data_docs.items():
        title = filename.replace("_", " ").replace(".md", "")
        write(
            DOCS / "08_Data_Model" / filename,
            f"""
            # {title}

            ## Scope

            This document governs {purpose}.

            ## Required Coverage

            - purpose of each entity
            - field intent
            - key relationships
            - lifecycle expectations
            - validation rules
            - indexing and query expectations
            - event implications
            - UI and API touchpoints

            ## Canonical Note

            The current implementation schema is defined in `prisma/schema.prisma`. These docs define the intended stable model and should be used to drive future schema cleanup and migration repair.
            """,
        )

    design_docs = {
        "01_Design_Language.md": "visual intent, tone, and product feel",
        "02_Typography_and_Spacing.md": "type hierarchy, rhythm, scale, and density rules",
        "03_Color_and_Themes.md": "semantic tokens, dark mode, contrast, and state colors",
        "04_Cards_Forms_Tables_and_Lists.md": "surface patterns and information structures",
        "05_Buttons_Dialogs_and_Navigation.md": "actions, modal behavior, routing chrome, and navigational affordances",
        "06_Motion_States_and_Responsiveness.md": "animations, skeletons, empty states, loading, breakpoints, and mobile rules",
        "07_Accessibility_and_Content_Rules.md": "a11y, labels, errors, language, and readability requirements",
    }
    for filename, purpose in design_docs.items():
        title = filename.replace("_", " ").replace(".md", "")
        write(
            DOCS / "09_Design_System" / filename,
            f"""
            # {title}

            ## Scope

            This document defines {purpose}.

            ## Canonical Rules

            - Verity must feel intentional, premium, and operational
            - role surfaces should share one design system but differ in emphasis
            - semantic theme tokens are mandatory
            - dense operations should remain legible on desktop and mobile
            - loading, empty, and error states are part of the product, not afterthoughts
            """,
        )

    api_docs = {
        "01_API_Principles.md": "contracts, versioning, auth boundaries, and error philosophy",
        "02_Auth_and_User_APIs.md": "authentication, profile, team, employee, and user administration surfaces",
        "03_Sales_and_Order_APIs.md": "orders, customers, and order configuration endpoints and actions",
        "04_Production_and_Floor_APIs.md": "production, floor execution, assignments, and worker execution contracts",
        "05_Inventory_Purchase_and_Storage_APIs.md": "inventory, purchase, item, and storage-facing integration boundaries",
        "06_Quality_and_Verification_APIs.md": "QC templates, inspections, verification, and report generation surfaces",
        "07_Admin_Setup_and_System_APIs.md": "seed, reseed, settings, diagnostics, backfill, and operational maintenance endpoints",
    }
    for filename, purpose in api_docs.items():
        title = filename.replace("_", " ").replace(".md", "")
        write(
            DOCS / "10_API" / filename,
            f"""
            # {title}

            ## Scope

            This document governs {purpose}.

            ## Required Coverage

            - route or action name
            - actor and permission
            - request contract
            - response contract
            - validation and error behavior
            - audit implications
            - idempotency or retry behavior where relevant
            """,
        )

    security_docs = {
        "01_Authentication_and_Authorization.md": "identity, sessions, role boundaries, and authorization checks",
        "02_Audit_and_Operational_Integrity.md": "audit logs, approvals, event traceability, and incident visibility",
        "03_Data_Protection_and_Secrets.md": "encryption, secrets, storage controls, backups, and sensitive data handling",
        "04_Offline_and_Device_Security.md": "offline execution risks, local caches, sync trust boundaries, and recovery procedures",
    }
    for filename, purpose in security_docs.items():
        title = filename.replace("_", " ").replace(".md", "")
        write(
            DOCS / "11_Security" / filename,
            f"""
            # {title}

            ## Scope

            This document covers {purpose}.

            ## Canonical Requirement

            Verity is treated as a production-grade system. Security design must be explicit, reviewable, and connected to workflows, data, and deployment operations.
            """,
        )

    deployment_docs = {
        "01_Infrastructure_Overview.md": "hosting shape, runtime dependencies, and environment model",
        "02_Database_and_Migration_Runbook.md": "Prisma, PostgreSQL, migration repair, seeding, and rollback expectations",
        "03_PWA_Storage_and_Background_Operations.md": "service worker, cached assets, storage, queues, and cron/background concerns",
        "04_Observability_and_Production_Operations.md": "monitoring, logging, analytics, support, and disaster recovery",
    }
    for filename, purpose in deployment_docs.items():
        title = filename.replace("_", " ").replace(".md", "")
        write(
            DOCS / "12_Deployment" / filename,
            f"""
            # {title}

            ## Scope

            This document defines {purpose}.

            ## Current Reality To Resolve

            The repository already includes the primitives for production deployment, but the deployment posture is not yet sufficiently hardened until migration history, environment discipline, and operational runbooks are aligned with the intended platform.
            """,
        )

    write(
        DOCS / "13_Roadmap/01_Roadmap.md",
        """
        # Roadmap

        ## Foundation

        - factory setup
        - blueprint system
        - CRM and order intake
        - production planning and execution
        - quality engine
        - inventory engine
        - dispatch readiness
        - authentication and permissions
        - installable production-grade PWA

        ## Operations

        - purchase engine maturity
        - accounts coordination
        - owner-configurable notifications
        - operational reports and dashboards
        - stronger factory builder coverage

        ## Optimization

        - advanced scheduling
        - capacity planning
        - reusable templates
        - analytics maturity
        - stronger event automation

        ## Intelligence

        - AI assistant and copilots
        - root cause analysis
        - predictive inventory and demand support
        - recommendation systems for bottlenecks and quality

        ## Expansion

        - multi-factory support
        - portal surfaces for customers, vendors, and dealers
        - deeper machine and IoT integration
        - broader ecosystem integrations
        """,
    )

    decisions = {
        "0001-why-verity-docs-are-canonical.md": "Docs are the authority that implementation follows.",
        "0002-why-blueprints-are-the-operational-dna.md": "Blueprints define reusable execution logic across production, QC, and knowledge.",
        "0003-why-business-engines-own-logic.md": "Engines own business state and side effects instead of generic modules.",
        "0004-why-verity-uses-a-factory-builder.md": "Owners need configurability without developer dependency.",
        "0005-why-verity-does-not-use-generic-tasks-as-the-core.md": "Events and engine-owned artifacts are more faithful than a generic task abstraction.",
        "0006-why-verity-should-be-event-driven.md": "Events coordinate the operating system more cleanly than tight point-to-point coupling.",
        "0007-why-nextjs-remains-the-application-shell.md": "The current route-driven product surface fits a Next.js app shell.",
        "0008-why-postgresql-and-prisma-remain-the-data-core.md": "The existing schema and relational shape fit the platform, but migration discipline must improve.",
    }
    for filename, rationale in decisions.items():
        title = filename.replace("-", " ").replace(".md", "").upper()
        write(
            DOCS / "14_DECISIONS" / filename,
            f"""
            # {title}

            ## Status

            Accepted

            ## Decision

            {rationale}

            ## Consequences

            - future implementation should align with this decision
            - contradictory legacy product language should be removed
            - any reversal requires a new ADR with explicit tradeoffs
            """,
        )


def main() -> None:
    reset_docs()
    build_docs()
    print("Verity docs regenerated successfully.")


if __name__ == "__main__":
    main()
