# Task 109 — PA-OMS Outreach: Phases F/G/H (domain intelligence, frontend UX, notifications)

Authority: `taskplans/105_pa_oms_outreach_capability.md` (capability origin) and
`taskplans/106_pa_oms_deep_operations_prd.md` (Phases 1-8, the "master prompt"
this continues under the same Phase A-Z lettering the product owner used when
briefing the full outreach master prompt). Phases A-E of that lettering are
BUILT — this file picks up at F.

## Status: BUILT 2026-09-17 — F, G, H complete except one deliberately-skipped item

F, G, and H are all implemented (see each section below for exact
files/queries/commands). The one exception: Phase H's "Core: unusual pipeline
movement" trigger was explicitly skipped — no threshold definition exists and
the product owner declined to invent one on 2026-09-17. Every other listed
trigger, query, and page is built. `npx tsc --noEmit` and `eslint` clean on
every file touched; 147 pure tests pass. Live DB integration/E2E proof is not
available on this host (no local PostgreSQL) — same pre-existing limitation
as the rest of this repo's DB-touching tests, not new to this work.

## Phases A-E (context, already done — not this file's scope)

Built and migrated live against the real PA-OMS tenant (`1e1785d9-5afa-4288-
85cc-c056f5cae2c5`) in the session that also wrote this taskplan:

- **A** — domain taxonomy: `OutreachDomainGroup`/`OutreachDomain`
  (`prisma/migrations/20260917100000_outreach_domain_taxonomy`), 9 groups /
  ~140 domains seeded, `OutreachLead.domainId` added, `getVerticalIntelligence`
  rekeyed off `Domain.name` with fallback to legacy free-text `industry`.
- **B** — `OutreachAttributionRecord`, append-only
  (`20260917110000_outreach_attribution`), wired into
  `createOutreachLead`/`reassignOpportunityOwner`/`advanceLeadStage`/
  `reactivateLead`.
- **C** — `OutreachEscalation` entity, OPEN/IN REVIEW/RESOLVED
  (`20260917120000_outreach_escalation_entity`), additive alongside the
  pre-existing `OutreachLead.escalated*` fields.
- **D** — `OutreachOpportunity`/`OutreachProposal`/`OutreachClosedClient`
  (`20260917130000_outreach_opportunity_pipeline`), materialized from
  `advanceLeadStage`'s existing stage transitions, backfilled for pre-existing
  leads.
- **E** — `OutreachAssignment` (`20260917140000_outreach_assignment`),
  commands + `listTeamAssignments` query.

