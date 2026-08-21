-- Generated from _model/capabilities/sites.yaml · entity location
-- Tenancy mode: tenant_scoped

CREATE TABLE sites__location (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  level text NOT NULL,
  parent_location_id uuid,
  path text NOT NULL,
  owning_party_ref uuid,
  address_text text,
  position geography(Point,4326),
  position_accuracy_m integer,
  timezone text NOT NULL,
  operating_calendar_id uuid,
  capacity integer,
  attributes jsonb,
  criticality text NOT NULL,
  opened_at date,
  closed_at date
);

ALTER TABLE sites__location ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites__location FORCE ROW LEVEL SECURITY;
CREATE POLICY sites__location_tenant_isolation ON sites__location
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
