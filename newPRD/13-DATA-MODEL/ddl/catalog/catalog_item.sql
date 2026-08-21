-- Generated from _model/capabilities/catalog.yaml · entity catalog_item
-- Tenancy mode: tenant_scoped

CREATE TABLE catalog__catalog_item (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  item_kind text NOT NULL,
  unit_of_measure text NOT NULL,
  category_id uuid,
  tax_classification text,
  is_sellable boolean NOT NULL,
  is_purchasable boolean NOT NULL,
  is_stocked boolean NOT NULL,
  default_duration_minutes integer,
  required_qualification_keys jsonb,
  composition_id uuid,
  image_ref text,
  sort_weight integer NOT NULL,
  version_number integer NOT NULL,
  replaced_by_item_id uuid
);

ALTER TABLE catalog__catalog_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog__catalog_item FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog__catalog_item_tenant_isolation ON catalog__catalog_item
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- sku: immutable after create; enforced by trigger, not by application code
