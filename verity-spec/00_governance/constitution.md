# Verity Master Platform Specification

## 00_governance/constitution.md

## Provenance
*   **Primary Sources**: None (Canonical Platform Governance)
*   **Verity Bible Authority**: [verity-bible/volume_1_constitution_philosophy.md](file:///D:/Code/verity/verity-bible/volume_1_constitution_philosophy.md) (Section 1: Absolute Constitutional Charter, Section 2: Core Thesis)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Absolute Constitutional Rules

The Verity platform is governed by a strict hierarchy of product laws. These laws bind both human engineering teams and automated coding agents (such as Claude/Fable).

### GOV-CON-001: Codebase Subordination
The existing implementation codebase of Verity is a secondary draft. If any part of the active implementation, database schema, or client interface conflicts with the rules, schemas, or requirements defined in this Master Specification Corpus (`verity-spec/`), the implementation must be cleaned, refactored, or discarded. 
*   **Status**: `[FACT]`
*   **Traceability**: Bible Volume 1, Section 1.1.

### GOV-CON-002: Product Over Code
We do not build software to accommodate legacy models, external frameworks, or transient database limitations. We define the business domain first, establish its laws and invariants, and enforce them at the compiler/runtime validation level.
*   **Status**: `[FACT]`
*   **Traceability**: Bible Volume 1, Section 1.2.

### GOV-CON-003: Core Identity Category
Verity is a Configurable Operating System for Service-Driven Organizations. It is defined as a unified four-part operational system:
1.  **System of Record**: Storing structured master data (Parties, Locations, Assets, Resources) and transactional logs.
2.  **System of Control**: Enforcing operational boundaries, validation policies, and SLA breach timelines.
3.  **System of Execution**: Providing deskless frontline workers with a streamlined interface for shift clock-in, checklist completion, and evidence submission.
4.  **System of Engagement**: Exposing B2C customer portals for booking services and tracking active dispatch metrics.
*   **Status**: `[FACT]`
*   **Traceability**: Bible Volume 1, Section 3.

### GOV-CON-004: Anti-Vision Exclusions
Verity is built strictly for service-driven organizations. The platform core and capability catalog must explicitly exclude:
1.  **Manufacturing with Physical Raw Material Recipes**: Assembly-line manufacturing involving Bill of Materials (BOM) inventory routing is rejected.
2.  **Direct Consumer Retail Storefronts**: B2C retail inventory and retail cash register systems are rejected.
3.  **General Document Collaboration**: General document editing suites are rejected.
*   **Status**: `[FACT]`
*   **Traceability**: Bible Volume 1, Section 6.

---

## 2. The Reusability Law

### GOV-CON-005: Reusability Law for Newly Developed Features
Every newly developed feature or custom module requested by a client system must be evaluated for extraction into the Verity Reusable Capability catalog. Custom extensions must never exist as client-specific forks of the platform.

```text
                  Client Requirement
                          │
            Is it already supported?
             ├── YES ──► Configure & Compose
             └── NO
                  │
        Can it be logically generalized?
             ├── YES ──► Create Reusable Capability & Register in Catalog
             └── NO  ──► Implement as isolated Client Extension
```

To prevent code duplication, a capability is only eligible to be marked "Promoted to Platform Core" when it meets the **Definition of Done for a Capability** (defined in `01_platform/lifecycle.md`).
*   **Status**: `[DECIDED]`
*   **Traceability**: Verity Bible Synthesis (`verity-canonical-update.md`).
