-- Generated from _model/capabilities/order.yaml · entity order_line
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE order__order_line (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  line_number integer NOT NULL,
  item_ref uuid NOT NULL,
  item_label_at_time text NOT NULL,
  selected_option_refs jsonb,
  option_summary_at_time text,
  quantity numeric(18,4) NOT NULL,
  unit_of_measure text NOT NULL,
  unit_price_minor bigint,
  price_rule_ref uuid,
  line_adjustment_minor bigint NOT NULL,
  adjustment_kind text,
  adjustment_reason text,
  adjustment_by_principal_id uuid,
  tax_classification_at_time text,
  line_total_minor bigint,
  fulfilment_route_ref uuid,
  fulfilled_quantity numeric(18,4) NOT NULL,
  void_reason text,
  notes text,
  added_at timestamptz NOT NULL,
  added_by_principal_id uuid NOT NULL
);

ALTER TABLE order__order_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE order__order_line FORCE ROW LEVEL SECURITY;
CREATE POLICY order__order_line_tenant_isolation ON order__order_line
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- added_at: immutable after create; enforced by trigger, not by application code
