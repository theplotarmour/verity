-- Generated from _model/capabilities/assets.yaml · entity maintenance_plan
-- Tenancy mode: tenant_scoped

CREATE TABLE assets__maintenance_plan (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  applies_to_class_id uuid,
  applies_to_asset_ids jsonb,
  trigger_kind text NOT NULL,
  interval_days integer,
  meter_key text,
  meter_interval numeric(18,4),
  condition_trigger text NOT NULL,
  lead_days integer NOT NULL,
  tolerance_days integer NOT NULL,
  work_type_ref uuid,
  last_generated_at timestamptz,
  next_due_at timestamptz,
  next_due_meter_value numeric(18,4),
  suppress_when_out_of_service boolean NOT NULL
);

ALTER TABLE assets__maintenance_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets__maintenance_plan FORCE ROW LEVEL SECURITY;
CREATE POLICY assets__maintenance_plan_tenant_isolation ON assets__maintenance_plan
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
