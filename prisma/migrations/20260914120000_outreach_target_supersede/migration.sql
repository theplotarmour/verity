-- ---------------------------------------------------------------------------
-- Task 106 Phase 3: OutreachTarget supersession (spec §72-73's audit-trail
-- gap). Additive columns only — existing rows default active=true so
-- nothing already set is silently reclassified as history.
-- ---------------------------------------------------------------------------

ALTER TABLE "outreach_target" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "outreach_target" ADD COLUMN "change_reason" TEXT;
