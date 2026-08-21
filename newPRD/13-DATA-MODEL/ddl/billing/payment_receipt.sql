-- Generated from _model/capabilities/billing.yaml · entity payment_receipt
-- Tenancy mode: tenant_scoped

CREATE TABLE billing__payment_receipt (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  counterparty_ref uuid,
  received_at timestamptz NOT NULL,
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  method text NOT NULL,
  external_reference text,
  payer_narrative text,
  allocated_minor bigint NOT NULL,
  recorded_by_principal_id uuid NOT NULL,
  reversed_reason text
);

ALTER TABLE billing__payment_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing__payment_receipt FORCE ROW LEVEL SECURITY;
CREATE POLICY billing__payment_receipt_tenant_isolation ON billing__payment_receipt
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
