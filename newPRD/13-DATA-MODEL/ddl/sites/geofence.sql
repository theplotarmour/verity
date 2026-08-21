-- Generated from _model/capabilities/sites.yaml · entity geofence
-- Tenancy mode: tenant_scoped

CREATE TABLE sites__geofence (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  location_id uuid NOT NULL,
  shape text NOT NULL,
  centre geography(Point,4326),
  radius_m integer,
  polygon jsonb,
  tolerance_m integer NOT NULL,
  min_accuracy_m integer NOT NULL,
  purpose text NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz
);

ALTER TABLE sites__geofence ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites__geofence FORCE ROW LEVEL SECURITY;
CREATE POLICY sites__geofence_tenant_isolation ON sites__geofence
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
