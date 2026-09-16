# Module Catalog and Capability Completion Matrix

## Platform-level verdict

**NOT A COMPLETE MODULAR PLATFORM.** Twenty capabilities register into one runtime and the catalog/activation/entity-ownership foundation is real. Completion stops at individual activation plus navigation/workspace/schedule contributions. There is no pack runtime, no supported capability upgrade path, no packaged extension lifecycle, and no generic dashboard contribution contract.

## Catalog mechanics

| Mechanic | Evidence | Status |
|---|---|---|
| Stable capability IDs | `verity.capability.<name>` constants and seeded `CapabilityDefinition` rows | BUILT |
| Dependency declarations | `CapabilityDefinition.dependencies`; activation trigger/checks | BUILT |
| Entity ownership | `entityTypes`, registry lookup, capability resolution for commands/queries | BUILT |
| Tenant activation state | `TenantActivation` Active/Suspended plus HQ controls | BUILT |
| Activation enforcement in command/query plane | `command.ts` and `query.ts` call `requireCapabilityActive` | BUILT / VERIFIED STATICALLY |
| Activation enforcement in presentation plane | Direct Server Components query Prisma under tenant/permission scope | FAIL; see VCA-006 |
| Navigation contribution | `contribution.ts` and capability contributions filtered by active ID/shell | BUILT |
| Workspace contribution | Active-capability queue composition | BUILT |
| Schedule contribution | Contribution contract plus dispatcher | BUILT, deployment binding incomplete |
| Dashboard contribution | No generic contribution type; `/overview` remains domain-specific | NOT BUILT |
| Industry Pack manifest/activation | Specification only | NOT BUILT |
| Tenant version upgrade/migration | `pinnedVersion` stored/displayed only | NOT BUILT |
| Extension package hooks/layout injection | Spec marks future; no `src/extensions` | NOT BUILT |

## Shipped capability inventory

“PARTIAL” below means there is executable domain code but the current 31-point implementation contract plus 8 reusable-capability tests is not completely evidenced. It does not mean the capability is empty.

| Capability | Implementation evidence | UI/contribution | Current proof | Audit status |
|---|---|---|---|---|
| Location | commands, one query, place/address/geofence/scope resolver | `/locations`, detail, nav | broad historical/current test references; DB suite blocked | PARTIAL |
| Asset | commands/query, state/custom fields | `/assets`, detail, nav | shared/cross-cap tests exist; not rerun | PARTIAL |
| Evidence | reserve/reference flows; storage contract | `/evidence`, entity panels | file tests exist; live storage untested | PARTIAL |
| Scheduling | calendar/booking commands/query | `/scheduling`, nav | registry/composition tests exist; scheduler deployment absent | PARTIAL |
| Approval | request/decide commands/query | `/approvals`, workspace/nav | shared tests exist; current DB run blocked | PARTIAL |
| Trading | broad commerce, stock, tax, finance, import/export code | 20+ route links shared by verticals | clean build; pure import test has 1 failure; DB suite blocked | PARTIAL, substantial |
| Plywood | board detail plus plywood-specific workflows over Trading | 20 route links, overview/workspaces | deepest client slice; target logistics gaps | PARTIAL, substantial |
| Dine-in | menu/floor/order/kitchen/bill/payment and SLA schedule | 8 route links, worker/admin surfaces | substantial test suite exists; on-prem schedule/live chain unproved | PARTIAL, controlled baseline |
| Accounting | journal/reversal/report MVP | contribution/nav | no capability-local test file; conformance walk not current | PARTIAL MVP |
| Inventory | item/stock/movement MVP | contribution/nav | cross-cap tests exist; not rerun | PARTIAL MVP |
| HR | employee/leave MVP | contribution/nav | referenced by shared/conformance tests | PARTIAL MVP |
| Billing | invoice/payment MVP | contribution/nav | audit-remediation reference only in current scan | PARTIAL MVP |
| Recipe | BOM/recipe/wastage slice | contribution/nav | recipe tests exist; not rerun | PARTIAL lean V1 |
| CRM | customer profile/activity slice | contribution/nav | CRM tests exist; not rerun | PARTIAL lean V1 |
| Loyalty | points/ledger slice | no direct nav | indirect tests only | PARTIAL lean V1 |
| Coupon | issue/redeem slice | no direct nav | coupon test exists; not rerun | PARTIAL lean V1 |
| Complaint | complaint/service-recovery slice | contribution/nav | complaint test exists; not rerun | PARTIAL lean V1 |
| Attendance | punch/attendance slice | contribution/nav | attendance test exists; not rerun | PARTIAL lean V1 |
| Finance | expense/cash/P&L slice | contribution/nav | finance test exists; not rerun | PARTIAL lean V1 |
| Outreach | 59 literal operation keys, 30 query definitions, lead/team/targets/intelligence/AI | 7 route links and role-oriented pages | 117-test safe slice excludes DB flows; outreach DB suite blocked | PARTIAL, broad but not current-certified |

## Cross-plane scenarios

| Scenario | Control plane | Presentation plane | Execution/data plane | Result |
|---|---|---|---|---|
| Activate capability | HQ activation + dependency check | nav/workspace contributions appear | commands/queries allowed | PARTIAL; no current isolated e2e |
| Suspend capability | status becomes Suspended | nav hides contribution | commands/queries reject | FAIL because direct route reads can remain accessible |
| Activate a dependency chain | DB trigger/check and activation command | separate contributions | entity owner checks | BUILT NOT VERIFIED CURRENTLY |
| Upgrade capability | pinned version can be stored | version visible | no migration/compatibility transaction | FAIL |
| Activate Industry Pack | no manifest/control | no pack-composed UI | no atomic activation/config | NOT BUILT |
| Install client extension | no package registry | no layout injector | no hook/version sandbox | NOT BUILT |

## Completion rule

No capability should be relabeled `COMPLETE FOR DECLARED SCOPE` until it has a dated dossier mapping all 31 contract requirements and 8 reusability questions to source plus green isolated tests, including active/suspended behavior, permissions/scopes, custom fields, audit/events, performance baseline, portability, and upgrade compatibility.

