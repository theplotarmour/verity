-- Generated from _model/capabilities/lease_management.yaml · entity lease
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE lease_management__lease (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  counterparty_ref uuid NOT NULL,
  space_refs jsonb NOT NULL,
  measured_area numeric(18,4),
  area_unit text,
  area_basis text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  break_dates jsonb,
  notice_days integer,
  renewal_option text NOT NULL,
  renewal_window_opens_on date,
  renewal_window_closes_on date,
  base_amount_minor bigint NOT NULL,
  currency text NOT NULL,
  payment_frequency text NOT NULL,
  payment_in_advance boolean NOT NULL,
  deposit_amount_minor bigint,
  rent_free_periods jsonb,
  document_ref text,
  supersedes_lease_id uuid,
  ended_reason text
);

ALTER TABLE lease_management__lease ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_management__lease FORCE ROW LEVEL SECURITY;
CREATE POLICY lease_management__lease_tenant_isolation ON lease_management__lease
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reference: immutable after create; enforced by trigger, not by application code
