-- Generated from _model/capabilities/billing.yaml · entity invoice
-- Tenancy mode: tenant_scoped

CREATE TABLE billing__invoice (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  document_number text NOT NULL,
  series_key text NOT NULL,
  counterparty_ref uuid NOT NULL,
  contract_ref uuid,
  issue_date date,
  due_date date,
  period_start date,
  period_end date,
  currency text NOT NULL,
  subtotal_minor bigint NOT NULL,
  tax_total_minor bigint,
  total_minor bigint NOT NULL,
  allocated_minor bigint NOT NULL,
  disputed_minor bigint NOT NULL,
  written_off_minor bigint NOT NULL,
  registration_required boolean NOT NULL,
  registration_reference text,
  registration_qr text,
  registration_deadline_at timestamptz,
  registration_failure_reason text,
  document_ref text,
  sent_at timestamptz,
  sent_via text NOT NULL,
  credit_of_invoice_id uuid,
  document_kind text NOT NULL
);

ALTER TABLE billing__invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing__invoice FORCE ROW LEVEL SECURITY;
CREATE POLICY billing__invoice_tenant_isolation ON billing__invoice
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- document_number: immutable after create; enforced by trigger, not by application code
-- series_key: immutable after create; enforced by trigger, not by application code
-- counterparty_ref: immutable after create; enforced by trigger, not by application code
-- contract_ref: immutable after create; enforced by trigger, not by application code
-- issue_date: immutable after create; enforced by trigger, not by application code
-- currency: immutable after create; enforced by trigger, not by application code
-- document_kind: immutable after create; enforced by trigger, not by application code
