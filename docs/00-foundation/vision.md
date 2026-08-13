# Verity Vision

Verity is a module-driven operating platform for business operations.

The product exists so PlotArmour can ask a prospect, "What do you need this business to run?", then assemble a working digital operating system from reusable Verity capabilities instead of rebuilding software for every client.

## Core Model

```text
Verity Platform
  Platform Admin
    Module Library
    Pack Library
    System Templates
    Client Provisioning
  Client Tenant
    Enabled Modules
    Client Configuration
    Client Data
    Dynamic Portal
  Verity Core
    Auth
    Tenancy
    RBAC
    Module Registry
    Navigation Resolver
    Dashboard Resolver
    Audit
    Events
```

## The Required Separation

### Module Catalog

What Verity can provide.

Examples: Team, Customers, Tasks, Attendance, Shifts, Inspections, Maintenance, Assets, Inventory, Billing, Orders, Kitchen, Serving, Approvals, Documents, Complaints, Scheduling.

This is controlled by Verity admins and developers.

### Client Configuration

What a particular organization has enabled, configured, purchased, or deployed.

Example: Kent's may have Team, Customers, Menu, Tables and Orders, Billing, Kitchen, and Serving enabled.

### Client Data

The records created by that tenant inside enabled modules: users, menu items, orders, bills, kitchen tickets, audit evidence, assets, invoices.

These three layers must never be conflated.

## Platform Acceptance Test

Verity is not architecturally complete until these scenarios work:

1. Create a blank tenant. It has no business modules and no demo domain data.
2. Enable Team. The client portal shows Team without code changes.
3. Enable Tasks. The client portal shows Team and Tasks without code changes.
4. Enable a pack. All pack modules appear as independently entitled modules.
5. Disable a module. Navigation hides it, direct URLs block it, APIs reject it, data remains.
6. Create a second tenant with a different module set. It sees no data or modules from the first tenant.
7. Build one custom reusable module once and enable it for multiple clients.
8. Change fields, workflow, roles, dashboard, and terminology through configuration where possible.
9. Save a system template and use it to provision another tenant.

## Product Line

```text
Single Module
  Pack
    System Template
      Configured Client Workspace
        Enterprise Deployment
```

The real Verity product is the platform that creates, configures, combines, provisions, reuses, versions, and sells modules repeatedly.
