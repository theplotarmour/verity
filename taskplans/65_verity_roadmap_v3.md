# Verity Roadmap v3 — customer-driven

**Supersedes** the theoretical Phase 9–14 sequence in
`taskplans/21_implementation_roadmap_v2.md` for planning purposes. That document
remains the V2 authority for what Phases 1–8 were; this one governs what happens
next.

Authority: product owner, 2026-09-01.

## 1. The change

The old plan built capability against a predicted future — an AI platform, a
generic integration platform, a library of vertical packs — before a single
customer had asked for any of it. Roadmap v3 refuses to spend engineering
capacity on anything a customer has not paid for or an audit has not flagged.

Nothing is cancelled. AI, the generic integration platform, and the vertical
pack library are **deferred, not deleted**: they re-enter the plan when customer
evidence justifies them, and not before.

## 2. Status

| Phase | Name | State |
|---|---|---|
| 7 | Portable Runtime | ✅ Complete |
| 8 | Enterprise Foundation | ✅ Complete |
| 10 | Enterprise Codebase Audit | 🔄 **Current** |
| 10A | Security Remediation | ⏭️ Next — findings-driven |
| 11 | Client #1 Implementation | ⏳ When a client or tender is active |
| 12 | Client #2 / Reusable Extraction | ⏳ Client-driven |
| 13 | Deployment & Delivery Operations | ⏳ As client volume grows |
| 14 | Scale / Enterprise Maturity | ⏳ Later |

Phase 9 (AI) is deferred, not sequenced.

## 3. Phase 10 — the audit, and its one hard rule

Tasks 46 (red-team), 46A (API inventory), 46B (sensitive-data flow).

> **No production code is modified during the audit.**

This is not process hygiene. An auditor who fixes as they read stops being able
to say what the system was, produces a findings list that no longer matches any
commit, and loses the ability to distinguish "we found this" from "we happened
to change this". Findings are recorded; remediation is Phase 10A.

46A and 46B are **permanent reference artifacts**, not throwaway working notes.
They are re-read at every client security questionnaire and every upgrade.

## 4. Phase 10A — remediation, numbered by findings

Tasks are created from what the audit actually found, never invented in advance.
The one that exists already:

- **Task 47 — Next.js security upgrade.** `next@16.2.10` is the standing P1.

Further task numbers (48, 49, 50…) are assigned when a finding justifies them.

### Enterprise Baseline Freeze

Once P0 and P1 findings are cleared, the statement is:

> **Verity Enterprise Baseline v1 is ready for controlled customer
> implementation.**

Not "Verity is finished". The distinction is load-bearing: a baseline is a
version you can responsibly deploy and support, not a product that has stopped
changing.

## 5. Phase 11 — Client #1, and the rule that protects the core

No generic vertical packs are built ahead of demand. A client gets a client
directory: PRD, requirements, process maps, data-model extensions, workflow
extensions, integrations, reports, dashboards, permissions, deployment
configuration, acceptance criteria.

**Every requirement is classified before it is built:**

```
                   Requirement
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       CORE          REUSABLE        CLIENT
                       PACK          SPECIFIC
          │              │              │
          ↓              ↓              ↓
      Verity Core    Vertical Pack   Extension
```

- Three clients need approval chains → **Core**.
- Two construction clients need BOQ workflows → **Construction Pack**.
- One airport has a proprietary runway workflow → **Client Extension**.

This is the rule that stops Verity becoming an unmaintainable collection of
customer hacks. It is the same test the foundation-ready definition in
`CLAUDE.md` already sets: a capability built for one client must be reusable by
the next, without forking.

The plywood capability is the worked precedent — it is a client-shaped
capability that added no platform primitive, and the one platform change it did
need (`NavigationContribution.supersedes`) was general enough that the shared
capability it affects never learned the pack's name.

## 6. Phase 12 — extraction happens after evidence, not before

When three clients have each needed an SAP integration, SAP integration is
demonstrably reusable and gets extracted. Same for document workflows, approval
patterns, reporting, notifications, industry entities, dashboards, importers.

The customer work tells us what Verity should become. Not the reverse.

## 7. Phases 13 and 14

**13 — Delivery operations.** Formalised once Verity is deployed repeatedly:
discovery → architecture → configuration → data migration → integration →
deployment → testing → training → go-live → SLA → upgrade. Plus reusable
checklists, migration and acceptance templates, security questionnaires, IT
handover docs, backup/restore procedures, upgrade runbooks, support procedures.

**14 — Scale.** Only with multiple live deployments: fleet and version
management, entitlement, remote diagnostics, HA, DR, Kubernetes, advanced
observability, performance engineering, compliance. Building any of it earlier
is capacity spent on a problem nobody has.

## 8. The loop

```
Sell → deploy → learn → extract → strengthen Core → sell again
```

## 9. What actually stands between here and client work

The audit result, and remediation of anything genuinely P0 or P1. Nothing else.
