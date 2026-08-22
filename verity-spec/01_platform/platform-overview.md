# Verity Master Platform Specification

## 01_platform/platform-overview.md

## Provenance
*   **Primary Sources**: None
*   **Verity Bible Authority**: [verity-bible/volume_1_constitution_philosophy.md](file:///D:/Code/verity/verity-bible/volume_1_constitution_philosophy.md) (Section 3: Category Definition), [verity-bible/_synthesis/verity-canonical-update.md](file:///D:/Code/verity/verity-bible/_synthesis/verity-canonical-update.md)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Platform Architecture Layers

The Verity architecture consists of three distinct layers to ensure that core product logic remains isolated from custom layouts, integrations, and deployment details:

```text
  ┌────────────────────────────────────────────────────────┐
  │                   EXPERIENCE SHELLS                    │
  │   (Worker Mobile, Admin Desktop, Operations Console)   │
  └───────────────────────────┬────────────────────────────┘
                              │
  ┌───────────────────────────▼────────────────────────────┐
  │                 REUSABLE CAPABILITIES                 │
  │     (Scheduling, CRM, Workforce, Billing, Assets)      │
  └───────────────────────────┬────────────────────────────┘
                              │
  ┌───────────────────────────▼────────────────────────────┐
  │                    PLATFORM CORE                       │
  │  (Tenancy, Auth, Meta-Model, Event Bus, Audit, Sync)   │
  └────────────────────────────────────────────────────────┘
```

---

## 2. Core vs. Optional vs. Client Systems

To prevent spaghetti dependencies, all business capabilities must be classified into one of three structural types:

### PLA-OVE-001: The Platform Core
*   **Description**: The fundamental runtime substrate that must be present in every single Verity installation. 
*   **Entities included**: Tenant, Organization, User, Group, Role, Permission, Event, AuditLog.
*   **Services included**: Tenant isolation routing, authentication, query sandboxing middleware, dynamic Zod validator runtime, event bus, and offline sync queue.
*   **Status**: `[FACT]`

### PLA-OVE-002: Reusable Capabilities
*   **Description**: Packaged, domain-specific modules that can be optionally activated on top of the Platform Core. A Capability has no direct references to client code and must be fully configurable.
*   **Entities included**: WorkOrder, Customer, Resource, Location, SLA, Asset.
*   **Status**: `[FACT]`

### PLA-OVE-003: Industry Packs
*   **Description**: Precomposed configurations mapping specific Capabilities, roles, workflows, template forms, and dashboards together for a particular vertical (e.g. Security Operations Pack, Facilities Management Pack).
*   **Status**: `[FACT]`

### PLA-OVE-004: Client Systems
*   **Description**: The final, concrete deployment tailored for a specific customer. It is composed of the Platform Core, activated Capabilities, composed Industry Packs, and custom Client Extensions (isolated from the core codebase).
*   **Status**: `[FACT]`