All in `src/server/capabilities/outreach/index.ts`. `npx tsc --noEmit` and
`eslint` clean on every file touched. No frontend for any of A-E yet except
Phase A's rekeyed vertical intelligence, which the existing `/outreach/
intelligence` page already renders (it called `getVerticalIntelligence` before
Phase A too — the rekey was transparent to that page).

## Phase F — Domain intelligence workspace

**BUILT 2026-09-17.** Master prompt §42-50: a genuine domain intelligence
workspace, not "domain as a table filter." `getDomainFunnel`/`getDomainVelocity`/
`getDomainAging` + `domainId` filter on `getTeamComparison`/`getChannelIntelligence`
in `src/server/capabilities/outreach/index.ts`; `/outreach/domains` (list) and
`/outreach/domains/[domainId]` (detail) pages.

Scope:
- `getDomainFunnel(domainId, window)` — stage reach + stage-to-stage
  conversion for leads in one domain, same shape as the existing
  `getConversionFunnel` but filtered by `domainId` instead of company-wide.
- `getDomainVelocity(domainId)` — average/median days between the
  checkpoints Phase D actually materializes: `OutreachLead.createdAt` →
  `OutreachOpportunity.createdAt` → `OutreachProposal.sentAt` →
  `OutreachClosedClient.closedAt`. **Known gap, state it in the UI, don't
  paper over it**: this is coarser than the master prompt's ideal
  Prospect→Contact→Response→Meeting→Proposal→Close breakdown, because only
  Phase D's three checkpoints are materialized as timestamped facts today —
  earlier stage transitions live only in `OutreachLead.state` + the generic
  audit trail, not as their own timestamped rows.
- `getDomainAging(domainId?)` — open leads bucketed >7d/>14d/>30d since
  `lastActivityAt`, reusing `deriveLeadHealth`'s staleness threshold.
- Domain × Track, Domain × Team, Domain × Channel matrices — derivable by
  adding a `domainId` filter to the existing `getTeamComparison` /
  `getChannelIntelligence` query shapes rather than new primitives.
- `/outreach/domains` page (Core-only, gate on `ENTITY_DOMAIN` + a
  Create-on-`ENTITY_DIRECTION`-style structural Core signal): domain list
  (reuse `listDomainTaxonomy` + `getVerticalIntelligence`), click-through to
  a per-domain detail view combining the four query types above. Every
  number links to its underlying records (§78 rule) — no fake/static number.
- Sample-size visibility (§55): every rate shown with its denominator,
  reuse the existing `thinSample`/`THIN_SAMPLE_BELOW` pattern from
  `getVerticalIntelligence`.
- Nav entry under Core's tab set (`registerContribution` in
  `outreach/index.ts`, next to the existing Intelligence entry).

Non-goal: Experiments (§51) and Domain Learnings (§52) — explicitly deferred
per the product owner's 2026-09-17 scope call, not part of this phase.

## Phase G — Frontend UX

**BUILT 2026-09-17.** `/outreach/board` Kanban board (`KanbanBoard.tsx`, native
HTML5 DnD over `advance_stage`); global Cmd/Ctrl+K command palette
(`components/shell/CommandPalette.tsx` + `commandPaletteSearch` query); file
shelf grid (`[id]/FileShelf.tsx`) on the lead detail page.

Scope, in priority order (master prompt §72-74):
1. **Kanban pipeline board** — drag-and-drop stage movement calling the
   existing `advanceLeadStage` command (no new backend). Native HTML5 DnD
   (`draggable` + `onDragOver`/`onDrop`), not a new dependency. Columns:
   the 13 linear stages (Research→Closed) plus a separate Lost/Not-a-Fit
   bucket per §21. Every movement already creates activity history via
   `advanceLeadStage`'s own `recordActivity` call — no new audit work
   needed here.
2. **Command palette** (Cmd/Ctrl+K) — global search over company name /
   decision-maker / domain / track / intern / team, added to `ShellChrome`.
   Needs a new lightweight search query (or reuse `listOutreachLeads` +
   `listAvailableParties` client-filtered for a first pass — a dedicated
   full-text query is a fine upgrade later, not required to ship v1).
3. **File shelf polish** — grid/preview view over existing uploaded research
   files; upload plumbing (`files.ts` two-phase upload) already exists and
   is capability-agnostic, this is UI-only.

Impeccable (Operate mode) governs all of it — load before writing, per this
project's own frontend rule. Craft-floor checks (states, keyboard, contrast,
empty states) apply same as any other UI work in this repo.

## Phase H — Notifications

**BUILT 2026-09-17, except "unusual pipeline movement" (skipped — no
threshold defined, product owner declined to invent one).** All using the
existing `notify()`
(`src/server/platform/notification.ts`) — no new platform primitive needed,
it already existed and was simply unused by this capability:

- `verity.outreach.escalation_raised` — fires in `flagForEscalation`,
  recipients are the lead's own team's leader + co-leader (structural, not a
  role-name check — same pattern `assertTeamScopeAllowed` already uses).
- `verity.outreach.escalation_resolved` — fires in `resolveEscalation`,
  recipient is whoever raised the escalation(s) being resolved.

Remaining, from master prompt §68 (all straightforward `notify()` calls in
the relevant existing command, same shape as the two above — no new
infrastructure, just triage which command needs which trigger):

- Intern: follow-up due, meeting approaching, assignment made (Phase E),
  leader feedback on a check-in (`reviewCheckIn`), daily log reminder
  (needs a scheduled trigger, not just an on-write one — check whether the
  existing scheduler (ADR-015/016) is the right home for this or whether
  it's out of scope for a v1).
- Leader: missing daily log (also scheduler-shaped), overdue follow-up,
  stalled prospect, weekly report due (scheduler-shaped).
- Core: weekly report submitted (`submitWeeklyReport`), unusual pipeline
  movement (needs a definition of "unusual" before it can be built — flag
  as an open decision, don't invent a threshold unasked).

## Non-goals (explicit, per 2026-09-17 product-owner scope call)

- Compensation calculation — permanently excluded, not deferred.
- Role progression / promotion tooling (Intern→Junior/Senior) — permanently
  excluded, not deferred.
- Experiments (§51) and Domain Learnings (§52) — deferred, not this phase.

## Follow-up

`taskplans/114_pa_oms_outreach_execution_layer_redesign.md` (2026-09-17) is an
external UX review of this capability done after F/G/H shipped — it does not
change anything in this file, but addresses workflow/execution gaps (no work
queue, too many equal-weight record actions, dashboard is report-first not
action-first) found once the domain intelligence and frontend UX here were in
production.

## Open decisions for whoever picks this up

- Domain velocity's coarser-than-ideal checkpoint set (see Phase F) — ship
  as-is with the gap stated in the UI, or first add timestamped per-stage
  transition rows (a bigger schema change) before building velocity at all?
- Scheduler-shaped notification triggers (missing daily log, weekly report
  due) — same scheduler as ADR-015/016's cron binding, or a separate
  mechanism? Needs an implementation decision, not a re-litigation of
  ADR-015/016 itself.
- "Unusual pipeline movement" (Core notification) — no definition exists yet;
  do not invent a threshold without asking.
