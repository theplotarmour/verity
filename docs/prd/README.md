# Verity PRDs

The architecture document says what Verity should become. These say what to
build, in what order, and how you will know it worked.

One rule for everything here: **a PRD describes a delta from the code that
exists today, not a greenfield system.** Verity already has multi-tenancy, a
module registry, entitlements, four vertical packs and 408 tests. A PRD that
ignores that produces a rewrite estimate instead of a plan.

## The documents

| # | Document | Phase | Blocks |
|---|---|---|---|
| [00](./00-module-system.md) | Module system — manifest, installer, ownership | A | Everything below |
| [01](./01-metering-and-billing.md) | Metering & subscription billing | A | Charging for anything |
| [02](./02-ai-assistant.md) | AI assistant (Groq) | A | The implementation-cost wedge |
| [03](./03-module-contract.md) | Module contract & developer platform | D | External developers |
| [04](./04-franchise-modules.md) | Kitchen Ops, Field Compliance, Franchise Ops | B | Franchise pack completeness |

Read 00 first. The other four assume the manifest exists.

## Status of the architecture's claims

The architecture makes six promises. Three are substantially true today, three
are not yet built. Stating which is which is the point of this table — the
roadmap's Phase A is short because most of the substrate is already there.

| Claim | Reality |
|---|---|
| "Modules are independently installable units" | **Partly.** `ModuleEntitlement` already turns modules on and off per tenant, and `guardModuleAction` / `guardModulePage` enforce it. But a module is an entry in one registry file, not a folder that owns anything. See [00](./00-module-system.md). |
| "Each module owns its DB tables, permissions, nav items" | **Permissions yes, the rest no.** Permissions are declared per module in the registry. DB tables live in one 2,500-line `schema.prisma`. Nav items are a hardcoded array in `owner-shell.tsx` that *filters* on `requiredModule` — module-aware, but not module-owned. |
| "Modules declare versioned contracts; core never breaks them" | **Not built.** `ModuleDefinition` has no `version` field. Nothing to break yet, which makes now the cheap time to add it. |
| "Pay only for active modules, per month" | **Not built.** Billing is a flat `Factory.monthlyFee` integer. There is no per-module price, no metering, and no platform→tenant invoice. See [01](./01-metering-and-billing.md). |
| "Vertical packs compose a tailored UI from the same modules" | **True.** Four packs, each resolving to a dashboard through `resolvePackKey`, guarded by a test that fails if a pack has no dashboard case. |
| "AI assistant configures 80% on first setup" | **Not built.** No Groq integration, no assistant surface. See [02](./02-ai-assistant.md). |

## Open questions for the business

These are decisions the PRDs cannot make on your behalf, flagged where they
appear. Collected here because each one blocks a section.

1. **The pack pricing does not produce the stated discount.** Priced at the
   midpoint of the published tier bands, the Auto Components pack costs
   ₹24,750 à la carte and ₹24,999 as a pack — the bundle is *more expensive*.
   The advertised 25–30% only appears if every module is priced at the top of
   its band. Detail and worked numbers in [01](./01-metering-and-billing.md).
2. **Per-user overage contradicts the competitive thesis.** Section 2 of the
   architecture praises Frappe for charging per site rather than per user, and
   calls that "the pricing model SMBs want". Section 5 then adds ₹500/user
   beyond five. Both can be defended; they cannot both be the pitch.
3. **There is no free tier.** Odoo's "One App Free" is its acquisition funnel,
   and the table treats it as a trap rather than as competition. Verity's
   cheapest entry is ₹7,500/month. That is a deliberate choice or an oversight,
   and it decides whether self-serve signup is worth building.
4. **Which pack does a new tenant get by default?** Today an unrecognised
   `industry` falls back to the auto-components dashboard. That is right for
   the current client mix and wrong once retail outnumbers factories.
