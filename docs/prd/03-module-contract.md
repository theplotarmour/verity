# PRD 03 — Module Contract & Developer Platform

**Phase D · Depends on PRD 00**

## Problem

The moat is composability: thirty modules that mix and match, some written by
people outside the core team. That only works if "a module" has a definition
precise enough to review against, and a review that catches the things a human
reviewer misses.

The thing a human reviewer misses is tenant isolation. It is a missing `where`
clause in one of forty queries, and the code around it looks correct because the
bug is an *absence*. Verity already learned this internally — `tenant-isolation.test.ts`
exists because a structural check catches what review does not — and an external
developer has less context than an internal one, not more.

## Goals

1. One document a developer can build against without reading core.
2. A CI gate that mechanically rejects a module violating the contract.
3. Scaffolding that makes the correct shape the default shape.

## Non-goals

- **A public marketplace.** Partner developers are onboarded individually,
  code-reviewed, and shipped in the core deploy. A self-serve marketplace with
  untrusted code is a different product and a much larger security surface.
- **Revenue share.** Commercial terms are not a PRD.

## The contract

A module is a folder under `src/modules/<key>/` containing:

```
manifest.ts        # ModuleManifest — PRD 00
schema.prisma      # models this module owns (see Deferred in PRD 00)
actions/           # server actions, tenant-scoped
components/        # UI
routes/            # pages injected into the shell
index.ts           # the ONLY public surface
module.test.ts     # the contract test
```

### Rules, in order of how badly breaking each one hurts

1. **Every query is tenant-scoped.** Any query that opens a scope names
   `factoryId`. Detail lookups use `findFirst({ id, factoryId })`, never
   `findUnique` by bare id — the latter returns another tenant's row and leaves
   the check to whatever comes next, which is the check people forget.
2. **No exported action takes a `factoryId`.** It comes from the session. A
   parameter naming the tenant is a parameter a caller can change.
3. **Cross-module access goes through `index.ts`.** Reaching into another
   module's internals couples you to its refactors and breaks the version
   promise.
4. **Declare, don't register.** Nav, permissions and settings routes come from
   the manifest. A module that edits a shared file is not installable.
5. **Version honestly.** Breaking the public surface is a major bump.
6. **Deactivation hides, never deletes.**

## Requirements

### R1 — `module.test.ts`, required
Every module ships one, and CI fails without it. It must:

- assert the manifest resolves — every `requires` and `optional` exists;
- exercise the three most consequential server actions against a seeded tenant;
- assert tenant isolation across every query in the module.

The isolation assertion is not written per module. It is
`assertTenantIsolation("<key>")`, exported by the platform, reusing the existing
`tenant-isolation.test.ts` machinery: it parses the module's sources, finds
scope-opening queries on models that own a `factoryId`, and fails naming file
and line. Modules opt in by key; they do not reimplement the check, because a
reimplemented check is a check that can be reimplemented wrong.

**Acceptance:** deleting a `factoryId` filter in a module fails that module's
test with the file and line — the same way it does today for core.

### R2 — CI gate
A PR touching `src/modules/<key>/` must pass:

| Check | Fails when |
|---|---|
| Manifest validity | key collides, dependency missing, price outside its tier band |
| Isolation | any unscoped query |
| Import boundary | reaching past another module's `index.ts` |
| Version | public surface changed without a bump |
| Test presence | no `module.test.ts` |

### R3 — Scaffolding
`npx verity-cli module:create <key>` generates the folder with a filled manifest,
one example tenant-scoped action, and a `module.test.ts` already calling
`assertTenantIsolation`.

The generated test must **pass on generation and fail if the developer removes
the scoping from the example action.** Scaffolding that emits a test which
passes vacuously teaches the developer the check is decorative.

### R4 — Module store (HQ)
Operators browse modules, see the manifest, dependencies and price, and
activate per tenant. Reads the same manifests as everything else.

Activation shows what will be pulled in as dependencies *before* confirming —
an operator enabling Manufacturing should know Inventory arrives with it and
what that adds to the bill.

### R5 — Developer documentation
The contract above, the manifest reference, a worked example building a small
module end to end, and the isolation rules with the reasoning. The reasoning
matters: a rule with a stated cause gets followed in the cases the rule did not
anticipate.

## Risks

| Risk | Mitigation |
|---|---|
| A partner module leaks across tenants | R1/R2 — mechanical, not review |
| Modules couple to each other's internals | Import boundary lint |
| Manifest and code drift | Manifest is the only source for nav, permissions and price |
| Scaffolding teaches bad habits | Generated test must fail when scoping is removed |
| Store activation surprises an operator with cost | R4 shows dependencies and price delta before confirming |

## Success criteria

- A developer outside the core team ships a module without reading core.
- A module with an unscoped query cannot merge.
- Every module in the store shows the same manifest the code runs on.
