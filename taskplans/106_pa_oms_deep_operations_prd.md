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

## Status: Phase 1/2 DONE (this file); Phase 3 first slice DONE 2026-09-14 — `OutreachContact` (model, migration, RLS, commands, permissions, UI panel + add-contact form on `/outreach/[id]`, 3 tests, 25/25 suite green). Remaining Phase 3 items (ownership/target audit-trail tables, file-authorization check, health-state derivation) and Phase 4+ not started

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

## Phase 3 — Foundation (build order, this phase first)

1. `OutreachContact` model + migration (additive, RLS + audit trigger per
   existing outreach migration convention — see 105's hand-authored
   migrations for the pattern).
2. `OutreachOwnershipHistory` + `OutreachTargetHistory` — close 105's two
   already-known audit-trail gaps (§19, §73).
3. Extend `assertTeamScopeAllowed`-style checks onto Contact once it exists.
4. File-authorization check (§12 security item above) — confirm or fix
   before Research entries can reference `StoredFile`.
5. Health-state derivation function for `OutreachLead` (§21: HOT/STALE/
   AT_RISK/HEALTHY/CLOSED) — pure query-layer, no new column beyond maybe
   a cached `lastActivityAt` if not already derivable.

**Acceptance**: `npx prisma migrate status` clean, `npx tsc --noEmit -p .`
clean, existing 105 test suite (`capability-outreach.test.ts`) still green,
plus new tests for Contact team-scoping (mirrors 105 Phase 3/4's lead
tests).

## Phase 4 — Prospect operations

- `OutreachContact` CRUD + UI (profile card on `/outreach/[id]`, per §24-25).
- `OutreachResearchEntry` CRUD + timeline UI (§26-29) — write note, add URL,
  upload file (reuses `StoredFile`), chronological render.
- Duplicate detection on prospect creation (§45-46, §96, §49) — normalized
  name/domain/LinkedIn match; confidentiality-preserving message for
  cross-owner hits ("an existing record may already exist... ask your
  Team Leader") per §8.
- Next-action + health-state fields surfaced on lead header.

**Acceptance**: §131's Junior-day acceptance test items covering research/
contact/duplicate — live-browser-verified same discipline as 105.

## Phase 5 — Daily execution

- `OutreachTask` model + CRUD, origin field (TEAM_LEADER_ASSIGNED /
  SELF_CREATED / SYSTEM_GENERATED per §54).
- `OutreachMeeting` model + CRUD (§62).
- Daily report rework: `OutreachCheckIn` gains the 7-question structure
  (§67), a status chain (§68), and drillable auto-metric counts (§65).
  This closes 105's own recorded gap #5.
- Junior "My Day" (§46) and nav additions (§47) — extends 105's existing
  `/outreach/workspace`, does not replace it.
- Follow-up queue bucketing (§61) — query-shape change over existing data.

**Acceptance**: §134's reporting acceptance test (create N records, confirm
daily report auto-counts match, every count drillable to source rows).

## Phase 6 — Team Leader operations

- Per-member target distribution + audit UI over `OutreachTargetHistory`
  (105 gap #3).
- Lead review queues (§78: New/Needs Qualification/Needs Research/etc.) —
  query-layer filters over existing `OutreachLead` state.
- Coaching notes — Junior-visible vs Leader-private split (§79); reuse
  `OutreachActivity`-adjacent pattern or a small new `OutreachCoachingNote`
  table if a clean split can't be modeled as an activity subtype.
- Weekly Team Report depth (§80-81) over existing rollup query.

**Acceptance**: §132's Team-Leader-day acceptance test.

## Phase 7 — Company Core operations

- Company Pulse + Team Comparison depth (§84-85) — extends 105's existing
  `getTeamComparison`.
- Intelligence page (§90) — funnel/conversion/bottleneck views, extends
  105 Phase 5's `detectBottleneck()`.
- Company Direction field extension (priority industries, geographic
  focus, target profile — §91).

**Acceptance**: §133's Core-day acceptance test.

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
