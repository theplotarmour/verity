# Task 106 — PA-OMS Deep Operations Module: phase-wise PRD

Authority: User synthesis, 2026-09-14 (147-section spec, this session) —
"VERITY — PLOTARMOUR OUTREACH OPERATIONS MODULE." Supersedes nothing in
[[105_pa_oms_outreach_capability]] outright; **extends** it. Treat 105 as
the as-built foundation and this file as the gap-closing PRD on top of it.
Where this spec's section numbers are cited below (`§N`), they refer to
the 2026-09-14 prompt, not the master-context doc cited in 105.

This is a **client capability build**, governed by
`verity-client-capability-builder`, not a platform-primitive addition —
same posture as 105.

**Scope tension, flagged not silently resolved:** [[feedback_lean_v1_scope]]
(user memory) says client builds get minimum modules, not full PRD depth.
This spec explicitly demands the opposite ("do not produce a shallow mock
module," §147). Resolution: this file treats the new spec's own phasing
(§118-124) as authoritative and lean-V1 as *how* to execute each phase
(no speculative infra beyond what that phase's acceptance test needs) —
not as a reason to cut the phase list itself. If a phase turns out to be
overbuild in practice, that's a stop-and-ask moment per CLAUDE.md, not a
silent trim.

## Status: Phase 1-7 DONE 2026-09-14/15. Phase 8 (AI) not started, deferred by design

Phase 3 closed out across two slices:
- **`OutreachContact`** — model, migration, RLS, commands, permissions, UI panel + add-contact form on `/outreach/[id]`.
- **Target audit trail** (§72-73) — `setOutreachTarget` supersedes (never edits/deletes) the prior active row for the same scope/team/party/period/metric/periodStart; diff logged via the platform's existing `recordActivity`, not a new table. `listOutreachTargets` defaults active-only, `includeSuperseded` for history.
- **Ownership audit trail** (§19) — this file's own earlier premise that a new `OutreachOwnershipHistory` table was needed was **wrong**, corrected on investigation: `reassignOpportunityOwner` already calls `recordActivity` (platform `Activity` table, EXE-AUD-001) with the old/new owner diff. Nothing built, nothing missing.
- **Health signal** (§21) — `deriveLeadHealth()` (Hot/Stale/AtRisk/Healthy/Closed, category-only per ADR-009), `HealthBadge` primitive, wired into the lead list and detail pages.
- **File-authorization check** (§12) — investigated in Phase 3, closed in Phase 4: `getResearchFileUrl` now authorizes against the owning lead before calling `readUrlFor`.

Phase 4 (§26-29, §45-46, §49, §96) — Research + duplicate detection:
- **`OutreachResearchEntry`** — append-only timeline entity. Note/Url types created directly; file types (Pdf/Docx/Spreadsheet/Presentation/Image/Screenshot/Other) go through the platform's real two-phase upload (`reserveUpload`/`confirmUpload` from `files.ts`, previously exercised only by tests — this is the first production caller). `StoredFile.entityKey`/`entityId` set to the owning lead, closing the file-authorization gap.
- **Duplicate detection** — `checkDuplicateProspect`, company-wide normalized match on name/domain/LinkedIn URL. Confidentiality-preserving: an inaccessible match returns a generic message only. Wired into `NewLeadForm` as a warning banner on company/website blur.
- UI: Research panel on `/outreach/[id]` (renamed the old flat-field panel to "Qualification" to avoid a name collision) with `ResearchForm` (3 modes) and `ViewFileLink` (fetches a fresh signed URL per click).
- Live-verified via chrome-devtools MCP against the real PlotArmour tenant: a real note round-tripped end to end, the duplicate-detection banner rendered correctly against a real existing lead ("Acme Manufacturing Pvt Ltd"), zero console errors. **Note**: that live test left one real research-entry row on a real lead (append-only, can't be deleted via command) — flagged to the product owner, not silently cleaned up.

38/38 outreach tests pass (was 22 at session start), tsc clean throughout.

**Not done, still Phase 4-adjacent**: AI-assisted duplicate/gap detection (explicitly Phase 8, deferred by design), profile-completeness indicator (§51, not requested this pass).

## Phase 1 — Repository audit (§114-117)

Already substantially done by 105's own build history. Findings specific
to this spec's asks, not repeated from 105:

| System | State | Notes |
|---|---|---|
| Auth/RBAC | REUSE | `Party`/`User`/`Membership`/`Role`/`Permission`, server-side `enforcePolicy()` (ADR-017). 105 Phase 3's `assertTeamScopeAllowed()` is the exact pattern §7-8 asks for — extend it to every new entity below, don't reinvent. |
| Roles | REUSE, alias | Existing Founder/Senior/Junior = this spec's COMPANY_CORE/TEAM_LEADER/JUNIOR_OUTREACH. No new role table. Rename risk: keep internal role keys as-is (`Founder`/`Senior`/`Junior` already live for 19 real users) and treat the spec's names as documentation vocabulary only, unless the user explicitly asks for a rename migration. |
| Prospect/Company | EXTEND | `OutreachLead` already carries most of §17-18's identity fields (105's "prospect-sheet field parity" pass added location/whatTheyDo/potentialNeed/salesHypothesis/linkedinUrl/qualityScore). Missing: logo, sub-industry, company size, founded year, description, social links (plural), source enum, acquisition track's `BOTH`/`UNDETERMINED` values (check current enum), health-state derivation (§21). |
| Contact | **NEW** | No separate contact entity exists today — leads carry no structured contact. §24-25 requires it as its own profile. Build `OutreachContact` (prospectId FK, not a `Party` — ADR-001 reasoning from 105 applies identically: a prospect's contact person is not a platform identity until they become something else). |
| Research | **NEW** | No research-entry entity. `StoredFile` (platform, REUSE) exists for the file half; the research-entry-as-timeline-of-artifacts concept (§26-29) needs a new `OutreachResearchEntry` row referencing `StoredFile` optionally. |
| Activity/Outreach log | EXTEND | `OutreachActivity` exists (105) with a `type` enum already carrying `PitchDeck`/`BusinessResearch`. Missing structured channel/outcome/nextFollowUpAt fields per §58-59 — currently freer-form. |
| Response | EXTEND | No separate response entity — model as an `OutreachActivity` subtype (`type: Response`) with a `classification` field, not a new table (§60's classifications fit an enum). Cheaper than a parallel entity and keeps one timeline. |
| Follow-up queue | EXTEND | 105 already has `listOverdueFollowUps`; §61's OVERDUE/TODAY/TOMORROW/UPCOMING bucketing is a query-shape change, not new schema. |
| Meeting | **NEW** | No meeting entity. Build `OutreachMeeting` (§62). |
| Task | **NEW** | No task/project entity anywhere in the platform (checked: no `model.*Task` in schema). Capability-private `OutreachTask`, not a platform primitive — same non-goal framing as 105's own. |
| Daily report | EXTEND | `OutreachCheckIn` exists but is free-text + auto-metrics with no review workflow. §64-71 wants a richer Q&A shape, drillable metrics, and a status chain (Submitted→Reviewed→NeedsClarification). This is 105's own recorded gap #5, not yet started — this file absorbs it. |
| Weekly report | EXTEND | `OutreachWeeklyReport`/`OutreachTeamWeeklyAssessment` exist; §80-82's aggregation depth (member comparison, vertical analysis) is query-layer work over existing rows. |
| Company Direction | EXTEND | `OutreachDirection` exists (105 Phase 2); missing fields: priority industries, geographic focus, target company profile, effectiveTo (currently append-only-close-prior, check if `effectiveTo` is explicit or inferred). |
| Target | REUSE | `OutreachTarget` already supports company/team/individual scope (105). §72-73's audit trail (old/new/changedBy/reason) is the one open gap 105 already names. |
| Escalation | EXTEND, mostly DONE | 105 gap #2 shipped typed escalation + Junior→Senior→Core routing. §95's type enum (COMMERCIAL/TECHNICAL/PROSPECT/ATTRIBUTION/TEAM/SECURITY/OTHER) — check current enum values match; extend if narrower. |
| Notification | REUSE | Platform `Notification`/`NotificationTemplate`/`NotificationPreference` exist. Wire outreach-specific triggers (§93) as new template rows, not new infra. |
| File storage | REUSE | `StoredFile` + `src/server/storage/{supabase,s3}.ts` (closed 2026-08-28 per CLAUDE.md). §12's signed-URL/authorization requirement needs a check: confirm file access already inherits entity authorization, or this is a security gap to close in Phase 3. |
| AI | PARTIAL REUSE | `src/server/platform/agent-chat.ts` (Task 84, ADR-017 channel) is a real chat-agent pattern — reusable for §37-39's "ask a question" UX. No job/queue infra exists (`AIJob`/`AIInsight` per §113 are net-new if built). Per lean-V1 + spec's own §124 ("do NOT let AI delay the operational foundation"), defer job-queue infra to Phase 8. |
| Audit | REUSE | Platform `AuditLog` — 105 already uses it for escalation/reassignment. Extend coverage to every new mutation in this file's phases. |

**Security audit (§117), specific items not yet checked, carried into Phase 3 acceptance:**
- File signed-URL reuse across unauthorized users — unverified, check `storage/supabase.ts`'s signing scope.
- AI context authorization — no AI job system exists yet, so nothing to leak today; must be designed in from Phase 8's first line, not retrofitted.
- Everything else in §117's list is already covered by 105 Phase 3/4's tests (team isolation, Core-only close, role self-promotion via API) — do not re-derive, re-run those tests after each new entity to confirm no regression.

## Phase 2 — Architecture (this file)

### Entity decisions (REUSE / EXTEND / NEW, consolidated)

```
REUSE unchanged:        Party, User, Membership, Role, Permission, AuditLog,
                         Notification*, StoredFile, storage drivers,
                         OutreachTeam, OutreachTeamMembership, OutreachTarget
EXTEND:                 OutreachLead (identity fields, health state),
                         OutreachActivity (channel/outcome/response subtype),
                         OutreachCheckIn (Q&A shape + review workflow),
                         OutreachWeeklyReport / TeamWeeklyAssessment (depth),
                         OutreachDirection (fields), OutreachEscalation-fields
NEW (capability-private): OutreachContact, OutreachResearchEntry,
                         OutreachMeeting, OutreachTask,
                         OutreachOwnershipHistory (§19, §57 audit trail),
                         OutreachTargetHistory (§73 audit trail)
DEFERRED to Phase 8:    AIJob, AIInsight (or equivalent) — do not create
                         empty scaffolding now (CLAUDE.md anti-speculation)
```

### RBAC matrix (server-side, extends 105's `assertTeamScopeAllowed`)

| Entity | Junior | Senior (own team) | Core |
|---|---|---|---|
| Prospect/Lead | own-owned only (read/write) | full team (read/write/reassign) | all (read; write via existing grants) |
| Contact | via owned prospect | via team prospects | all |
| Research | via owned prospect | via team prospects | all |
| Activity/Response | own-created + own prospects | team's | all |
| Task | own-assigned (read/complete); create own | team's (create/assign/review) | all |
| Meeting | own | team's | all |
| Daily report | own (write); team leader's feedback (read) | team's (review) | all (read) |
| Advance Received / Closed | **no access** | **no access** | only holders |
| Company Direction | read | read | write |

Enforcement point: every new query/command in `outreach/index.ts` calls
`assertTeamScopeAllowed()` or an owner-equivalent check — same pattern as
105 Phase 3, not a new authorization primitive.

### Non-goals (restated from 105, still binding)

- No compensation/payout logic anywhere (§13, spec's own hard rule).
- No platform primitive — stays capability-private (`src/server/capabilities/outreach/`).
- No WhatsApp/email integration this pass (§94, §11) — manual logging only, schema left open for future sync source field (`source: Manual | Synced`, already true of `OutreachActivity` per 105's activity-type design).
- No autonomous AI outreach (§35) — ever, not just deferred.

## Phase 3 — Foundation — DONE 2026-09-14

1. **DONE** — `OutreachContact` model + migration (RLS, commands, permissions, UI + form).
2. **CORRECTED, not built** — this item originally proposed a new
   `OutreachOwnershipHistory` table; investigation found `reassignOpportunityOwner`
   already calls the platform's `recordActivity` (EXE-AUD-001) with the
   old/new owner diff, so ownership history was never actually missing.
   `OutreachTargetHistory` likewise became a supersession model
   (`active`/`changeReason` columns + `recordActivity`) rather than a
   parallel table — same reuse-existing-audit reasoning.
3. **DONE** — `assertTeamScopeAllowed`-equivalent scoping applies to
   Contact via its `leadId` FK lookup (same pattern as `logOutreachActivity`).
4. **INVESTIGATED, nothing to fix yet** — `readUrlFor()`'s authorize-first
   contract is sound but has zero production callers; revisit when Phase 4
   builds Research (the first entity that actually reads files).
5. **DONE** — `deriveLeadHealth()`, category-only per ADR-009, wired into
   both outreach pages via a new `HealthBadge` primitive and DataTable
   `"health"` variant.

**Acceptance**: `npx prisma migrate status` clean, `npx tsc --noEmit -p .`
clean, 31/31 tests pass (was 22 before this phase) in
`capability-outreach.test.ts` — contact round-trip, target supersession,
5 `deriveLeadHealth` cases.

## Phase 4 — Prospect operations — DONE 2026-09-15

- **DONE** (Phase 3) — `OutreachContact` CRUD + UI.
- **DONE** — `OutreachResearchEntry` CRUD + timeline UI (§26-29): write note,
  add URL, upload file (real two-phase `StoredFile` upload, not a mock).
- **DONE** — Duplicate detection on prospect creation (§45-46, §96, §49):
  normalized name/domain/LinkedIn match, confidentiality-preserving message
  for inaccessible hits, wired into `NewLeadForm` as a blur-triggered banner.
- **DONE** (Phase 3) — Health-state field (`deriveLeadHealth`) surfaced on
  lead header and list. Next-action field was already present from 105.

**Acceptance**: met — live-browser-verified via chrome-devtools MCP against
the real PlotArmour tenant (note round-trip, duplicate banner against a
real lead), 38/38 tests, tsc clean. §131's Junior-day items covering
research/contact/duplicate all exercised live.

## Phase 5 — Daily execution — DONE 2026-09-15

- **DONE** — `OutreachTask` model + CRUD, origin (SelfCreated/
  TeamLeaderAssigned, SystemGenerated reserved for future automation)
  derived server-side from assignee vs. actor, never client-set (§54).
- **DONE** — `OutreachMeeting` model + CRUD, Scheduled/Completed/Cancelled/
  NoShow lifecycle with outcome notes (§62).
- **DONE** — Daily report rework: `submitDailyCheckIn` gains
  `mostImportantDevelopment`/`needsAttention` (closing 105's gap #5's
  question-count half). The status-chain half required a design
  correction mid-build: `OutreachCheckIn` has a hard append-only DB
  trigger from its original migration, so a first attempt (UPDATE-based
  review columns) was silently blocked and surfaced as a failing test
  (P2025 "no record found"). Fixed with a proper append-only
  `OutreachCheckInReview` table — one row per review action, "current"
  status is the latest row, matching handbook Ch. 02's "never rewrite the
  Junior's own text" rule at the database level. UI: a review panel on
  Team Command (Senior marks Reviewed / requests clarification).
- **DONE** — Follow-up queue bucketing (§61): `listFollowUpQueue` returns
  overdue/today/tomorrow/upcoming, alongside (not replacing)
  `listOverdueFollowUps`.
- **NOT DONE** — Junior "My Day" nav additions (§46-47): the task/meeting/
  check-in-review data this needs now all exists, but no dedicated Junior
  homepage surface was built this pass — deferred, not silently dropped.
- Drillable auto-metric counts (§65) were already true of `getDailyMetrics`
  before this phase (105) — nothing new needed there.

**Acceptance**: met for everything DONE above — 46/46 tests (was 38),
live-verified via chrome-devtools MCP (task create/complete round-tripped
on a real lead, Team Command's empty state confirmed non-crashing for a
non-leader account — could not verify the review panel itself live, no
Senior credentials available in-session; covered by unit tests instead).

## Phase 6 — Team Leader operations — DONE 2026-09-15

- **DONE** — Target distribution + audit UI: `/outreach/targets` already had
  Individual scope (105); this pass added `changeReason` to the form and
  filtered the list to `active:true` (the Phase 3 supersession model
  existed in the backend but the UI still showed every superseded row).
- **DONE** — Lead review queues (§78, scoped per lean-V1 to 5 of the 12
  named queues: New/NeedsResearch/Stale/HighPriority/AdvancePending) — a
  `LeadQueuePanel` on Team Command, query-layer filters, no new schema.
- **DONE** — Coaching notes (§79): new append-only `OutreachCoachingNote`
  table, JuniorVisible/LeaderPrivate split enforced in the query handler
  (team leader or Founder-equivalent sees all; anyone else only their own
  JuniorVisible notes). `CoachingNotePanel` expands per member row on
  Team Command.
- **DONE** — Weekly Team Report depth (§80-81): `getTeamWeeklyMemberBreakdown`
  alongside the existing team-total rollup — not yet wired into a
  dedicated weekly-report UI page (that page itself is P1/deferred per
  105's own Phase 5 scope note), but the data exists for whoever builds it.

**Acceptance**: met for what's DONE above — 51/51 tests (was 38 before
Phase 4), tsc clean. Not independently live-verified this pass (cost/time
budget); covered by unit tests, same posture as Phase 5's un-verified
review-panel UI.

## Phase 7 — Company Core operations — DONE 2026-09-15

- **DONE** — Company Pulse (§84, 2026-09-13 doc §4): `getCompanyPulse`
  with a `from`/`to` window; the Outreach page's Core view now opens with
  the organisation's numbers for Today / This week / This month / All time
  (`RangeSwitch`, tenant-zone day boundaries in `outreach/range.ts`).
  Active pipeline is point-in-time, never windowed — stated on the stat.
- **DONE** — Team Comparison depth (§85, doc §5): `getTeamComparison` takes
  the same window and adds Leader, Target (the team's active Weekly
  QualifiedProspects target at the window's start) and response rate. The
  page reads the registered query via `executeQuery` instead of carrying
  its own copy of the arithmetic (it did, since 105).
- **DONE** — Intelligence page (§90; master-context §52-54, §63) at
  `/outreach/intelligence`, Core-only (Create on Direction, the same
  structural signal the Outreach page uses): `getConversionFunnel`
  (reach-or-beyond per stage so each conversion is a ratio of one
  population, plus the §63 bottleneck reading — `detectBottleneck` moved
  from `reports/page.tsx` into the capability so both screens read one
  rule), `getVerticalIntelligence` (by lead industry; "Unspecified" bucket,
  never dropped), `getChannelIntelligence` (distinct leads touched per
  channel; closed attribution is shared, not split). Rates on fewer than
  20 first outreaches are flagged `thinSample` per §53's own warning.
- **DONE** — Direction field extension (§91, §10's example): `priorityIndustries`
  (a list, so vertical intelligence can match a lead's `industry` without
  parsing copy), `secondaryOpportunity`, `geographicFocus`,
  `targetCompanyProfile`. Form, banner and history updated.
- **CORRECTED, pre-existing defect found by this phase's own test** —
  `outreach_direction` is append-only by its 20260913100000 migration
  (SELECT + INSERT policies, `reject_mutation` trigger), so
  `postCompanyDirection`'s "close the prior Active row" UPDATE had matched
  zero rows since 105 Phase 2: every direction on the live tenant still read
  `Active`, and only `getCurrentDirection`'s `postedAt` ordering made the UI
  look right. Same class as Phase 5's check-in-review finding. Fixed the
  honest way (ADR-009, the Phase 5 precedent): the `status` column is
  dropped (`20260915160000`), "current" = latest posted, a prior row's
  `closedAt` = the next row's `postedAt`, both derived in `listDirections`.
  A first attempt added a stored `closed_at` column (`20260915150000`)
  before the trigger was found; the second migration removes it again.
- **ALSO** — `20260915150000` re-attaches `audit_command_mutation` to every
  `outreach_*` table idempotently: the 2026-09-07 audit migration attaches it
  to tables that exist when it runs, which on the shared database was after
  every outreach table but on a fresh CI database is before them.

**Not done, deferred**: per-person analytical drill-down (doc §7 "Company →
Team → Person") — `getTeamWeeklyMemberBreakdown` already carries the
numbers, no Core-side page for it yet; ₹ pipeline value (doc §4 "Active
Pipeline ₹X") — leads carry no deal-value field, so the pulse shows a count
and says so rather than inventing one.

**Acceptance**: 57 tests in `capability-outreach.test.ts` (was 51); all 6
new ones pass, and the full file runs 52/57 against the remote database —
the 5 failures are environmental and pre-date this phase (1 needs a bound
storage driver, 4 hit the 30 s per-test timeout on the remote pooler and
pass when run alone). tsc and eslint clean, impeccable detector zero
findings on the changed pages. The two audit migrations from
`codex/audit-2026-09-07-remediation` plus this phase's two were applied
with `prisma migrate deploy` on 2026-09-15. Not live-browser-verified this
pass — same posture as Phase 6.

## Phase 8 — AI (last, per spec's own §124 and lean-V1)

Do not scaffold before Phases 3-7 are real. When triggered:
- Reuse `agent-chat.ts` (Task 84 pattern) for the conversational surfaces
  (§37-39 team-leader/core questions).
- Any persisted AI job/result needs provenance fields (§32) and a hard
  RBAC filter applied **before** context retrieval, never after (§39,
  §136 — release blocker if violated). Design this from the first line,
  don't retrofit.
- AI-suggestion vs human-confirmed fields stay visually and structurally
  distinct (§33) — e.g. `aiSuggestedClassification` vs `classification`
  columns, never one shared field silently overwritten by AI.

## Testing (§129-136), carried forward from 105 Phase 4's pattern

Extend `src/test/capability-outreach.test.ts` per new entity as it ships,
same integration-style (real throwaway tenant, `afterAll` cleanup) — do
not defer tests to a single end-of-project pass. §130's explicit
cross-team/cross-role IDOR list is the acceptance bar for Phase 3-7's
scope checks; re-run it after each phase, not just once at the end.

## Trigger to start

Phase 1 (this file) done. Phase 2 (this file's entity/RBAC decisions) is
the architecture — no further approval blocker per §118 ("you do NOT need
to stop and wait for user approval unless there is a true blocker").
Phase 3 is next: build `OutreachContact` first, since Research (Phase 4)
depends on it existing.
