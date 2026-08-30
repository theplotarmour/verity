-- ---------------------------------------------------------------------------
-- Goods Issue documents (slice 4)
--
-- Authority: taskplans/45_plywood_workflow_program.md §5;
-- PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-04.
--
-- The counterpart to the Goods Receipt, and now the ONLY door out of a godown.
-- Dispatch used to be a state change that moved every remaining line at once,
-- released every hold and completed the order. A partial issue was impossible,
-- nothing recorded who handed the material over, and an invoice could be raised
-- for the ordered quantity rather than the quantity that actually left.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_goods_issue" (
  "id"              UUID NOT NULL,
  "tenant_id"       UUID NOT NULL,
  "sales_order_id"  UUID NOT NULL,
  "location_id"     UUID NOT NULL,
  "issue_number"    TEXT NOT NULL,
  "financial_year"  TEXT NOT NULL,
  "issued_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issued_by"       UUID NOT NULL,
  "collected_by"    TEXT,
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plywood_goods_issue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_goods_issue_line" (
  "id"                    UUID NOT NULL,
  "tenant_id"             UUID NOT NULL,
  "issue_id"              UUID NOT NULL,
  "sales_order_line_id"   UUID NOT NULL,
  "product_id"            UUID NOT NULL,
  "product_name_snapshot" TEXT NOT NULL,
  "rack_id"               UUID,
  "qty_issued"            INTEGER NOT NULL,
  "unit_cost_paise"       INTEGER NOT NULL,

  CONSTRAINT "plywood_goods_issue_line_pkey" PRIMARY KEY ("id"),
  -- Zero is not an issue; a negative one is a return, which is its own document.
  CONSTRAINT "plywood_goods_issue_line_qty_positive" CHECK ("qty_issued" > 0),
  CONSTRAINT "plywood_goods_issue_line_cost_non_negative" CHECK ("unit_cost_paise" >= 0)
);

CREATE UNIQUE INDEX "plywood_goods_issue_tenant_id_issue_number_key"
  ON "plywood_goods_issue"("tenant_id", "issue_number");
CREATE UNIQUE INDEX "plywood_goods_issue_tenant_scoped_id"
  ON "plywood_goods_issue"("tenant_id", "id");
CREATE INDEX "plywood_goods_issue_tenant_id_sales_order_id_idx"
  ON "plywood_goods_issue"("tenant_id", "sales_order_id");
CREATE INDEX "plywood_goods_issue_tenant_id_issued_at_idx"
  ON "plywood_goods_issue"("tenant_id", "issued_at");

CREATE UNIQUE INDEX "plywood_goods_issue_line_tenant_scoped_id"
  ON "plywood_goods_issue_line"("tenant_id", "id");
CREATE INDEX "plywood_goods_issue_line_tenant_id_issue_id_idx"
  ON "plywood_goods_issue_line"("tenant_id", "issue_id");

ALTER TABLE "plywood_goods_issue"
  ADD CONSTRAINT "plywood_goods_issue_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "plywood_goods_issue_sales_order_fkey"
    FOREIGN KEY ("tenant_id", "sales_order_id") REFERENCES "plywood_sales_order"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "plywood_goods_issue_location_fkey"
    FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_goods_issue_line"
  ADD CONSTRAINT "plywood_goods_issue_line_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "plywood_goods_issue_line_issue_fkey"
    FOREIGN KEY ("tenant_id", "issue_id") REFERENCES "plywood_goods_issue"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT "plywood_goods_issue_line_order_line_fkey"
    FOREIGN KEY ("tenant_id", "sales_order_line_id") REFERENCES "plywood_sales_order_line"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "plywood_goods_issue_line_product_fkey"
    FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "plywood_goods_issue_line_rack_fkey"
    FOREIGN KEY ("tenant_id", "rack_id") REFERENCES "godown_rack"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- A posted issue is immutable. The material has physically left; editing the
-- record of that afterwards is not a correction, it is a rewrite. Goods that
-- come back are a customer return, which is its own document.
CREATE TRIGGER plywood_goods_issue_immutable
  BEFORE UPDATE ON "plywood_goods_issue"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

CREATE TRIGGER plywood_goods_issue_line_immutable
  BEFORE UPDATE ON "plywood_goods_issue_line"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

ALTER TABLE "plywood_goods_issue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_goods_issue" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_goods_issue_tenant_isolation ON "plywood_goods_issue"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "plywood_goods_issue_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_goods_issue_line" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_goods_issue_line_tenant_isolation ON "plywood_goods_issue_line"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());
