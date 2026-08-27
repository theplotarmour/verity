# Kent's Restaurant — requirement → contract → gap

**Date:** 2026-08-27
**Requirement source:** `KentsRestaurant.md` (client requirements as received, §1). Nothing below is
invented; every row traces to a stated need.
**Purpose:** the analysis PLATFORM-FREEZE requires before code — can existing primitives carry this,
and where they cannot, what exactly is missing.

---

## 1. The decision path, answered

| # | Requirement (§1, verbatim intent) | Existing contract that carries it | Gap |
|---|---|---|---|
| 1 | Waiter takes orders at the table; marks a table occupied | Command runtime, state runtime, capability-owned tables | **None.** Capability code |
| 2 | Kitchen sees incoming orders and what to cook | Query runtime + state categories + SLA substrate | **None technically.** Blocked by **D11** — DEC-001 needs an ADR before the kitchen *screen* is built |
| 3 | Billing counter completes orders, takes payment, frees the table | Command runtime; config for tax rates | **None.** Capability code |
| 4 | Menu management | Capability-owned tables + custom fields (PLA-EXT-002) | **None** |
| 5 | Floor map for tables | Capability-owned table with `posX`/`posY` | **None** |
| 6 | Staff roles, each seeing only their own surface | Role + Permission + RoleComposition + `resolve_permissions`; navigation `requiresEntity` gating | **None.** Now administrable through HQ |
| 7 | GST-compliant itemised bill | Capability tables + `ConfigParameter` for rates | **None** |
| 8 | Per-item kitchen progress | `OrderLine` with its own state machine | **None** |
| 9 | Live-enough kitchen view | Polled server components | **None for v1** (D1: poll now, push when >10 devices) |
| 10 | Day-end sales summary | Queries over bills/payments | **None** |

**Conclusion: zero platform changes required.** Every requirement lands on a contract that exists
and is proven. This is one capability — `verity.capability.dinein` — plus its own tables, exactly the
shape PLATFORM-FREEZE calls "expected and additive".

## 2. What is deliberately NOT reused, and why

Reuse is not free, and three near-misses would each have cost more than they saved:

| Tempting reuse | Rejected because |
|---|---|
| Tables as `Resource` + `Booking` (ADR-008) | Occupancy is a state machine, not a calendar. Booking's overlap trigger solves double-*booking*; double-*seating* is prevented structurally by the occupy precondition. When Kent's asks for time-slot reservations, ADR-008 already shapes the additive path (D9) |
| `OrderLine` as `ChecklistItem` (ADR-006) | ChecklistItem is a work sub-step. An order line is a commercial line item — quantity × price snapshot × independent kitchen progress. Forcing it would corrupt both |
| Guests as `Party` (ADR-001, ADR-007) | A walk-in diner has no login and must not mint a platform identity. Optional name/phone are plain fields on the order, for the occasional B2B invoice |
| Approval capability for discounts | Nothing here needs a chain. A permission gate is the requirement; an approval workflow would be ceremony |

## 3. Purpose-built, deliberately

Per PLATFORM-FREEZE's second half — configuration is not a virtue:

- Tax computation is a real function with real rules, reading **rates** from configuration. The
  rates vary; the arithmetic does not, and a configurable tax *expression language* would be a
  stored program in a tenant's hands.
- The floor map persists real coordinates. There is no generic "diagram" abstraction.
- Order and line states are hard-coded to this domain. A restaurant order is not a generic Work
  item with a settings page.

## 4. Blocked, and not worked around

| # | Item | Class | Effect on this build |
|---|---|---|---|
| **D11** | DEC-001 excludes a Kitchen Display System from Verity *core*. Kent's requirement #2 is a kitchen order view | **Missing ADR** | The domain — line states, transitions, the advance command, the queue query — is capability code and proceeds. **The kitchen screen is not built.** It needs owner sign-off that DEC-001 governs a core module, not purpose-built screens inside a client capability |
| **D7** | Shared-tablet staff switching (PIN over session) | **Security boundary — needs ADR** | Not designed, not built. Per-device personal sign-in until then |
| **D2** | Nothing invokes `sweepBreaches` or the notification drain | Missing provider binding | SLA clocks run and record correctly; breach *sweeping* needs a scheduler. Kent's is the requirement that makes it real, but binding one is a deployment decision, not a code one |
| **D3** | Storage driver for menu/bill photos | Implementation decision | Photos are optional in v1; nothing depends on it |

Everything else in the design is unblocked.

## 5. What gets built

```
prisma/schema.prisma          + 8 capability-owned models (additive section)
prisma/migrations/…_dinein    tables, RLS policies, capability + entity registration,
                              state and transition seeds
src/server/capabilities/dinein/   entities, commands, queries, contribution
src/server/capabilities/registry.ts   one line
src/app/(shell)/dinein/…      floor, order, counter and manager surfaces
src/test/capability-dinein.test.ts    the full service chain, isolation, guards
```

Nothing under `src/server/platform/`. Nothing in the shell's internals. If that changes, work stops
and PLATFORM-FREEZE's three-question rule applies.
