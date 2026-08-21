-- Generated from _model/capabilities/assets.yaml · entity meter_reading
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE assets__meter_reading (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  meter_key text NOT NULL,
  value numeric(18,4) NOT NULL,
  unit text NOT NULL,
  read_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL,
  source text NOT NULL,
  read_by_principal_id uuid,
  evidence_ref text,
  delta_since_previous numeric(18,4),
  plausibility text NOT NULL,
  superseded_by_reading_id uuid
);

ALTER TABLE assets__meter_reading ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets__meter_reading FORCE ROW LEVEL SECURITY;
CREATE POLICY assets__meter_reading_tenant_isolation ON assets__meter_reading
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
