-- Adds an optional co-leader to OutreachTeam (roster change 2026-09-14:
-- Alvina co-leads Team 1 with Kulsoom, Bhuvi leads Team 2 with Radhika as
-- co-lead). Authorized identically to leader_id everywhere it's checked
-- (see assertTeamScopeAllowed, team/page.tsx, reports/page.tsx).
ALTER TABLE "outreach_team" ADD COLUMN "co_leader_id" UUID;
