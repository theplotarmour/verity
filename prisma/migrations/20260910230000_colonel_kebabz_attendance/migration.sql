-- ---------------------------------------------------------------------------
-- Colonel Kebabz Phase 3 (lean V1): Attendance + Shifts (PRD §39-40, 42)
-- ---------------------------------------------------------------------------
-- Hand-isolated from `prisma migrate diff` — same reasoning as prior slices:
-- the live DB still carries unrelated pre-existing drift from
-- `20260904180000_trading_capability_extraction`, untouched here.

CREATE TABLE "attendance_record" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "check_in_at" TIMESTAMP(3),
    "check_out_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "attendance_record_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shift" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_record_tenant_id_employee_id_date_key" ON "attendance_record"("tenant_id", "employee_id", "date");

CREATE INDEX "shift_tenant_id_location_id_date_idx" ON "shift"("tenant_id", "location_id", "date");

ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift" ADD CONSTRAINT "shift_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift" ADD CONSTRAINT "shift_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "shift" ADD CONSTRAINT "shift_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_record" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_record_isolation" ON "attendance_record"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "shift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift" FORCE ROW LEVEL SECURITY;
CREATE POLICY "shift_isolation" ON "shift"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Attendance (Colonel Kebabz Phase 3)
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.attendance', 'Attendance', '1.0.0',
  ARRAY['verity.capability.hr', 'verity.capability.location'],
  ARRAY['verity.attendance.record', 'verity.attendance.shift'],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.attendance.record', 'verity.capability.attendance', 'Persistent', 'attendance_record', true),
  ('verity.attendance.shift', 'verity.capability.attendance', 'Persistent', 'shift', true)
ON CONFLICT (key) DO NOTHING;
