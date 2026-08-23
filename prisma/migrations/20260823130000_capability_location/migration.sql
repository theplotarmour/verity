-- CreateTable
CREATE TABLE "place" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "place_id" UUID,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postal_code" TEXT,
    "country_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "place_id" UUID,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofence" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "centre_lat" DECIMAL(9,6) NOT NULL,
    "centre_lng" DECIMAL(9,6) NOT NULL,
    "radius_metres" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_assignment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_tenant_id_idx" ON "place"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "place_tenant_id_id_key" ON "place"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "address_tenant_id_idx" ON "address"("tenant_id");

-- CreateIndex
CREATE INDEX "location_tenant_id_organization_id_idx" ON "location"("tenant_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_tenant_id_id_key" ON "location"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "geofence_tenant_id_location_id_idx" ON "geofence"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "location_assignment_tenant_id_user_id_idx" ON "location_assignment"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_assignment_user_id_location_id_key" ON "location_assignment"("user_id", "location_id");

-- AddForeignKey
ALTER TABLE "place" ADD CONSTRAINT "place_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_tenant_id_place_id_fkey" FOREIGN KEY ("tenant_id", "place_id") REFERENCES "place"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id", "organization_id") REFERENCES "organization"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_tenant_id_place_id_fkey" FOREIGN KEY ("tenant_id", "place_id") REFERENCES "place"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "geofence" ADD CONSTRAINT "geofence_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofence" ADD CONSTRAINT "geofence_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "location_assignment" ADD CONSTRAINT "location_assignment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_assignment" ADD CONSTRAINT "location_assignment_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "location_assignment" ADD CONSTRAINT "location_assignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Location
--
-- A capability installs itself through its migration: tables, RLS, then
-- registration in the platform registries. The application role can read the
-- registries but never write them, so installation is necessarily a deploy-time
-- act — which is the honest shape, since the tables have to exist anyway.
-- ---------------------------------------------------------------------------

ALTER TABLE "place" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "place" FORCE ROW LEVEL SECURITY;
ALTER TABLE "address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "address" FORCE ROW LEVEL SECURITY;
ALTER TABLE "location" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "location" FORCE ROW LEVEL SECURITY;
ALTER TABLE "geofence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "geofence" FORCE ROW LEVEL SECURITY;
ALTER TABLE "location_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "location_assignment" FORCE ROW LEVEL SECURITY;

CREATE POLICY "place_isolation" ON "place"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "address_isolation" ON "address"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "location_isolation" ON "location"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "geofence_isolation" ON "geofence"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "location_assignment_isolation" ON "location_assignment"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.location', 'Location', '1.0.0', ARRAY[]::text[],
  ARRAY['verity.location.place','verity.location.address','verity.location.location','verity.location.geofence'],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.location.place',    'verity.capability.location', 'Persistent', 'place',    true),
  ('verity.location.address',  'verity.capability.location', 'Persistent', 'address',  true),
  ('verity.location.location', 'verity.capability.location', 'Persistent', 'location', true),
  ('verity.location.geofence', 'verity.capability.location', 'Persistent', 'geofence', true)
ON CONFLICT (key) DO NOTHING;

-- Location lifecycle. Deliberately minimal: a site is open or it is not.
-- Anything richer belongs to the capability that operates the site.
INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  (gen_random_uuid(), 'verity.location.location', 'active',        'Active',    true,  false),
  (gen_random_uuid(), 'verity.location.location', 'suspended',     'Blocked',   false, false),
  (gen_random_uuid(), 'verity.location.location', 'decommissioned','Completed', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.location.location', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.location.location' AND t.entity_key = 'verity.location.location'
  AND (f.key, t.key) IN (('active','suspended'), ('suspended','active'), ('suspended','decommissioned'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Geofence evaluation
--
-- Haversine on the WGS84 sphere. Deliberately not PostGIS: the only spatial
-- question the platform asks is "is this point within N metres of that point",
-- and adding a spatial extension to answer it would be a dependency the
-- specification never asked for.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.within_geofence(
  p_geofence_id UUID, p_lat NUMERIC, p_lng NUMERIC
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT 6371000 * 2 * asin(sqrt(
           power(sin(radians(p_lat - g.centre_lat) / 2), 2)
           + cos(radians(g.centre_lat)) * cos(radians(p_lat))
           * power(sin(radians(p_lng - g.centre_lng) / 2), 2)
         )) <= g.radius_metres
  FROM geofence g
  WHERE g.id = p_geofence_id;
$$;

COMMENT ON FUNCTION verity.within_geofence IS
  'True when a point falls inside a geofence (ADR-004: geofences are policies evaluated against Places, not Locations themselves).';
