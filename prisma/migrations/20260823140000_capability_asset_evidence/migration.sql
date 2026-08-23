-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('Photo', 'Signature', 'GeoPoint', 'Document', 'Reading');

-- CreateTable
CREATE TABLE "asset" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "state" TEXT NOT NULL DEFAULT 'in_service',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_key" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "uri" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "captured_at" TIMESTAMP(3) NOT NULL,
    "captured_by_id" UUID,
    "geofence_id" UUID,
    "within_fence" BOOLEAN,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_tenant_id_location_id_idx" ON "asset"("tenant_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_tenant_id_id_key" ON "asset"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_tenant_id_reference_key" ON "asset"("tenant_id", "reference");

-- CreateIndex
CREATE INDEX "evidence_tenant_id_entity_key_entity_id_idx" ON "evidence"("tenant_id", "entity_key", "entity_id");

-- CreateIndex
CREATE INDEX "evidence_tenant_id_captured_at_idx" ON "evidence"("tenant_id", "captured_at");

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Asset and Evidence
-- ---------------------------------------------------------------------------

ALTER TABLE "asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset" FORCE ROW LEVEL SECURITY;
ALTER TABLE "evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence" FORCE ROW LEVEL SECURITY;

CREATE POLICY "asset_isolation" ON "asset"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Evidence is append-only for the same reason the audit streams are: a
-- calibration certificate or a proof-of-attendance photograph that can be
-- edited later is not evidence. SELECT and INSERT only, no UPDATE or DELETE
-- policy, plus the trigger below so a privileged role cannot rewrite it either.
CREATE POLICY "evidence_read" ON "evidence"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "evidence_append" ON "evidence"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE TRIGGER "evidence_append_only"
  BEFORE UPDATE OR DELETE ON "evidence"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at) VALUES
  ('verity.capability.asset', 'Asset', '1.0.0',
   ARRAY['verity.capability.location'], ARRAY['verity.asset.asset'], now()),
  ('verity.capability.evidence', 'Evidence', '1.0.0',
   ARRAY['verity.capability.location'], ARRAY['verity.evidence.evidence'], now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.asset.asset',       'verity.capability.asset',    'Persistent', 'asset',    true),
  ('verity.evidence.evidence', 'verity.capability.evidence', 'Persistent', 'evidence', true)
ON CONFLICT (key) DO NOTHING;

-- Asset lifecycle. Maintenance is Blocked rather than Pending: the asset is
-- unavailable and the resolution is work, not waiting.
INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  (gen_random_uuid(), 'verity.asset.asset', 'in_service',   'Active',    true,  false),
  (gen_random_uuid(), 'verity.asset.asset', 'maintenance',  'Blocked',   false, false),
  (gen_random_uuid(), 'verity.asset.asset', 'retired',      'Completed', false, true),
  (gen_random_uuid(), 'verity.asset.asset', 'lost',         'Cancelled', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.asset.asset', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.asset.asset' AND t.entity_key = 'verity.asset.asset'
  AND (f.key, t.key) IN (
    ('in_service','maintenance'), ('maintenance','in_service'),
    ('in_service','retired'), ('maintenance','retired'),
    ('in_service','lost'), ('maintenance','lost'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
