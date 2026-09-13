# Task 105 — PlotArmour Outreach Team Management System (PA-OMS) capability

Authority: `clients/pa-oms/PlotArmour_Outreach_Team_Management_System_Master_Context.md`
(full spec, 120 sections) plus `clients/pa-oms/handbook-outreach.html` (the
operating constitution PlotArmour interns work under — source-of-truth rank,
per the handbook's own Ch. 00: Internship Agreement > approved commercial
info > **this handbook** > leadership instructions; the master-context doc
is the Verity build brief that translates the handbook's rules into system
requirements, not a competing authority), plus the org roster given
2026-09-12 (user message, this session). Scoped down per
`[[feedback_lean_v1_scope]]` (user memory: client builds get the minimum
modules needed, not full PRD depth) — same posture as Colonel Kebabz's
phased lean-V1 builds and the CRM module's 2026-09-10 scope correction.
This is a **client capability build**, not a platform-core change — governed
by `verity-client-capability-builder`
(`.claude/skills/verity-client-capability-builder/SKILL.md`), not a
platform-primitive addition.

## Status: BUILT and LIVE — Phases 0, 0.5, 1, 2, 3, 4, 5 done (2026-09-12/13)

**Phase 2 (role-scoped views) — DONE**, scoped pragmatically rather than
as the full ground-up redesign the roadmap flagged as "real design work."
What shipped:
- **`OutreachDirection`** — new table + migration
  (`20260913100000_outreach_direction`), append-only (a new direction
  closes the prior Active one, never edits it — ADR-009). `postCompanyDirection`
  command, `getCurrentDirection`/`listDirections` queries. Permission grants
  added both live (one-off, same shape as the Kulsoom/Radhika fix) and in
  `seed-pa-oms.ts` (Founder: Create+Read+Edit; Senior/Junior: Read only) —
  this closes a real gap: the original primitive-mapping table named
  `OutreachDirection` as a concept back on 2026-09-12 but never actually
  built it until now.
