-- Generated from _model/capabilities/lease_management.yaml · entity charge_schedule
-- Tenancy mode: tenant_scoped

CREATE TABLE lease_management__charge_schedule (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  lease_id uuid NOT NULL,
  charge_kind text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_on date NOT NULL,
  amount_minor bigint NOT NULL,
  basis_note text NOT NULL,
  escalation_applied_id uuid,
  rent_free boolean NOT NULL,
  apportioned boolean NOT NULL,
  billable_outcome_ref uuid,
  superseded_by_schedule_id uuid
);

ALTER TABLE lease_management__charge_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_management__charge_schedule FORCE ROW LEVEL SECURITY;
CREATE POLICY lease_management__charge_schedule_tenant_isolation ON lease_management__charge_schedule
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
