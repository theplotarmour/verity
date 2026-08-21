-- Generated from _model/capabilities/procurement.yaml · entity goods_receipt
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE procurement__goods_receipt (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  commitment_id uuid,
  supplier_party_ref uuid,
  stock_location_ref uuid NOT NULL,
  received_at timestamptz NOT NULL,
  received_by_principal_id uuid NOT NULL,
  supplier_document_ref text,
  lines jsonb NOT NULL,
  has_discrepancy boolean NOT NULL,
  evidence_refs jsonb,
  created_offline boolean NOT NULL
);

ALTER TABLE procurement__goods_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement__goods_receipt FORCE ROW LEVEL SECURITY;
CREATE POLICY procurement__goods_receipt_tenant_isolation ON procurement__goods_receipt
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
