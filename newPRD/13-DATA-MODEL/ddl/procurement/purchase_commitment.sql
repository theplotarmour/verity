-- Generated from _model/capabilities/procurement.yaml · entity purchase_commitment
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE procurement__purchase_commitment (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  supplier_party_ref uuid NOT NULL,
  request_id uuid,
  deliver_to_location_ref uuid,
  deliver_to_stock_location_ref uuid,
  expected_at date,
  lines jsonb NOT NULL,
  currency text NOT NULL,
  subtotal_minor bigint NOT NULL,
  tax_total_minor bigint,
  total_minor bigint NOT NULL,
  payment_terms_days integer,
  version_number integer NOT NULL,
  sent_at timestamptz,
  sent_via text NOT NULL,
  acknowledged_at timestamptz,
  closed_reason text
);

ALTER TABLE procurement__purchase_commitment ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement__purchase_commitment FORCE ROW LEVEL SECURITY;
CREATE POLICY procurement__purchase_commitment_tenant_isolation ON procurement__purchase_commitment
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reference: immutable after create; enforced by trigger, not by application code
