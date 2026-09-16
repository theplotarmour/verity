CREATE TABLE "scheduler_lease" (
  "cadence" TEXT PRIMARY KEY,
  "owner_token" UUID NOT NULL,
  "locked_until" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "scheduler_run" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cadence" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "correlation_id" UUID NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finished_at" TIMESTAMPTZ,
  "duration_ms" INTEGER,
  "next_run_at" TIMESTAMPTZ NOT NULL,
  "tenant_count" INTEGER,
  "work_count" INTEGER,
  "details" JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX "scheduler_run_cadence_started_at_idx"
  ON "scheduler_run"("cadence", "started_at");
CREATE INDEX "scheduler_run_cadence_status_finished_at_idx"
  ON "scheduler_run"("cadence", "status", "finished_at");

CREATE TABLE "deployment_state" (
  "key" TEXT PRIMARY KEY,
  "status" TEXT NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "deployment_state" ("key", "status") VALUES ('restore', 'normal');

REVOKE ALL ON TABLE "scheduler_lease", "scheduler_run", "deployment_state" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "scheduler_lease", "scheduler_run" TO verity_app;
GRANT SELECT ON TABLE "deployment_state" TO verity_app;
