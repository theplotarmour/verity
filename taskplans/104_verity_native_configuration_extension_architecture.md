# Task Plan 104 — Verity Native Configuration/Extension Architecture

**Status:** MOSTLY ALREADY BUILT — this document's own premise was wrong,
corrected 2026-09-08. See "Correction" immediately below before reading
anything past it.

**Depends on:** `taskplans/103_payload_cms_control_plane_adr.md` /
`verity-spec/17_decisions/adr/adr-019.md` (Payload rejected as tenant-
scoped control-plane dependency — settled, unaffected by this correction).

## Correction (2026-09-08) — item 10 is not unbuilt

This document originally opened with "build-priority item 10... currently
**unbuilt**," inherited from `CLAUDE.md`'s build-order list and repeated
in `adr-019` without independently checking `src/server/platform/` first.
That was wrong. Section 2 below maps all five of the sketched
configuration tables onto Prisma models and platform modules that already
ship, in most cases well past what this document's original section 2
proposed:

| This doc's original proposal | Already built as | Where |
|---|---|---|
| `CapabilityConfig` (per-tenant on/off) | `TenantActivation` (+ `status`, `pinnedVersion` for PLA-VER-003) | `prisma/schema.prisma`, `src/server/platform/capability.ts` |
| `FormFieldDefinition` (field metadata, closed type enum) | `CustomFieldSchema` (`fieldName`, `fieldType`, `required`, `selectOptions`) + `experience.ts`'s `buildFormDescriptor`/`buildTableDescriptor` | `prisma/schema.prisma`, `src/server/platform/experience.ts` |
| `WorkflowDefinition`/`ApprovalRule` (condition -> action -> approver) | A full DAG workflow engine: `WorkflowDefinition`/`WorkflowNode`/`WorkflowEdge`, `EdgeCondition` (`path`/`op`/`value`, ops `eq/neq/gt/gte/lt/lte/exists`), versioned (`WorkflowDefinition.version`), idempotent runs | `prisma/schema.prisma`, `src/server/platform/workflow.ts` |
| `DocumentTemplate` (template text, tenant + global) | Not built for documents specifically, but `NotificationTemplate` is the identical shape one substitution mechanism over (tenant + key + channel + subject/body + `version Int`), with `renderTemplate()`'s literal `{name}` substitution already the answer to this doc's own open question 5 | `prisma/schema.prisma`, `src/server/platform/notification.ts` |
| `NavigationConfig` (derived vs. real table) | Derived, no table — `contribution.ts`'s `NavigationContribution`/`navigationFor()`, filtered by active capability + role grants + shell | `src/server/platform/contribution.ts` |

**What this changes:** `adr-019` and `CLAUDE.md`'s build-priority list both
describe item 10 as unbuilt. That framing predates this check and should
be read as: *item 10 as a labeled, consolidated effort* was never done —
but its substance was already built, incrementally, under other task
numbers (custom fields per the platform `CLAUDE.md`'s own note, Tasks 84's
workflow-adjacent needs, notification templates), never cross-referenced
back to "item 10" until now. The ADR's actual DECISION (reject Payload) is
unaffected by this correction — it did not depend on item 10 being
unbuilt, only on tenant isolation's enforcement mechanism, which this
finding does not touch.

**What is genuinely still missing**, now that the false gaps are removed:

1. **`DocumentTemplate`** for generated documents (quotation/invoice PDF
   layout, notice text) — `NotificationTemplate`'s exact shape, applied to
   a different consumer (document generation, not notification dispatch).
   This is a small, fully precedented addition, not an open design
   question. Not built here — still gated on `CLAUDE.md`'s build order —
   but no longer needs a design pass, only implementation when its own
   trigger arrives (a real document-generation requirement, which
   Task 100's remaining sparkline/report work or a future client may
   supply).
2. **Arbitrary per-capability configuration parameters beyond on/off.**
   `TenantActivation` covers activation state and version pin; it has no
   JSON parameters bag for something like "this tenant's credit-hold
   threshold." No concrete requirement has asked for this yet — per this
   project's own anti-speculative-feature stance, it stays unbuilt until
   one does, rather than adding a settings blob nothing currently reads.

The rest of this document (sections 1, 3-6 below) is kept as a historical
record of the analysis, corrected inline where a section's own claim was
superseded by the table above — not deleted, since the reasoning about
*why* a bounded five-piece model is right (§1's three-tier boundary
still holds) remains valid even though the pieces themselves already
existed.

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

**Superseded by the Correction above — four of these five already exist.**
Kept for the reasoning (why five narrow pieces, not a meta-schema), not as
a build list.

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

## 6. Open questions — resolved 2026-09-08 by finding the existing code

- **`NavigationConfig`: derived view vs. real table.** RESOLVED: derived,
  no table. Already built — `contribution.ts`.
- **`FormFieldDefinition`'s type enum.** RESOLVED: `String | Number |
  Boolean | Select | Date` (`CustomFieldType`, `prisma/schema.prisma`).
  Already shipped and rendering end-to-end via `experience.ts`. No
  `reference` type exists — a custom field cannot point at another
  record; nothing found in `plywood`/`trading` needed one, so this is not
  a gap, just a boundary worth naming for the next capability that might
  ask.
- **`WorkflowDefinition`/`ApprovalRule` condition grammar.** RESOLVED:
  `EdgeCondition { path, op: eq|neq|gt|gte|lt|lte|exists, value }`,
  single-condition per edge (`workflow.ts`). No boolean combinators
  (AND/OR) exist — a node with multiple outgoing edges, each with its own
  single condition, is how the shipped engine expresses branching instead.
  No known requirement has needed a combinator; per this project's own
  anti-speculative stance, not added until one does.
- **Versioning.** RESOLVED, and by a simpler answer than task 103
  guessed: not a shadow-table history pattern at all. `WorkflowDefinition`
  and `NotificationTemplate` both use a plain `version Int`, bumped on
  change, no separate history table. `CustomFieldSchema` has no version
  field and doesn't appear to need one — a custom field's definition
  changing is rare and low-stakes compared to a workflow or template
  changing. Task 103's Payload-inspired "shadow-table versioning"
  recommendation was reasonable speculation that turned out unnecessary
  once the actual shipped pattern was checked.
- **Ownership of `DocumentTemplate` content.** RESOLVED by precedent:
  `renderTemplate()`'s literal `{name}` substitution
  (`notification.ts`) — "a stored template that can evaluate expressions
  is a stored program," the same reasoning applies to a document
  template. `DocumentTemplate` itself is not yet built (see Correction
  above) but its content mechanism, when it is, should reuse
  `renderTemplate()` rather than invent a second substitution engine.

All five resolved without needing a new design decision — each was
answered by an already-shipped, already-tested pattern. This is itself
evidence for `adr-019`'s underlying bet: the native path did not need
Payload's tooling to arrive at a coherent, bounded configuration model.

---

## Explicit boundary

**This document no longer blocks anything.** Its original purpose —
resolve open questions before item 10's native shape could be trusted —
is moot, since four of five pieces are already built and in production
use, and the fifth (`DocumentTemplate`) is a small, fully precedented gap
with no design question left open. Building `DocumentTemplate` itself
still waits on its own concrete trigger (a real document-generation
requirement), same as any other Category 3 item — this document does not
manufacture that trigger, it only removes the "needs design" blocker that
would have applied once the trigger arrives.

`CLAUDE.md`'s build-priority item 10 and `adr-019`'s description of it
should be read in light of this correction: substantially done, never
consolidated under that label until this document found it.
