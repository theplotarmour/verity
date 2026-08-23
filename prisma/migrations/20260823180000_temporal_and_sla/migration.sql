-- CreateEnum
CREATE TYPE "SlaClockStatus" AS ENUM ('NotStarted', 'Running', 'Paused', 'Breached', 'Stopped');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "time_zone" TEXT;

-- AlterTable
ALTER TABLE "tenant" ADD COLUMN     "time_zone" TEXT;

-- CreateTable
CREATE TABLE "business_calendar" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "business_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hours" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "calendar_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_holiday" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "calendar_id" UUID NOT NULL,
    "local_date" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "business_holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policy" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_minutes" INTEGER NOT NULL,
    "calendar_id" UUID,
    "precedence" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sla_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_clock" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "entity_key" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "status" "SlaClockStatus" NOT NULL DEFAULT 'NotStarted',
    "elapsed_minutes" INTEGER NOT NULL DEFAULT 0,
    "running_since" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3),
    "override_deadline_at" TIMESTAMP(3),
    "breached_at" TIMESTAMP(3),
    "stopped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sla_clock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_calendar_tenant_id_idx" ON "business_calendar"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_calendar_tenant_id_name_key" ON "business_calendar"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "business_calendar_tenant_id_id_key" ON "business_calendar"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "business_hours_tenant_id_calendar_id_weekday_idx" ON "business_hours"("tenant_id", "calendar_id", "weekday");

-- CreateIndex
CREATE INDEX "business_holiday_tenant_id_idx" ON "business_holiday"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_holiday_calendar_id_local_date_key" ON "business_holiday"("calendar_id", "local_date");

-- CreateIndex
CREATE INDEX "sla_policy_tenant_id_entity_key_idx" ON "sla_policy"("tenant_id", "entity_key");

-- CreateIndex
CREATE UNIQUE INDEX "sla_policy_tenant_id_name_key" ON "sla_policy"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sla_policy_tenant_id_id_key" ON "sla_policy"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "sla_clock_tenant_id_status_idx" ON "sla_clock"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sla_clock_tenant_id_deadline_at_idx" ON "sla_clock"("tenant_id", "deadline_at");

-- CreateIndex
CREATE UNIQUE INDEX "sla_clock_policy_id_entity_key_entity_id_key" ON "sla_clock"("policy_id", "entity_key", "entity_id");

-- AddForeignKey
ALTER TABLE "business_calendar" ADD CONSTRAINT "business_calendar_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_tenant_id_calendar_id_fkey" FOREIGN KEY ("tenant_id", "calendar_id") REFERENCES "business_calendar"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_holiday" ADD CONSTRAINT "business_holiday_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_holiday" ADD CONSTRAINT "business_holiday_tenant_id_calendar_id_fkey" FOREIGN KEY ("tenant_id", "calendar_id") REFERENCES "business_calendar"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sla_policy" ADD CONSTRAINT "sla_policy_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policy" ADD CONSTRAINT "sla_policy_tenant_id_calendar_id_fkey" FOREIGN KEY ("tenant_id", "calendar_id") REFERENCES "business_calendar"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sla_clock" ADD CONSTRAINT "sla_clock_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_clock" ADD CONSTRAINT "sla_clock_tenant_id_policy_id_fkey" FOREIGN KEY ("tenant_id", "policy_id") REFERENCES "sla_policy"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- ---------------------------------------------------------------------------
-- Temporal and SLA substrate
-- Authority: Bible V3 §1 [FACT], Bible V4 §5.B, EXE-SCH-001, MET-STA-004.
-- ---------------------------------------------------------------------------

ALTER TABLE "business_calendar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_calendar" FORCE ROW LEVEL SECURITY;
ALTER TABLE "business_hours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_hours" FORCE ROW LEVEL SECURITY;
ALTER TABLE "business_holiday" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_holiday" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sla_policy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sla_policy" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sla_clock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sla_clock" FORCE ROW LEVEL SECURITY;

CREATE POLICY "business_calendar_isolation" ON "business_calendar"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "business_hours_isolation" ON "business_hours"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "business_holiday_isolation" ON "business_holiday"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "sla_policy_isolation" ON "sla_policy"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "sla_clock_isolation" ON "sla_clock"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- A window must be a window, and a weekday must be a weekday. These are cheap
-- to state and expensive to discover as a mis-rendered calendar.
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_ordered"
  CHECK ("end_minute" > "start_minute" AND "start_minute" >= 0 AND "end_minute" <= 1440);
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_weekday_range"
  CHECK ("weekday" BETWEEN 0 AND 6);
