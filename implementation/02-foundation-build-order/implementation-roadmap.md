# Implementation Roadmap

## Purpose
This document outlines the phased build order for the Verity platform implementation, defining what gets built when and why in that specific order. 

## Scope
Covers Phase 0 through Phase 7 of the platform rebuild, from bootstrap to hardening.

## Authority
- **Bible V1**: PostgreSQL + Prisma as System of Record
- **Bible V5 & Spec PLA-TEN-001→002**: RLS and Tenancy Isolation
- **EXISTING INFRASTRUCTURE**: Next.js 16, React 19, Supabase Auth, Vitest, Playwright
- **INV-001**: Strict Tenancy Isolation
- **INV-003**: Unified Party Identity

## Prerequisites
- Clean repository with Next.js and Prisma initialized.
- Existing Supabase project for Auth and Database.

## Specification Requirements
- WHAT MUST EXIST:
  - Tenancy isolation across the entire system.
  - Domain runtime primitives.
  - Complete capability sets built on top of the foundation.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: Phased approach starting with foundation and structural primitives, moving to operational core, then supporting capabilities, and finally business logic and UI shells.

## Implementation Contract

### PHASE 0: Foundation Bootstrap
- **What's in it**: Database setup (Prisma schema baseline, RLS policies), Tenancy runtime, Identity/Auth integration, Session/context management, Base entity pattern.
- **Spec Sections**: PLA-TEN-001→006, INV-001.
- **Dependencies**: None.
- **Enables**: All subsequent phases.
- **Why first**: Everything depends on tenant isolation and identity.
- **Definition of Done**: Schema compiles, Auth works, Tenant isolation is verifiable via tests.

### PHASE 1: Platform Runtime
- **What's in it**: Domain runtime primitives, Authorization engine, Extension/metadata runtime, Event bus / outbox pattern, Audit infrastructure.
- **Spec Sections**: PLA-EXT-001→004, MET-ACT-001→004, MET-EVE-001→002, EXE-AUD-001→003.
- **Dependencies**: Phase 0.
- **Enables**: Vertical capabilities.
- **Why second**: Capabilities need these primitives.
- **Definition of Done**: Primitives are usable by a mock capability.

### PHASE 2: First Vertical Slice
- **What's in it**: Party, User (1:1 with Party), Role + Permission, Organization, Location.
- **Spec Sections**: GOV-TER-006, GOV-TER-010, GOV-TER-017, INV-003.
- **Dependencies**: Phase 1.
- **Enables**: Operational core.
- **Why**: Identity and structural primitives all other capabilities depend on.
- **Definition of Done**: Party capability complete end-to-end.

### PHASE 3: Operational Core
- **What's in it**: Resource, Asset, Work Order (state machine), Assignment, Scheduling, Evidence, SLA.
- **Spec Sections**: GOV-TER-001, GOV-TER-007, GOV-TER-009.
- **Dependencies**: Phase 2.
- **Enables**: Supporting and Business Capabilities.
- **Why**: Operational heart of the platform.
- **Definition of Done**: Work Order flow functions end-to-end.

### PHASE 4: Supporting Capabilities
- **What's in it**: Contract, Document, Notification, Catalog, Request, Approval, Exception.
- **Spec Sections**: GOV-TER-002, additional capability specs.
- **Dependencies**: Phase 3.
- **Enables**: Business Logic.
- **Why**: Support the operational core.
- **Definition of Done**: Intake to Work Order conversion works.

### PHASE 5: Business Capabilities
- **What's in it**: CRM, Field Service, Facilities, Maintenance, Projects, Finance, Commerce, Inventory, Procurement, Sales, Staffing, Security, Expenses, Subscriptions.
- **Spec Sections**: GOV-TER-012, GOV-TER-013, GOV-TER-014, Business Capability Specs.
- **Dependencies**: Phase 4.
- **Enables**: Full business functionality.
- **Why**: Business logic built on operational core.
- **Definition of Done**: All business capabilities implemented.

### PHASE 6: Experience & Integration
- **What's in it**: Four shells (HQ, Owner, Worker, B2C Portal), Offline/sync engine, Workflow/automation engine, External integrations.
- **Spec Sections**: REQ-DATA-OFFLINE-001→003, REQ-DATA-SYNC-001→002.
- **Dependencies**: Phase 5.
- **Enables**: End-user usage.
- **Why**: Product-facing layer built on complete domain.
- **Definition of Done**: Shells are usable and functional.

### PHASE 7: Hardening
- **What's in it**: Conformance testing, Performance optimization, Industry packs, Client system construction.
- **Dependencies**: Phase 6.
- **Definition of Done**: Platform is production-ready.

## Constraints & Invariants
- No feature development until Phase 0 and 1 are complete.

## Dependencies
- Phased linearly for platform foundations.

## Failure Modes
- Skipping phases will lead to missing foundation and rework.

## Testing Requirements
- Each phase requires comprehensive testing of its output before proceeding.

## Conformance Checks
- Traceable to spec requirements and terminology glossary.

## Traceability
- Covers GOV-TER, PLA-TEN, PLA-EXT, MET-ACT, MET-EVE, EXE-AUD.

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: How Inngest will be wired into Phase 1 Platform Runtime.
