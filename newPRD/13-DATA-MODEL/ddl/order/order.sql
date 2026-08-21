-- Generated from _model/capabilities/order.yaml · entity order
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE order__order (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  channel text NOT NULL,
  party_ref uuid,
  location_ref uuid,
  destination_ref uuid,
  requested_for_at timestamptz,
  promised_for_at timestamptz,
  currency text NOT NULL,
  subtotal_minor bigint NOT NULL,
  adjustment_total_minor bigint NOT NULL,
  tax_total_minor bigint,
  total_minor bigint NOT NULL,
  paid_minor bigint NOT NULL,
  payment_state text NOT NULL,
  split_of_order_id uuid,
  merged_into_order_id uuid,
  void_reason text,
  voided_by_principal_id uuid,
  taken_by_principal_id uuid,
  notes text,
  pricing_snapshot_at timestamptz NOT NULL
);

ALTER TABLE order__order ENABLE ROW LEVEL SECURITY;
ALTER TABLE order__order FORCE ROW LEVEL SECURITY;
CREATE POLICY order__order_tenant_isolation ON order__order
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reference: immutable after create; enforced by trigger, not by application code
