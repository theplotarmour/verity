# Purpose
Defines the mechanism for capabilities to register with the platform core.

# Scope
- Central registry for entities, commands, queries, events, permissions, and UI contributions.

# Authority
- **Architecture Standard**: Platform Extensibility & Modularity (No undeclared direct dependency between capabilities)

# Prerequisites
- Core foundation (Tenancy, Authorization).

# Specification Requirements
- The platform must maintain a source of truth for all active capabilities.

# Approved Architecture
- In-memory registry initialized at application startup. 
- Capabilities declare their surface area (commands, events, UI routes) via static configuration objects.

# Implementation Contract
1. Create a `CapabilityRegistry` singleton or context provider.
2. Each capability (domain module) exports a `register()` function returning a `CapabilityManifest`.
3. Manifest schema: 
   - `entities`: Models provided.
   - `commands`: Available mutations.
   - `permissions`: Custom permission definitions required.
   - `dependencies`: Declared contracts with other capabilities.
4. The permission engine and event bus consult the Registry at runtime.

# Constraints & Invariants
- No undeclared direct dependency between capabilities. Capabilities CAN depend on each other through declared contracts, platform services, domain events, or composition.

# Dependencies
- Depended on by: Event Bus, UI Router, Permission Engine.

# Failure Modes
- Startup crash if two capabilities declare overlapping/conflicting command names. Ensure strict namespacing (e.g., `work:create_order`).

# Testing Requirements
- Registry conflict detection test.

# Conformance Checks
- Validate that all dependencies requested by a capability are present in the registry at boot.

# Traceability
- Foundational architectural component for decoupled domain logic.

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: The specific DI (Dependency Injection) or module federation pattern to aggregate capability manifests at Next.js boot.
