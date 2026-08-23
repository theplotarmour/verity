-- CreateEnum
CREATE TYPE "GroupSelection" AS ENUM ('AllOf', 'AnyOf', 'NOf');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('Pending', 'Approved', 'Rejected', 'Skipped');

-- CreateTable
CREATE TABLE "resource" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "party_id" UUID,
    "asset_id" UUID,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_group" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "selection" "GroupSelection" NOT NULL DEFAULT 'AnyOf',
    "required_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "resource_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_group_member" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_group_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_window" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_window_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "subject_entity_key" TEXT NOT NULL,
    "subject_entity_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_request" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subject_entity_key" TEXT NOT NULL,
    "subject_entity_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "outcome" "ApprovalDecision" NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "approval_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_step" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "approver_role_id" UUID NOT NULL,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'Pending',
    "decided_by_user_id" UUID,
    "decided_at" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "approval_step_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_tenant_id_idx" ON "resource"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_tenant_id_id_key" ON "resource"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "resource_group_tenant_id_idx" ON "resource_group"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_group_tenant_id_id_key" ON "resource_group"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "resource_group_member_tenant_id_idx" ON "resource_group_member"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_group_member_group_id_resource_id_key" ON "resource_group_member"("group_id", "resource_id");

-- CreateIndex
CREATE INDEX "availability_window_tenant_id_resource_id_starts_at_idx" ON "availability_window"("tenant_id", "resource_id", "starts_at");

-- CreateIndex
CREATE INDEX "booking_tenant_id_resource_id_starts_at_idx" ON "booking"("tenant_id", "resource_id", "starts_at");

-- CreateIndex
CREATE INDEX "approval_request_tenant_id_subject_entity_key_subject_entit_idx" ON "approval_request"("tenant_id", "subject_entity_key", "subject_entity_id");

-- CreateIndex
CREATE INDEX "approval_step_tenant_id_idx" ON "approval_step"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_step_request_id_sequence_key" ON "approval_step"("request_id", "sequence");

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_tenant_id_asset_id_fkey" FOREIGN KEY ("tenant_id", "asset_id") REFERENCES "asset"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resource_group" ADD CONSTRAINT "resource_group_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_group_member" ADD CONSTRAINT "resource_group_member_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_group_member" ADD CONSTRAINT "resource_group_member_tenant_id_group_id_fkey" FOREIGN KEY ("tenant_id", "group_id") REFERENCES "resource_group"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resource_group_member" ADD CONSTRAINT "resource_group_member_tenant_id_resource_id_fkey" FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "resource"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "availability_window" ADD CONSTRAINT "availability_window_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_window" ADD CONSTRAINT "availability_window_tenant_id_resource_id_fkey" FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "resource"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_tenant_id_resource_id_fkey" FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "resource"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_step" ADD CONSTRAINT "approval_step_tenant_id_approver_role_id_fkey" FOREIGN KEY ("tenant_id", "approver_role_id") REFERENCES "role"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;


-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Scheduling and Approval
-- ---------------------------------------------------------------------------

ALTER TABLE "resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resource" FORCE ROW LEVEL SECURITY;
ALTER TABLE "resource_group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resource_group" FORCE ROW LEVEL SECURITY;
ALTER TABLE "resource_group_member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resource_group_member" FORCE ROW LEVEL SECURITY;
ALTER TABLE "availability_window" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "availability_window" FORCE ROW LEVEL SECURITY;
ALTER TABLE "booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking" FORCE ROW LEVEL SECURITY;
ALTER TABLE "approval_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_request" FORCE ROW LEVEL SECURITY;
ALTER TABLE "approval_step" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_step" FORCE ROW LEVEL SECURITY;

CREATE POLICY "resource_isolation" ON "resource"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "resource_group_isolation" ON "resource_group"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "resource_group_member_isolation" ON "resource_group_member"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "availability_window_isolation" ON "availability_window"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "booking_isolation" ON "booking"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "approval_request_isolation" ON "approval_request"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "approval_step_isolation" ON "approval_step"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ADR-008: a Resource is backed by exactly one Party or Asset. Neither makes it
-- unschedulable; both makes it ambiguous. A constraint rather than a convention,
-- because every downstream scheduling decision assumes it holds.
ALTER TABLE "resource" ADD CONSTRAINT "resource_exactly_one_backing"
  CHECK (("party_id" IS NOT NULL) <> ("asset_id" IS NOT NULL));

