-- Generated from _model/capabilities/procurement.yaml · entity supplier_invoice
-- Tenancy mode: tenant_scoped

CREATE TABLE procurement__supplier_invoice (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  supplier_party_ref uuid NOT NULL,
  supplier_invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  commitment_id uuid,
  lines jsonb NOT NULL,
  currency text NOT NULL,
  subtotal_minor bigint NOT NULL,
  tax_total_minor bigint,
  total_minor bigint NOT NULL,
  document_ref text,
  match_variance_minor bigint,
  match_variance_reason text,
  approved_for_payment_by_principal_id uuid,
  payment_reference text
);

ALTER TABLE procurement__supplier_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement__supplier_invoice FORCE ROW LEVEL SECURITY;
CREATE POLICY procurement__supplier_invoice_tenant_isolation ON procurement__supplier_invoice
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
