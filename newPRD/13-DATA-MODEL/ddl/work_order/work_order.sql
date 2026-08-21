-- Generated from _model/capabilities/work_order.yaml · entity work_order
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE work_order__work_order (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  title text NOT NULL,
  description text,
  subject_ref uuid,
  subject_capability_key text,
  location_ref uuid,
  requesting_party_ref uuid,
  origin text NOT NULL,
  origin_ref uuid,
  work_type_id uuid NOT NULL,
  priority text NOT NULL,
  requested_for_at timestamptz,
  due_at timestamptz,
  due_source text NOT NULL,
  assigned_resource_ref uuid,
  started_at timestamptz,
  completed_at timestamptz,
  outcome text,
  outcome_notes text,
  signed_off_by text,
  signed_off_at timestamptz,
  signature_evidence_ref text,
  reopen_of_work_order_id uuid,
  reopen_count integer NOT NULL,
  labour_minutes integer,
  travel_minutes integer,
  cost_estimate_minor bigint,
  cost_actual_minor bigint,
  billable text NOT NULL
);

ALTER TABLE work_order__work_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order__work_order FORCE ROW LEVEL SECURITY;
CREATE POLICY work_order__work_order_tenant_isolation ON work_order__work_order
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reference: immutable after create; enforced by trigger, not by application code