-- A window or booking that ends before it starts is not a period.
ALTER TABLE "availability_window" ADD CONSTRAINT "availability_window_ordered"
  CHECK ("ends_at" > "starts_at");
ALTER TABLE "booking" ADD CONSTRAINT "booking_ordered"
  CHECK ("ends_at" > "starts_at");

-- NOf requires a count; the other policies must not carry one.
ALTER TABLE "resource_group" ADD CONSTRAINT "resource_group_count_matches_selection"
  CHECK (("selection" = 'NOf') = ("required_count" IS NOT NULL));

-- ---------------------------------------------------------------------------
-- Conflict detection (ADR-008: availability and conflict detection operate on
-- Resources only)
--
-- Enforced by trigger rather than in the booking service, so no other write
-- path can double-book a resource. A GIST exclusion constraint would express
-- this more directly but needs btree_gist; the same reasoning that kept PostGIS
-- out applies — one overlap question does not justify an extension.
--
-- Half-open intervals: a booking ending at 10:00 does not conflict with one
-- starting at 10:00.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.booking_no_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_conflict UUID;
BEGIN
  IF NEW.cancelled THEN
    RETURN NEW;
  END IF;

  SELECT b.id INTO v_conflict
  FROM booking b
  WHERE b.resource_id = NEW.resource_id
    AND b.id <> NEW.id
    AND NOT b.cancelled
    AND b.starts_at < NEW.ends_at
    AND NEW.starts_at < b.ends_at
  LIMIT 1;

  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'booking: resource % is already booked in that period (conflicting booking %)',
      NEW.resource_id, v_conflict
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "booking_no_overlap"
  BEFORE INSERT OR UPDATE ON "booking"
  FOR EACH ROW EXECUTE FUNCTION verity.booking_no_overlap();

-- Is a resource free for a period? Free means: no conflicting booking, and not
-- covered by an explicit unavailability window.
CREATE OR REPLACE FUNCTION verity.resource_is_free(
  p_resource_id UUID, p_starts_at TIMESTAMP(3), p_ends_at TIMESTAMP(3)
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM booking b
    WHERE b.resource_id = p_resource_id AND NOT b.cancelled
      AND b.starts_at < p_ends_at AND p_starts_at < b.ends_at
  ) AND NOT EXISTS (
    SELECT 1 FROM availability_window w
    WHERE w.resource_id = p_resource_id AND w.available = false
      AND w.starts_at < p_ends_at AND p_starts_at < w.ends_at
  );
$$;

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at) VALUES
  ('verity.capability.scheduling', 'Scheduling', '1.0.0',
   ARRAY['verity.capability.asset'],
   ARRAY['verity.scheduling.resource','verity.scheduling.resource_group','verity.scheduling.booking'], now()),
  ('verity.capability.approval', 'Approval', '1.0.0',
   ARRAY[]::text[], ARRAY['verity.approval.request'], now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.scheduling.resource',       'verity.capability.scheduling', 'Persistent', 'resource',       true),
  ('verity.scheduling.resource_group', 'verity.capability.scheduling', 'Persistent', 'resource_group', true),
  ('verity.scheduling.booking',        'verity.capability.scheduling', 'Persistent', 'booking',        true),
  ('verity.approval.request',          'verity.capability.approval',   'Persistent', 'approval_request', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  (gen_random_uuid(), 'verity.approval.request', 'pending',  'Pending',   true,  false),
  (gen_random_uuid(), 'verity.approval.request', 'approved', 'Completed', false, true),
  (gen_random_uuid(), 'verity.approval.request', 'rejected', 'Cancelled', false, true),
  (gen_random_uuid(), 'verity.approval.request', 'withdrawn','Cancelled', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.approval.request', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.approval.request' AND t.entity_key = 'verity.approval.request'
  AND (f.key, t.key) IN (('pending','approved'), ('pending','rejected'), ('pending','withdrawn'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
