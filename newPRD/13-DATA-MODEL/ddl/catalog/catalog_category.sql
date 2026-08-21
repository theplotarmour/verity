-- Generated from _model/capabilities/catalog.yaml · entity catalog_category
-- Tenancy mode: tenant_scoped

CREATE TABLE catalog__catalog_category (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  parent_category_id uuid,
  path text NOT NULL,
  sort_weight integer NOT NULL,
  default_tax_classification text
);

ALTER TABLE catalog__catalog_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog__catalog_category FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog__catalog_category_tenant_isolation ON catalog__catalog_category
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
