# Task Plan 104 — Verity Native Configuration/Extension Architecture (Design-Only)

**Status:** DRAFT — design/analysis only. No implementation authorized.
**Depends on:** `taskplans/103_payload_cms_control_plane_adr.md` (Payload
rejected as tenant-scoped control-plane dependency — settled). This
document answers the question that ADR left open: what is the *minimum*
native shape for build-priority item 10 ("Configuration / capability /
extension infrastructure")?

**Purpose:** Prove — or correct — that a native configuration/extension
layer can give Verity "configuration -> runtime behavior" without becoming
a general-purpose dynamic-schema engine. The question is not "how do we
rebuild Payload"; it is "what is the smallest system that lets a tenant
reconfigure behavior while Prisma -> PostgreSQL -> RLS -> `enforcePolicy()`
-> domain events stays the single authoritative path."

This document must be reviewed and found sufficiently small, tenant-safe,
and VEDA-capable before `adr-019` (the ratified version of task 103) is
committed. It does not itself authorize starting item 10 — item 10 still
waits on build-order items 1-9 per `CLAUDE.md`.

---

## 1. The three-tier data model (the boundary this document exists to draw)

Conflating these three is the single biggest risk in "native config
infrastructure" — it is how a project accidentally rebuilds Payload one
JSONB column at a time. They must stay visibly distinct in schema, in
code location, and in this document:

| Tier | Shape | Example | Storage |
|---|---|---|---|
| **Core domain data** | Strongly typed, fixed columns | `Customer`, `Invoice`, `Order`, `Project`, `Payment`, `Product`, `ChecklistItem` | Prisma models, one column per field, real FK constraints |
| **Extension data** | Flexible, per-tenant, unstructured | a plywood client's `thicknessTenthMm`, an auto-parts client's `oemPartNumber` | `additionalDetails Json` on the owning model, Zod-validated at the API boundary — **already decided**, `taskplans/17_verity_gap_analysis.md` |
| **Configuration** | Structured metadata *about* the other two tiers | "Invoice requires Director approval above a threshold", "Product has a custom field called Grade, type enum, values A/B/C" | A small, closed set of purpose-built tables (section 2) — **this is what item 10 adds** |

The failure mode this table exists to prevent: someone reaches for a
generic `FieldDefinition` / `EntityDefinition` pair that can describe
*any* entity with *any* shape, because it looks reusable. That is a
schema engine, not a configuration layer, and it is exactly Payload's
collection model rebuilt in-house — all of Option B's coherence cost
(task 103, section 9) with none of Option B's tooling payoff.
Configuration tables in section 2 are deliberately narrow and
purpose-specific, not a generic meta-schema.

---

## 2. What item 10 actually needs — five tables, not a meta-schema

Each maps to a real, already-observed requirement. None is a general
"describe anything" primitive.

1. **`CapabilityConfig`** — per-tenant on/off + parameters for an
   already-registered capability (`capability.ts` already has
   `CapabilityDefinition.dependencies`; this table is the tenant-facing
   configuration surface over it, not a new capability mechanism).
2. **`FormFieldDefinition`** — scoped to one entity + one tenant: field
   key, label, type (from a fixed enum: text/number/date/enum/boolean —
   not "any JSON shape"), validation rule, visibility rule, display
   order. This is the structured sibling of `additionalDetails`: the
   *definition* of what a tenant's extension fields mean, so the UI can
   render them without hand-coding a form per client. The values
   themselves still live in `additionalDetails Json` on the domain row —
   this table never stores tenant data, only field *metadata*.
3. **`WorkflowDefinition`** / **`ApprovalRule`** — condition (entity,
   field, comparator, value) -> action (require approval, notify, block)
   -> approver (role or resource reference). Consumed by the existing
   `workflow.ts`/`state.ts` runtime as data, not as a new execution
   engine — the runtime already knows how to run a state machine; this
   table supplies the machine's edges instead of hardcoding them per
   capability.
4. **`DocumentTemplate`** — template text/layout for a generated document
   (quotation, invoice PDF, notice), keyed by tenant + document type.
   Platform-global defaults with tenant overrides, same tenant model as
   everything else (RLS-scoped row per tenant, global row where
   `tenantId IS NULL`).
5. **`NavigationConfig`** — which modules/menu items a tenant's shell
   shows, driven by which capabilities are enabled (`CapabilityConfig`)
   plus role (`Permission`) — mostly derived, not hand-authored, so this
   may end up being a query over existing tables rather than a table of
   its own. Flagged here as **open** (section 6).

All five are ordinary Prisma models: RLS-covered like every other table,
migrated the ordinary way, written through the ordinary Command pipeline
so `enforcePolicy()` and audit apply exactly as they do to a `Customer`
write today. No new authorization surface, per task 103 section 7's core
requirement.

---

## 3. Runtime shape

```
                 Configuration tables (section 2)
                 CapabilityConfig - FormFieldDefinition
                 WorkflowDefinition - ApprovalRule
                 DocumentTemplate
                            |
                 read by, not bypassing, the
                 existing command/state pipeline
                            |
        +-------------------+------------------+
        v                   v                  v
  Generic form         State-machine       Capability
  renderer (reads      runtime (reads      registry (reads
  FormFieldDefinition, WorkflowDefinition/  CapabilityConfig
  renders + validates  ApprovalRule as      to decide what's
  against Zod schema   transition edges)    active per tenant)
  derived from it)
        |                   |                  |
        +-------------------+------------------+
                            v
                    command.ts / state.ts
                    (unchanged authority)
                            |
                    enforcePolicy() (unchanged)
                            |
                    Prisma -> PostgreSQL -> RLS
                            |
                    DomainEvent / Activity (unchanged)
```

The configuration tables are **inputs** the existing runtime reads. They
do not introduce a second place authorization or state transitions
happen. This is the concrete test for "did we accidentally build a second
Payload": if a configuration table starts needing its own access-control
functions instead of flowing through `enforcePolicy()`, the design has
drifted from this shape and should stop.

---

## 4. Admin UI

A generic renderer keyed off `FormFieldDefinition`'s fixed type enum can
cover the enterprise-customization "implementation consultant configures
a client, no engineer needed" use case: add a field, pick its type from a
closed list, set required/validation, done. This is deliberately smaller
than Payload's field system (no blocks, no polymorphic relationships, no
nested arrays-of-objects) — those are exactly the parts of Payload's
model this document's section 1 boundary says do not belong in Verity,
because they're schema-engine features, not configuration-layer features.
If a real requirement later needs one of them, that is itself a signal to
re-open task 103's Option C, not to grow this table's type enum
indefinitely.

