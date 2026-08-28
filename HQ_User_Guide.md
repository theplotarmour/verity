# Verity Platform Concepts & User Guide

Welcome to the Verity Platform guide. This document explains how the core components of Verity fit together under the hood, how they interact, and how to use them.

---

## 1. Tenancy Architecture: Operators vs. Clients

Verity enforces absolute tenant data isolation at the database level via Row-Level Security (RLS) under **ADR-005**. Every database record is partitioned by a `tenantId`.

```
                  ┌───────────────────────────────┐
                  │      VERITY BASE PLATFORM     │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌───────────────────────────────┐                 ┌───────────────────────────────┐
│     PLATFORM TENANT (HQ)      │                 │    CLIENT TENANTS (WORKSPACES)│
│  • is_platform = true         │                 │  • is_platform = false        │
│  • Members: Operators         │                 │  • Members: Tenant Users      │
│  • Path: /hq                  │                 │  • Path: /                    │
└───────────────────────────────┘                 └───────────────────────────────┘
```

### The Platform Tenant (HQ)
*   **What it is**: A special tenant with the `isPlatform: true` flag set. It represents the administrative layer of the system.
*   **The Operator**: An operator is a global administrator who holds a membership in the Platform Tenant. They use **Verity HQ** (`/hq`) to create clients, toggle subscriptions, and monitor system health.
*   **Operator Context Rules**: Under **ADR-013**, operator authority is *not ambient*. An operator can only perform platform actions if they explicitly select "Verity Platform" in their organization switcher. If they select a client organization, they act under that client's standard tenant rules.

### Client Tenants (Workspaces)
*   **What it is**: Isolated business directories (e.g., "Naksh" or "Demo Operations") where standard customers manage their day-to-day operations.
*   **The Tenant User**: An employee or manager belonging to a specific client organization. They are strictly contained within their tenant boundary and can never view or access `/hq`.

---

## 2. Capabilities & Industry Packs

Verity is designed as a modular capability core. Instead of hardcoding SaaS features, the platform loads them dynamically.

### Capabilities (Modules)
A **Capability** is a self-contained code module (e.g., `verity.capability.asset` or `verity.capability.scheduling`). It defines its own:
*   Database tables (Entities)
*   State machines (States & Transitions)
*   API/action logic (Commands & Queries)
*   Navigation links and UI menus

### Industry Packs
An **Industry Pack** (e.g., *Security Operations Pack*, *Plywood Trading Pack*) is a configuration manifest. It groups multiple prerequisite Capabilities, default roles, custom metadata schemas, and checklist templates.
*   Activating a Pack sets up a ready-to-use workspace for a client with a single click.

---

## 3. Role-Based Access Control (RBAC) & Permission Scopes

Permissions in Verity are granular and security-verified on every write transaction.

### Anatomy of a Permission Grant
A permission grant is defined by three values:
1.  **Verb**: The action being performed (`Read`, `Create`, `Edit`, `Delete`, `ActionExecute`).
2.  **Entity**: The target model class (e.g., `verity.asset.asset` or `verity.platform.membership`).
3.  **Scope**: The organizational boundary of the grant:
    *   `Tenant`: Access to all data in the entire client subscription.
    *   `Organization`: Access restricted to the user's assigned organizational branch (e.g., North Region).
    *   `Location`: Access restricted to specific assigned physical locations (e.g., North Depot).

### Role Composition (Inheritance)
To avoid duplicating permission tables, Verity supports **composite roles** via `RoleComposition`.
*   A parent role automatically inherits all permissions held by its child roles.
*   *Example*: An `Administrator` role can inherit from `Supervisor`, which inherits from `Read Only`. Modifying `Supervisor` automatically updates `Administrator`'s permissions.

---

## 4. Configuration Scopes & Precedence

Parameters (like tax rates, operational thresholds, or S3 bucket names) are configured hierarchically.

### Value Resolution Precedence
When the application queries a configuration key, it scans the hierarchy from the most specific to the most general. The first matching value wins outright:

$$\text{Resolved Value} = \text{Location Override} \rightarrow \text{Organization Override} \rightarrow \text{Tenant Default} \rightarrow \text{Platform Default}$$

1.  **Location Override**: Parameter set specifically for a branch/site (highest precedence).
2.  **Organization Override**: Parameter set for an organizational group.
3.  **Tenant Default**: Parameter set globally for the client tenant.
4.  **Platform Default**: The fallback value defined in code by the platform developers (lowest precedence).
