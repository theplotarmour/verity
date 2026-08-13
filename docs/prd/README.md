# Verity PRDs

PRDs describe deltas from current code. They are not the canonical platform model and must not contradict the architecture docs.

Read first:

1. [../README.md](../README.md)
2. [../07-architecture/current-architecture.md](../07-architecture/current-architecture.md)
3. [../07-architecture/target-architecture.md](../07-architecture/target-architecture.md)
4. [../11-roadmap/immediate-priorities.md](../11-roadmap/immediate-priorities.md)

## Documents

| # | Document | Purpose |
| --- | --- | --- |
| [00](./00-module-system.md) | Module system | Manifest, installer, ownership |
| [01](./01-metering-and-billing.md) | Metering and billing | Pricing/subscription behavior |
| [02](./02-ai-assistant.md) | AI assistant | Configuration assistant and safe tools |
| [03](./03-module-contract.md) | Module contract | Developer platform / SDK target |
| [04](./04-franchise-modules.md) | Franchise modules | Kitchen Ops, Field Compliance, Franchise Ops |
| [05](./05-master-data-refinements.md) | Master Data refinements | Master Data UI/data consistency |
| [06](./06-veda-backports.md) | VEDA backports | Deliberate backports from VEDA |
| [07](./07-usability-and-vertical-completeness.md) | Usability and vertical completeness | Missing module surfaces and vertical setup gaps |

## Current State vs Target

| Claim | Current status |
| --- | --- |
| Modules are independently enabled per tenant | Partial. `ModuleEntitlement` exists and many paths use it. |
| Disabled modules are fully blocked | Not complete. Some legacy optional routes/actions still lack module guards. |
| Each module owns permissions and nav | Partial. Registry owns many permissions/nav entries, but legacy permissions remain active. |
| Each module owns DB tables | Not complete. Tables still live in one Prisma schema; ownership is convention. |
| Modules declare versioned contracts | Partial. Static versions exist in registry, but per-tenant module deployment versions do not. |
| Packs compose modules without business logic | Mostly true in `src/platform/tenancy/packs.ts`; app code must still avoid pack/industry branching. |
| Dashboard is module-composed | Not built. Current dashboard still switches by pack/industry. |
| Event bus | Not built. Notifications are the interim. |
| Configurable workflow engine | Not built. Workflows remain per module. |
| Blank tenant portal | Not fully proven. |

## PRD Rule

When a PRD says "must", it is a requirement. When it says "built", it must point to current code and tests. Do not upgrade aspirational PRD language into completion claims without repo-backed verification.