---

## 5. VEDA-shaped capabilities under this architecture

This is the concrete proof this design is sufficient for the stated goal
(support manufacturing-style verticals without a second CMS):

```
Manufacturing capability (native Verity code, like `plywood`/`trading` today)
+-- Domain models: Product, BOM, ProductionRun, QCResult (Prisma, strongly typed)
+-- Extension: PlywoodProductDetail-style per-vertical detail table
|              (ADR-018's precedent: dimension/grade fields live on a
|              detail table, not as generic JSON, because they recur
|              and deserve real columns — additionalDetails is for the
|              long tail, not for a vertical's core fields)
+-- Configuration: WorkflowDefinition rows for "QC fail -> block dispatch,
|              notify supervisor"; ApprovalRule rows for "production run
|              over N units requires supervisor sign-off"
+-- UI: generic FormFieldDefinition-driven forms for tenant-added fields,
       hand-built domain UI for the fixed BOM/production/QC screens
```

This matches the already-accepted pattern from ADR-018 (extracting
`trading` out of `plywood`): a capability's *core, recurring* shape gets
real Prisma models; only the genuinely long-tail, per-tenant variance goes
through `additionalDetails`/configuration tables. VEDA-as-a-vertical is
not "make everything dynamic" — it is "write the manufacturing capability
the same way `plywood`/`trading` were written," with configuration tables
covering the parts that actually vary tenant-to-tenant.

---

## 6. Open questions (must be resolved before `adr-019` ratification)

- **`NavigationConfig`**: derived view vs. real table — needs one more
  pass once `CapabilityConfig` and `Permission` shapes are final.
- **`FormFieldDefinition`'s type enum**: what is the actual closed list
  (text/number/date/enum/boolean/reference — reference to what)? Needs
  grounding against real client requests (plywood + the incoming
  auto-parts client), not guessed in the abstract.
- **`WorkflowDefinition`/`ApprovalRule` condition grammar**: simple
  `field comparator value` covers a single-threshold approval rule; does
  any known requirement need boolean combinators (AND/OR) or cross-entity
  conditions? If yes, scope the grammar explicitly rather than let it
  grow ad hoc.
- **Versioning**: does every configuration table need the shadow-table
  history pattern task 103 recommended adopting from Payload, or only
  `WorkflowDefinition`/`ApprovalRule` (where a bad change has real
  operational consequences)? `FormFieldDefinition` may not need it.
- **Ownership of `DocumentTemplate` content**: plain text/markdown
  substitution, or does it need something closer to a real template
  language? Scope before building, not after.

None of these block writing this document; they block treating it as
final. Resolve them, then bring the result back to task 103 as the
evidence that ratifies (or revises) `adr-019`.

---

## Explicit boundary

**Nothing in this document authorizes implementation.** This is
design-only, feeding a decision still pending in
`taskplans/103_payload_cms_control_plane_adr.md`. Item 10 does not start
until build-order items 1-9 are complete per `CLAUDE.md`, regardless of
how settled this design becomes.
