-- Generated from _model/capabilities/billing.yaml · entity invoice_line
-- Tenancy mode: tenant_scoped

CREATE TABLE billing__invoice_line (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  line_number integer NOT NULL,
  description text NOT NULL,
  quantity numeric(18,4) NOT NULL,
  unit_of_measure text NOT NULL,
  unit_amount_minor bigint NOT NULL,
  line_total_minor bigint NOT NULL,
  tax_classification text,
  tax_amount_minor bigint,
  rate_rule_ref uuid,
  evidence_refs jsonb,
  outcome_count integer NOT NULL,
  disputed boolean NOT NULL,
  dispute_reason text,
  credited_by_line_id uuid
);

ALTER TABLE billing__invoice_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing__invoice_line FORCE ROW LEVEL SECURITY;
CREATE POLICY billing__invoice_line_tenant_isolation ON billing__invoice_line
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- description: immutable after create; enforced by trigger, not by application code
-- quantity: immutable after create; enforced by trigger, not by application code
-- unit_of_measure: immutable after create; enforced by trigger, not by application code
-- unit_amount_minor: immutable after create; enforced by trigger, not by application code
-- line_total_minor: immutable after create; enforced by trigger, not by application code
-- tax_classification: immutable after create; enforced by trigger, not by application code
-- tax_amount_minor: immutable after create; enforced by trigger, not by application code
-- rate_rule_ref: immutable after create; enforced by trigger, not by application code
-- evidence_refs: immutable after create; enforced by trigger, not by application code