- **Attention/exceptions** (`getAttentionExceptions` query + inline logic
  in `/outreach`'s page) — missing check-ins per team, overdue follow-ups,
  leads with no next action. Surfaced as short exception lines, not an
  event firehose, per master-context §9's own instruction.
- **`/outreach/workspace`** — Junior's "My Workspace": today's counts, my
  active leads, my overdue follow-ups, individual targets, check-in status.
- **`/outreach/team`** — Senior's "Team Command": per-member performance
  table (leads/outreach/closed/overdue), team overdue list. Shows "you
  don't lead a team" for anyone who isn't a leader-of-record — same
  structural check as the Phase 3 fix, not a role-name check.
- Both Attention and Company Direction panels gated by `Create` permission
  on `verity.outreach.direction` as the "is this Company Core" signal —
  deliberately reusing an existing permission check rather than inventing
  a new role-detection primitive.
- **Not done** (genuinely deferred, not silently dropped): a real redesign
  of the three views as visually distinct products (impeccable-level
  design pass). What shipped reuses the existing design system's ordinary
  components — functionally role-scoped, not yet three products that "feel
  like three different products" per spec §100's literal ask.

**Phase 5 (reporting layer) — DONE, narrower than the roadmap's full scope.**
- Company weekly roll-up (`/outreach/reports`, Founder-only): per-team
  lead/closed counts, aggregated live.
- Bottleneck detection (`detectBottleneck()` in `reports/page.tsx`) — the
  5-rule heuristic from master-context §63 (outreach→response,
  response→qualification, qualification→proposal, proposal→close,
  prospecting→outreach), computed over already-agreed facts (the funnel
  counts), not designed ahead of the data — refuses to guess below 5
  prospected leads.
- **Not done**: vertical/channel intelligence (explicitly P1, stays
  deferred per this file's own Scope section — real usage data doesn't
  exist yet to build it against).

All of the above live-browser-verified in the same session: posted a real
company direction (displayed correctly, form re-collapses), confirmed
Attention showed real exceptions (missing check-ins for both teams, one
no-next-action lead), confirmed Team Command's and Workspace's "not
applicable to you" states render correctly for a Founder, confirmed the
company roll-up shows real per-team counts. Full `npx vitest run` (whole
repo, not just this capability) re-run clean after every schema/capability
change this pass — no regressions.

**Phase 1 (fill UI gaps) — DONE.** Every command in `outreach/index.ts` now
has a UI surface: reassign-owner, record-advance-payment, and reactivate
buttons/forms added to `LeadActions.tsx`; three new routes —
`/outreach/check-in` (auto metrics + free-text, duplicate-submission
guarded), `/outreach/targets` (set + list, all three scopes), `/outreach/
reports` (individual weekly report + Senior's team weekly assessment,
conditionally shown only to actual team leaders). All four routes added to
the capability's nav contribution. Live-browser-verified end to end
(Chrome DevTools MCP): created a lead, reactivated a terminal one (fresh
row, credit preserved), recorded a payment (rupee↔minor-unit round-trip
correct), hit the 14-day reassignment guard and saw it surface correctly,
submitted a check-in (duplicate-blocked on retry), set a target, submitted
a weekly report. Zero console errors throughout. One test-procedure
artifact caught and dismissed (not a code bug): clicking a freshly-navigated
page's submit button before React finishes hydrating falls through to a
native form GET — not a defect, just means live-testing needs to wait for
hydration before the first interaction.

**Phase 3 (per-team permission enforcement) — DONE.** Picked option 1 from
this file's own two-option list (query-level filtering) since it was
already flagged as "almost certainly correct." `assertTeamScopeAllowed()`
added to `outreach/index.ts`, enforced in all 4 team-scoped queries
(`listOutreachLeads`, `listOverdueFollowUps`, `getFunnelCounts`,
`getTeamWeeklyRollup`, `listOutreachTargets`) AND in both UI pages that read
Prisma directly (`/outreach`'s `?team=` filter, and — the more serious
version of the gap — `/outreach/[id]` fetching a lead by raw id with no
team check at all, which this closes too). A Senior is identified
structurally (leads a team per `OutreachTeam.leaderId`), not by role name,
so it holds under any future role renaming.

**Phase 4 (tests) — DONE for this capability's commands.**
`src/test/capability-outreach.test.ts`, 14 tests, all passing against the
live DB (integration-style, own throwaway tenant, cleaned up in
`afterAll`, same pattern as `capability-crm.test.ts`). Covers: state-
machine legality, the terminal-state rejection-reason guard, the
Closed-Won threshold gate (including the milestone-payment-adds-not-
replaces rule), the 14-day reassignment window, the 90-day reactivation-
credit window (both sides — credit kept and credit reassigned), INV-002
(terminal lead never reopened), the no-member-cap team rule, and all 4
Phase-3 scope checks (Founder unrestricted, Senior own-team allowed,
Senior other-team blocked on all 4 queries). Full existing repo test suite
re-run after all changes — passed clean, no regressions introduced.
**Not yet done**: a foundation-conformance script (Task 85's pattern) —
this is unit/integration coverage, not that specific artifact.

**Not started**: Phase 2 (role-scoped Junior/Senior/Company-Core views —
real design work), Phase 5 (reporting layer beyond what already exists),
Phase 6 (deferred P2 items). See the Roadmap section below, unchanged
except for the phases marked done here.

Kulsoom/Radhika real emails (`kulsoom@plotarmour.in`,
`radhika@plotarmour.in`, given 2026-09-13) synced to both Supabase Auth and
`Party.email` — all 19 people now have real, final logins.

<details><summary>Original Phase 0/0.5 status (2026-09-12, superseded by the summary above — kept for detail)</summary>

## Status: BUILT and LIVE 2026-09-12

Tenant `1e1785d9-5afa-4288-85cc-c056f5cae2c5` ("PlotArmour Studio"),
Organization `10d0adf5-6504-48b3-b570-3d6beaaad72e`. Migration applied
(`prisma migrate deploy`), seed run (`node prisma/run-seed.cjs
seed-pa-oms.ts`), verified directly against the DB: 19 `TenantMembership`
rows, Team 1 `4fbdabf9-a868-4bec-abdf-13be5d284680` (Kulsoom + 7 Juniors),
Team 2 `d6c67cd6-a037-4696-b2ab-358c9fa7281f` (Radhika + 6 Juniors),
`verity.capability.outreach` activated. **All 19 people now have real
`@plotarmour.in` logins** — Company Core's 4 were supplied mid-build; the
last two (Kulsoom, Radhika) were updated 2026-09-12 from their initial
`@plotarmour.verity.app` placeholders via `supabaseAdmin.auth.admin
.updateUserById` (email) + `Party.email` update in the same pass — both
Supabase Auth and Postgres kept in sync, verified by the update script's
own success output for both.

**UI built and live-browser-verified, same day**: `/outreach` (stat row,
team list, funnel, lead table, inline create-lead form) and
`/outreach/[id]` (identity, 3-role attribution, state-machine-driven
transition buttons, rejection-reason capture, activity timeline, log-
activity form). Verified with a real Chrome DevTools MCP session signed in
as Divo: created a real lead, logged a real activity, advanced
`research → prospect → contacted`, forced a terminal transition with a
rejection reason, confirmed INV-002 locked the record (all action buttons
disappeared). Zero console errors throughout.

Two real bugs found and fixed during that live pass:
1. **Nav link invisible on the client tenant** — the capability's nav
   contribution used `group: "Capabilities"`, which `src/app/(shell)/
   layout.tsx` only renders for the platform tenant (its own documented
   audit finding U3-2: a client must never see platform vocabulary).
   Fixed to `group: "Overview"`, matching `crm`'s own precedent for a
   client-facing capability.
2. **Rejection reason unhumanized** — displayed the raw enum `"NoFit"`
   instead of `"No Fit"`. Fixed with the same `.replace(/([A-Z])/g, " $1")`
   pattern used elsewhere in the same file.

One bug caught and fixed during this run: the first seed attempt nested all
19 Supabase Auth network calls inside a single interactive DB transaction,
which blew Prisma's 5s default timeout partway through (at person 13,
Gaurav Thakur) and rolled back — verified clean, zero leftover rows in
Postgres and zero leftover accounts in Supabase Auth (checked both
directly before retrying). Fixed by creating all 19 logins before opening
the transaction, matching `seed-colonel-kebabz.ts`'s actual shape (one
network call before its transaction) instead of nesting network I/O inside
DB atomicity.