ALTER TABLE "sla_policy" ADD CONSTRAINT "sla_policy_target_positive"
  CHECK ("target_minutes" > 0);

-- A timezone must be one PostgreSQL recognises. An unrecognised zone silently
-- falls back to UTC in most date libraries, which is the failure mode this
-- whole model exists to prevent, so it is rejected at write time instead.
CREATE OR REPLACE FUNCTION verity.is_valid_timezone(p_zone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_zone IS NULL THEN RETURN TRUE; END IF;
  PERFORM now() AT TIME ZONE p_zone;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

ALTER TABLE "tenant" ADD CONSTRAINT "tenant_time_zone_valid"
  CHECK (verity.is_valid_timezone("time_zone"));
ALTER TABLE "organization" ADD CONSTRAINT "organization_time_zone_valid"
  CHECK (verity.is_valid_timezone("time_zone"));
ALTER TABLE "business_calendar" ADD CONSTRAINT "business_calendar_time_zone_valid"
  CHECK (verity.is_valid_timezone("time_zone"));

-- ---------------------------------------------------------------------------
-- Working-minute arithmetic
--
-- Elapsed SLA time is measured in *working* minutes when a calendar is
-- attached, so a ticket raised at 17:00 Friday against an 8-hour target is not
-- breached by Monday morning. Computed in SQL because it is set arithmetic over
-- a date range, and doing it in application code would mean fetching every
-- window and holiday to add up minutes.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.working_minutes_between(
  p_calendar_id UUID, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_zone TEXT;
  v_total INTEGER := 0;
  v_day DATE;
  v_last DATE;
BEGIN
  IF p_to <= p_from THEN RETURN 0; END IF;

  SELECT time_zone INTO v_zone FROM business_calendar WHERE id = p_calendar_id;
  IF v_zone IS NULL THEN
    -- No calendar: elapsed wall-clock minutes.
    RETURN GREATEST(0, EXTRACT(EPOCH FROM (p_to - p_from))::INTEGER / 60);
  END IF;

  v_day  := (p_from AT TIME ZONE v_zone)::DATE;
  v_last := (p_to   AT TIME ZONE v_zone)::DATE;

  WHILE v_day <= v_last LOOP
    IF NOT EXISTS (
      SELECT 1 FROM business_holiday h
      WHERE h.calendar_id = p_calendar_id AND h.local_date = to_char(v_day, 'YYYY-MM-DD')
    ) THEN
      v_total := v_total + COALESCE((
        SELECT SUM(
          GREATEST(0,
            LEAST(
              w.end_minute,
              CASE WHEN v_day = v_last
                   THEN EXTRACT(HOUR FROM (p_to AT TIME ZONE v_zone))::INT * 60
                        + EXTRACT(MINUTE FROM (p_to AT TIME ZONE v_zone))::INT
                   ELSE 1440 END
            )
            - GREATEST(
              w.start_minute,
              CASE WHEN v_day = (p_from AT TIME ZONE v_zone)::DATE
                   THEN EXTRACT(HOUR FROM (p_from AT TIME ZONE v_zone))::INT * 60
                        + EXTRACT(MINUTE FROM (p_from AT TIME ZONE v_zone))::INT
                   ELSE 0 END
            )
          )
        )::INTEGER
        FROM business_hours w
        WHERE w.calendar_id = p_calendar_id
          AND w.weekday = EXTRACT(DOW FROM v_day)::INT
      ), 0);
    END IF;
    v_day := v_day + 1;
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION verity.working_minutes_between IS
  'Working minutes between two instants for a calendar, honouring its timezone, weekly hours and holidays. Falls back to wall-clock minutes when no calendar applies.';

-- The effective timezone for an organization: its own, else its tenant's, else
-- UTC. Stated rather than guessed.
CREATE OR REPLACE FUNCTION verity.effective_time_zone(p_organization_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(o.time_zone, t.time_zone, 'UTC')
  FROM organization o JOIN tenant t ON t.id = o.tenant_id
  WHERE o.id = p_organization_id;
$$;
