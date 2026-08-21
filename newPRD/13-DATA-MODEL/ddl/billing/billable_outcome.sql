-- Generated from _model/capabilities/billing.yaml · entity billable_outcome
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE billing__billable_outcome (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  source_capability_key text NOT NULL,
  source_ref uuid NOT NULL,
  counterparty_ref uuid NOT NULL,
  contract_ref uuid,
  location_ref uuid,
  occurred_at timestamptz NOT NULL,
  quantity numeric(18,4) NOT NULL,
  unit_of_measure text NOT NULL,
  rate_basis text NOT NULL,
  item_ref uuid,
  description_at_time text NOT NULL,
  evidence_refs jsonb,
  evidence_strength text,
  classification_hint text,
  rated_amount_minor bigint,
  rate_rule_ref uuid,
  tax_classification text,
  invoice_line_id uuid,
  excluded_reason text
);

ALTER TABLE billing__billable_outcome ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing__billable_outcome FORCE ROW LEVEL SECURITY;
CREATE POLICY billing__billable_outcome_tenant_isolation ON billing__billable_outcome
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- source_capability_key: immutable after create; enforced by trigger, not by application code
-- source_ref: immutable after create; enforced by trigger, not by application code
-- occurred_at: immutable after create; enforced by trigger, not by application code