Known P0 limitation, recorded not hidden: Senior-role permissions are
granted at `Tenant` scope, same as Founders' — a Senior can technically read
another team's leads through the query API today. Real per-team narrowing
would need either an `Organization`-scope grant (ruled out — teams are
capability-private, not `Organization` nodes, per this taskplan's own
resolved decision) or a capability-level scope check the platform doesn't
have a primitive for yet. UI-level query params scope correctly; the gap is
API-level enforcement, not usability.

<details><summary>Prior status (superseded)</summary>

**PARTIALLY BUILT 2026-09-12 — code complete, not yet applied to the live database**

Built this session: Prisma models (`prisma/schema.prisma`, appended after
`TradingMetricSnapshot`), hand-authored migration
`prisma/migrations/20260912120000_capability_outreach/migration.sql` (RLS +
append-only triggers on every table, `verity.outreach.lead`'s state machine
seeded per handbook Ch. 22's 13+5 states), capability module
`src/server/capabilities/outreach/index.ts` (12 commands, 8 queries — teams,
leads, activity log, targets, daily check-in, weekly report, team weekly
assessment), registered in `src/server/capabilities/registry.ts`, and
`prisma/seed-pa-oms.ts` (new-tenant bootstrap seeding the real 19-person
roster). `npx prisma validate`, `npx tsc --noEmit`, and `npx eslint` all pass
clean.

**Not yet run**: `prisma migrate deploy` (would apply to the shared live
Supabase project this repo's `.env` points at) and the seed script itself
(would create 19 real Supabase Auth accounts under the real given emails —
no email is sent by `email_confirm: true`, but the accounts are real and
this is a one-shot, non-idempotent action). Held for explicit user
confirmation before touching the live database, per this session's own care
around real personal data on a shared external service.

Doc-only so far: `clients/pa-oms/PlotArmour_Outreach_Team_Management_System_Master_Context.md`
(spec) and `clients/pa-oms/handbook-outreach.html` (operating constitution —
Ch. 02 closed-client/attribution, Ch. 20 disqualification taxonomy, Ch. 22
lead-status state machine, Ch. 24 KPI formulas — the concrete field/state
authority this taskplan's mapping table now cites). No schema, no capability
directory, no code. Open question 1 (below) is now **resolved** by explicit
product-owner instruction, 2026-09-12: Team is a first-class, capability-
private entity — see Seed data section.

</details>

## What this is

An internal lead-generation / client-acquisition operating system for
PlotArmour's own outreach interns (Junior Outreach Officer → Senior Outreach
Officer → Founders' Office / Company Core). Three role-scoped views over one
shared lead/activity/pipeline database — not three separate systems (spec
§3, §100).

**Not** a general-purpose CRM (spec §96 explicitly excludes "general CRM
unrelated to acquisition"). PlotArmour's own Colonel-Kebabz-style CRM
capability (`src/server/capabilities/crm/`) is a different, unrelated domain
(restaurant-guest 360, phone-matched, no employee hierarchy) — do not merge
or generalize the two; note the naming collision risk (spec's "CRM" language
in places, e.g. §112 duplicate-detection framing, vs. the existing
`verity.capability.crm` capability) and pick a distinct capability id (see
Naming below) to avoid confusion in `capabilities/registry.ts`.

## Platform primitive mapping (Authority: Bible V2 §3.A metamodel + ADRs)

| Spec concept | Verity primitive | Notes |
|---|---|---|
| Junior / Senior / Founder | `Party` + `User` + `Membership` + `Role` | Standard identity stack (ADR-001, ADR-007). No new identity type — same pattern as `HrEmployee` wrapping an existing `Party` (Task 78), not a second identity record (INV-003). |
| "Team" (Kulsoom / Radhika) | **RESOLVED 2026-09-12** — capability-private `OutreachTeam` entity (Senior + Junior roster), *not* `Organization`. No hardcoded member-count maximum. | `Organization` (ADR-005) is the tenant's own nested business-unit hierarchy; stretching it to mean "an outreach pod" risks the same category error ADR-008 closed for `Resource`/`ResourceGroup`. Precedent: `HrDepartment` is capability-private, not `Organization`. Product owner confirmed this shape directly, 2026-09-12, and explicitly ruled out treating the Internship Agreement's "4-5 Junior Outreach Officers" guidance as a technical cap — Team 1 already runs 7 Juniors live. `OutreachTeam.leaderId` (one Senior), `OutreachTeamMembership` (many Juniors), no size constraint in code; the 4-5 figure is organizational guidance surfaced as a UI hint at most, never a validation rule. |
| Lead / Prospect (§27-30, §108; handbook Ch. 22) | New capability entity `OutreachLead`, tenant-scoped, capability-private (like CRM's `Customer` or HR's `HrEmployee`) | Not `Party` — a prospect company is not yet an identity in Verity's sense until/unless it becomes a client (ADR-001: Party is a bare identity primitive; `Prospect`/`Invited` lifecycles belong to capability, not platform, and CRM/Workforce precedent already established this). |
| Outreach Activity (§31-33) | Command + immutable `OutreachActivity` row, one per logged action | Maps to `Command`/`Event` vocabulary directly — logging an activity IS the event. No separate event table needed if the activity row itself is append-only and audited (Task 38's `ActivityLog`/`reconstructHistory` precedent, Task 92). |
| Pipeline stage (handbook Ch. 22 — the authoritative state list, supersedes the master-context doc's own 16-stage list in §29) | `StateCategory`-backed state machine on `OutreachLead`, using the platform's existing state/transition infrastructure | ADR-009: `StateCategory` closed at `Draft \| Pending \| Active \| Blocked \| Completed \| Cancelled`. Handbook Ch. 22's 13 linear stages (`Research → Prospect → Contacted → Responded → Qualified → Discovery → Opportunity → Handoff → Proposal → Negotiation → Verbal Yes → Invoice/Payment Requested → Advance Received → Closed Won`) map `key`/`label` under `Active`/`Pending` categories as appropriate; the 5 terminal statuses (`Not a Fit`, `Unresponsive`, `Lost`, `Deferred`, `Disqualified`) are `Cancelled`; `Closed Won` is `Completed`. SLA/overdue logic reads `category` only, never `key` (ADR-009 hard rule). Ch. 20's 9-value rejection taxonomy (`No Fit`/`No Budget`/`No Timing`/`Not Interested`/`Wrong Person`/`Revisit Later`/`Lost to Competitor`/`Lost on Price`/`Lost on Scope-Trust`) is a *reason* field on the terminal statuses, not additional states. |
| Company Direction (§10) | Capability-private `OutreachDirection` record, versioned/dated, read by team + individual target rollups | Not a platform primitive — narrower than `WorkflowDefinition`; a dated text/target record, closer to `NotificationTemplate`'s shape than a workflow. |
| Targets (§11-12) | Capability-private `OutreachTarget` rows (company/team/individual × daily/weekly), computed progress via live counts | Same pattern as Task 93's `onboardingChecklist` — computed from live activity/lead counts, never hand-typed. |
| Daily check-in / Weekly report (§20-26) | Capability commands producing append-only report rows, auto-populated numeric fields, free-text qualitative fields | Directly matches spec §21's own "automatic vs manual" distinction — this is not new architecture, just field design. |
| Attribution (§46-48; handbook Ch. 02, the more detailed authority) | Three named roles, not one "owner" — `leadOriginatorId` (set once, immutable), `opportunityOwnerId` (reassignable), `closerId` (set on Closed Won) — plus audit trail via existing `AuditLog` infrastructure (item 8 in build order) | Handbook Ch. 02 is materially more specific than the master-context doc's flat "owner" concept: earliest-timestamp-wins on duplicates (merge, never delete), 14-day-no-activity makes an opportunity reassignment-eligible, reactivation within 90 days of last activity preserves original origination credit, Founder-generated leads carry no origination credit for the intern who runs them. These are business rules to encode as command preconditions, not new platform primitives — reuse existing audit, do not build a parallel one. |
| Closed / advance payment (§30, §76-79; handbook Ch. 02's edge-case table) | `Deal`-equivalent capability entity gating `Closed Won` on an explicit "advance received ≥ threshold" boolean/date, permission-gated | Compensation math (§78-79) reads this field; do not let the `Closed Won` stage alone imply compensation eligibility without the threshold check — handbook Ch. 02 explicitly rules on milestone payments (converts only once *cumulative* payments clear the threshold), reversed/bounced payments (reverts to Negotiation), and payment from a different entity (valid if traceable, Founders' Office confirms). |
| Command channel authority | ADR-017 (agent channel = human's own `ActorContext`) applies unchanged if/when AI assistance (spec §85, handbook Ch. 23, P2) is added — no new authority path. |

## Scope for this pass (P0 only, per spec §119 and lean-V1 memory)

Build only:
- Teams, Users/roles (Junior/Senior/Founder as Roles+Memberships, no new
  identity primitive)
- Leads (creation flow §73, required-at-creation fields only, not all of §28)
- Outreach activity log + timeline (§31-33)
- Follow-ups / next-action rule (§43-44) as a query over lead + last activity
- Targets (company/team/individual, §11-12) — flat rows, no scoring engine
- Daily check-in (§20-23) — auto metrics + free text, no email integration
- Weekly report rollup (§24-26) — aggregation query, no email integration
- Pipeline stages + Closed-status gate (§29-30, §49-50)
- Attribution/audit trail (§46-48) via existing audit infrastructure

Explicitly deferred (P1/P2 per spec §119, and per lean-V1 posture — do not
build speculatively):
- Lead quality scoring (§41), duplicate detection (§45), vertical/channel
  intelligence (§52-54), experiments (§65), AI assistance (§85), email
  integration (§71-72), compensation view (§78) beyond the raw Closed-gate
  boolean, promotion support (§91), onboarding flow (§92-93) as product
  UI (the 10→3→1→100 assignment can be a plain form, not new infra).

## Seed data (org roster given 2026-09-12 — real records, not synthetic fixtures)

```text
COMPANY CORE (4 — company-wide visibility, no team membership)
  Divo, Naksh, Ayush, Shubhankar

TEAM 1 — Kulsoom (Senior Outreach Officer / Team Leader)
  Juniors (7):
    Shreya Bansal        shreyabansal2806@gmail.com     8383014672   Dehradun, Uttarakhand, India
    Prakhar Maheshwari   prakharm385@gmail.com          9981146588
    Hikari Permana Putri hikaripermana@gmail.com        +6282318443511  Kota Bandung, Jawa Barat, Indonesia
    Mehak Bhatia         bhatiamehak091007@gmail.com     8080440426   India
    Abhishek Singh Chauhan chauhanabhishek5881@gmail.com 09336156736  Lucknow, Uttar Pradesh, India
    Nishika              nishikaaggarwal84@gmail.com     8595893323   Delhi, Delhi, India
    Khushboo             khushbooyadav6675@gmail.com     8750074191   Faridabad, Haryana, India
  Team size: 8 (Kulsoom + 7 Juniors)

TEAM 2 — Radhika (Senior Outreach Officer / Team Leader)
  Juniors (6):
    Ananya Sree Pentakota ananyasree1677@gmail.com       9490185801
    Gaurav Thakur         gaurax.3@gmail.com             8219636135
    Neeraj Kumar          neeraj18official@gmail.com     9315281029
    Alvina Sheikh         alvinasheikh.as@gmail.com      8447155785
    Jyoti Tiwari          jt933558@gmail.com             7835879829
    Ananya Tripathi       tripathiananya964@gmail.com    7897477936
  Team size: 7 (Radhika + 6 Juniors)

TOTALS: Company Core 4, Team Leaders 2, Junior Outreach Officers 13 — 19 people
```

Treat this roster as **initial seed data**, not a hardcoded org chart — the
product owner's own framing. A future team, a reassigned Junior, or a
promoted Senior must be ordinary data changes (`OutreachTeam`/
`OutreachTeamMembership` rows), never a code change. Phone numbers carrying
inconsistent formats (leading `0`, `+62` country code, no country code) as
given above — store as free text at seed time; do not silently normalize
without a stated format decision (a `Contact`-shaped field, not a validated
`E.164` column, unless/until asked to build number validation).

Each of these 19 people needs a `Party` + `User` + `Membership` (ADR-001/007
identity stack) before `OutreachTeam`/`OutreachTeamMembership` rows can
reference them — this is provisioning work (`provisionIdentity()`), not new
platform surface.

## Open questions (resolve before building, per CLAUDE.md stop conditions)

1. ~~`OutreachTeam` as capability-private entity vs. `Organization`~~ —
   **RESOLVED 2026-09-12**, see mapping table and Seed data above:
   capability-private `OutreachTeam`, no member-count cap in code.
2. ~~Naming collision with `verity.capability.crm`~~ — **RESOLVED
   2026-09-12**: capability id `verity.capability.outreach`, directory
   `src/server/capabilities/outreach/`. Checked `registry.ts` — every
   shipped capability uses a bare single word with no client prefix
   (`crm`, `hr`, `billing`, `trading`, `dinein`, …); `outreach` follows the
   same convention and does not collide with `crm` (unrelated domain, see
   above) or any other registered id.
3. ~~Tenant/org boundary~~ — **RESOLVED 2026-09-12**: PA-OMS runs under a
   **new tenant**, PlotArmour Studio itself — grepped the repo
   (`taskplans/`, `clients/`, `implementation/`) for any existing
   `plotarmour` tenant record or seed and found none. PlotArmour is a
   distinct company, not a sub-unit of any existing client tenant (Shree
   Ganesh Timber, Colonel Kebabz) — INV-001 tenant isolation is the actual
   boundary here, not an `Organization` used to fake it inside someone
   else's tenant. `outreach` is the capability activated on that new
   tenant, same pattern as any other client onboarding
   (`TenantActivation`/`CapabilityDefinition`, item 10 infrastructure).

</details>

## Non-goals

- Not a platform primitive. If a second unrelated client later needs the
  same "team pod + lead + activity + pipeline" shape, generalize then — not
  now (same caution as Tasks 88-90, 93 for premature generalization).
- Not an extension of the existing `crm` capability — different domain,
  different entity shape, different lifecycle. Do not merge.
- Not HR, payroll, attendance, or general company finance (spec §96's own
  exclusion list, restated as this task's non-goal too).

## Roadmap to delivery — for whoever picks this up next

This section exists so a different developer can continue without
re-deriving scope from the spec. Each phase names exactly what's built vs.
not, what decision (if any) blocks it, and what "done" looks like. Work
phases in order — later phases assume earlier ones exist.

### Phase 0 — Foundation (DONE 2026-09-12)

Schema, migration, `outreach` capability module (12 commands, 8 queries),
registry wiring, seed script, real 19-person tenant live. See Status above.

### Phase 0.5 — Core screens (DONE 2026-09-12)

`/outreach` overview + `/outreach/[id]` detail, wired to real commands,
live-browser-verified (see Status above). This is enough for a Founder or
Senior to create leads, log outreach, and move the pipeline by hand — the
capability is *usable*, not yet *complete*.

### Phase 1 — Fill UI gaps for commands that already exist (DONE 2026-09-13)

Every one of these has a working `CommandDefinition`/`QueryDefinition` in
`src/server/capabilities/outreach/index.ts` today; only the screen is
missing. Straightforward, no open decisions:

- **Reassign owner** button on lead detail (`verity.outreach.reassign_owner`)
  — surface the 14-day-eligibility error from the command as-is; don't
  re-implement the check in the UI.
- **Reactivate lead** flow for a terminal lead (`verity.outreach.reactivate_lead`)
  — needs a small "why relevant" + new-owner form, same shape as
  `NewLeadForm.tsx`.
- **Record advance payment** form on lead detail
  (`verity.outreach.record_advance_payment`) — currently the advance
  received/threshold is read-only display; add an amount + optional
  threshold input, same pattern as `LogActivityForm` in `LeadActions.tsx`.
- **Targets**: a screen to call `setOutreachTarget` and list
  `listOutreachTargets` — company/team/individual × daily/weekly. No design
  decision needed, it's a form + table.
- **Daily check-in**: a screen calling `submitDailyCheckIn`, showing
  `getDailyMetrics` alongside it (auto-computed numbers next to the
  free-text fields — master-context spec §21's own automatic-vs-manual
  split, don't blur it back together in the UI).
- **Weekly report** (individual, `submitWeeklyReport`) and **team weekly
  assessment** (Senior, `submitTeamWeeklyAssessment`) — two screens,
  same shape as the check-in.

**Acceptance**: every registered command in `outreach/index.ts` has at
least one UI surface calling it. Verify each with a real browser pass
(Chrome DevTools MCP, or whatever's available) the same way Phase 0.5 was
verified — don't mark done on typecheck alone.

### Phase 2 — Role-scoped views (DONE 2026-09-13, pragmatic scope — see Status above for what's still a real design gap)

Right now every actor sees the same Company-Core-shaped list. The spec is
explicit that Junior / Senior / Company Core should feel like three
different products (§100):

- **Junior "My Workspace"**: today's targets + progress, my leads, my
  overdue follow-ups, check-in prompt front and center. Spec §17-19.
- **Senior "Team Command"**: team roster with per-member performance
  (spec §15's table), lead-quality review queue (§56), coaching notes,
  escalation to Founders. Spec §13-16.
- **Company Core**: extend what exists with an attention/exceptions center
  (§9 — missing check-ins, overdue follow-ups, stalled opportunities,
  surfaced as exceptions, not a firehose) and Company Direction (§10 — a
  dated text/target record a Founder posts, cascading to team/individual
  targets per §11).

**Before writing code**: load `impeccable` and treat this as new-surface
design work (three distinct information architectures), not a refinement
of the existing `/outreach` page. The existing page can become Company
Core's view with additions; Junior and Senior need their own routes.

**Blocked on nothing** — this is pure product/UX work, no ADR needed. It's
listed after Phase 1 only because Phase 1's forms are prerequisites (you
can't build a Junior "my check-in status" widget before the check-in
screen exists).

### Phase 3 — Per-team permission enforcement (DONE 2026-09-13 — picked option 1 below)

**Known gap, already recorded above**: Senior-role permissions are
Tenant-scoped, same as Founders'. A Senior can read another team's leads
through the query API today (not through normal UI navigation, but the
authorization layer itself doesn't stop it).

Two ways to close it, and this file does not decide between them —
classify as **implementation decision required**, not a platform ADR,
since it doesn't touch the permission model's shape (`Verb+Entity+Scope`
stays intact either way):

1. **Query-level filtering**: every outreach query that takes a `teamId`
   already accepts one — add a check in each query handler (or a shared
   helper) that a Senior's own team membership must match the requested
   `teamId`, looked up via `OutreachTeam.leaderId`. No schema change,
   contained to `outreach/index.ts`. Cheapest, most likely correct answer.
2. **New `own`-adjacent scope primitive**: `taskplans/00_STATUS_INDEX.md`'s
   own "Open" section already flags `own` as an undecided platform scope
   (PLA-AUT-002 doesn't define it). Do NOT invent this here — that's
   `verity-adr-gate` territory if it turns out to be needed for more than
   this one capability. Option 1 above almost certainly avoids needing it.

**Acceptance**: a Senior's `listOutreachLeads`/`listOverdueFollowUps`/etc.
calls, when queried directly (not just via UI), never return another
team's rows.

### Phase 4 — Tests (DONE 2026-09-13 for commands; conformance script still open)

Nothing in this capability has an automated test yet. Everything verified
so far is `tsc`/`eslint`/manual DB queries/one live browser pass — real
verification, but not a regression net.

- Unit tests per command: state-machine legality (only handbook Ch. 22's
  declared transitions succeed), the 3 rejection/threshold guards in
  `advanceLeadStage`, the 14-day reassignment window, the 90-day
  reactivation-credit window, `recordAdvancePayment`'s cumulative-not-
  replacing math.
- One integration test walking the full lifecycle: create lead → log
  activity → advance through several stages → close won (with and without
  the threshold cleared, expecting the second to fail).
- A foundation-conformance script for `outreach`, same shape as Task 85's
  `implementation/13-conformance/` scripts for plywood/accounting.

**Acceptance**: `npm test` (or whatever the test runner is — check
`package.json`) covers the above; do not claim BUILT/PROVEN language in
this file's Status section beyond what tests actually prove, per
`CLAUDE.md`'s reporting vocabulary.

### Phase 5 — Reporting layer (DONE 2026-09-13 for company roll-up + bottleneck; vertical/channel intelligence still deferred)

- Company weekly report roll-up screen, aggregating every team's
  `OutreachTeamWeeklyAssessment` (query already gettable via
  `getTeamWeeklyRollup`, called once per team).
- Funnel conversion / bottleneck view (spec §62-63) — `getFunnelCounts`
  already returns the raw numbers; this is a presentation layer over data
  that exists.
- Vertical + channel intelligence (spec §52-54) — **do this after Phase 4,
  not before**: it's explicitly P1 in this file's own Scope section, and
  needs real usage data to be worth building against.

### Phase 6 — Deferred by design (P2, this file's own Scope section — do last, or only if asked)

Lead quality scoring (§41), duplicate detection (§45), outreach
experiments (§65), AI assistance (§85), email integration (§71-72), a real
compensation view beyond the raw threshold display (§78-79), promotion
support (§91), a dedicated onboarding-flow UI (§92-93 — the 10→3→1→100
assignment can stay a plain form).

## Trigger to start (historical — Phase 0/0.5 already fired and completed)

All three open questions resolved 2026-09-12, product owner confirmed P0
scope the same day, Phase 0 (schema/capability/seed) and Phase 0.5 (core
UI) both shipped and live-verified same day. Kept for the record. The
actual next trigger is whichever phase you're picking up — see the
Roadmap section above.
