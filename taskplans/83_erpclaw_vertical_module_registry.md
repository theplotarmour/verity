# Task 83 — Vertical client-module registry (reference, not a build)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §4 (ERPClaw source).

## Status: REFERENCE — not a build plan for any single module

This file is a pointer table, not a spec. None of these are marked built
until actually implemented in Verity, per `CLAUDE.md` §Reporting vocabulary.
Verity already has exploratory docs for several of these
(`clinic.md`, `coaching.md`, `salon.md`, `KentsRestaurant.md`) — those stay
as-is; this table only notes where ERPClaw's equivalent module could enrich
them later, and lists the families Verity has no doc for yet.

## Registry

| ERPClaw module family | Verity candidate | Notes |
|---|---|---|
| HealthClaw | `verity.capability.clinic` | `clinic.md` already exists; ERPClaw could enrich billing, provider, insurance, lab, pharmacy, compliance sections — enrichment only, not a rewrite. |
| EduClaw | `verity.capability.coaching` | `coaching.md` already exists; ERPClaw could enrich fees, attendance, grading, communications, LMS boundaries. |
| HospitalityClaw | `verity.capability.hospitality` | No existing Verity doc. Rooms, reservations, front desk, housekeeping, F&B, revenue management. |
| LegalClaw | `verity.capability.legal` | No existing Verity doc. Matters, time billing, trust accounting, conflicts, documents, court dates. |
| RetailClaw | `verity.capability.retail` | No existing Verity doc. Stores, products, pricing, promotions, loyalty, POS integration, ecommerce. |
| PropertyClaw | `verity.capability.property` | No existing Verity doc. Properties, units, leases, tenants, maintenance, rent accounting. |
| ConstructClaw | `verity.capability.construction` | No existing Verity doc. Projects, contracts, budgets, RFIs, submittals, change orders, safety. |
| NonprofitClaw | `verity.capability.nonprofit` | No existing Verity doc. Donors, campaigns, grants, volunteers, events, fund accounting. |
| AgricultureClaw | `verity.capability.agriculture` | No existing Verity doc. Farms, fields, crops, livestock, equipment, harvest. |
| AutomotiveClaw | `verity.capability.automotive` | No existing Verity doc. Vehicle inventory, service orders, parts, warranty, dealership workflows. |

## How to use this file

When a real client in one of these verticals appears: read the matching
ERPClaw module family for domain vocabulary, write (or extend) the
`<name>.md` exploratory doc using Verity's own canonical terminology (see
`CLAUDE.md` §Canonical terminology — never adopt ERPClaw's table names
directly), then run Task 82's skill (once built) to turn it into a capability
plan. Do not skip straight from this table to code.

## Non-goals

- Not a commitment to build any of these.
- Not a naming decision — `verity.capability.*` names here are illustrative,
  matching the source doc's convention, not final.
