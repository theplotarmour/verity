-- ---------------------------------------------------------------------------
-- Goods Receipt documents and source-linked stock movements (slice 3)
--
-- Authority: taskplans/45_plywood_workflow_program.md §5;
-- PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-04.
--
-- Receiving used to increment a field on a purchase order line and write a
-- stock movement with nothing pointing back at it. Nobody could open a receipt,
-- prove who handled a line, print it, match it to a supplier invoice or
-- partially reverse it. "Enter once and propagate" cannot be audited when the
-- propagation leaves no document behind.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_goods_receipt" (
  "id"                      UUID NOT NULL,
  "tenant_id"               UUID NOT NULL,
  "purchase_order_id"       UUID NOT NULL,
  "location_id"             UUID NOT NULL,
  "receipt_number"          TEXT NOT NULL,
  "financial_year"          TEXT NOT NULL,
  "supplier_challan_number" TEXT,
  "received_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "received_by"             UUID NOT NULL,
  "notes"                   TEXT,
  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plywood_goods_receipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_goods_receipt_line" (
  "id"                       UUID NOT NULL,
  "tenant_id"                UUID NOT NULL,
  "receipt_id"               UUID NOT NULL,
  "purchase_order_line_id"   UUID NOT NULL,
  "product_id"               UUID NOT NULL,
  "product_name_snapshot"    TEXT NOT NULL,
  "rack_id"                  UUID,
  "qty_received"             INTEGER NOT NULL,
  "unit_cost_paise"          INTEGER NOT NULL,

  CONSTRAINT "plywood_goods_receipt_line_pkey" PRIMARY KEY ("id"),
  -- A receipt line records goods that arrived. Zero is not a receipt and a
  -- negative one is a reversal, which is a different document.
  CONSTRAINT "plywood_goods_receipt_line_qty_positive" CHECK ("qty_received" > 0),
  CONSTRAINT "plywood_goods_receipt_line_cost_non_negative" CHECK ("unit_cost_paise" >= 0)
);

CREATE UNIQUE INDEX "plywood_goods_receipt_tenant_id_receipt_number_key"
  ON "plywood_goods_receipt"("tenant_id", "receipt_number");
CREATE UNIQUE INDEX "plywood_goods_receipt_tenant_scoped_id"
  ON "plywood_goods_receipt"("tenant_id", "id");
CREATE INDEX "plywood_goods_receipt_tenant_id_purchase_order_id_idx"
  ON "plywood_goods_receipt"("tenant_id", "purchase_order_id");
CREATE INDEX "plywood_goods_receipt_tenant_id_received_at_idx"
  ON "plywood_goods_receipt"("tenant_id", "received_at");

CREATE UNIQUE INDEX "plywood_goods_receipt_line_tenant_scoped_id"
  ON "plywood_goods_receipt_line"("tenant_id", "id");
CREATE INDEX "plywood_goods_receipt_line_tenant_id_receipt_id_idx"
  ON "plywood_goods_receipt_line"("tenant_id", "receipt_id");

ALTER TABLE "plywood_goods_receipt"
  ADD CONSTRAINT "plywood_goods_receipt_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "plywood_goods_receipt_purchase_order_fkey"
    FOREIGN KEY ("tenant_id", "purchase_order_id") REFERENCES "plywood_purchase_order"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "plywood_goods_receipt_location_fkey"
    FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_goods_receipt_line"
  ADD CONSTRAINT "plywood_goods_receipt_line_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "plywood_goods_receipt_line_receipt_fkey"
    FOREIGN KEY ("tenant_id", "receipt_id") REFERENCES "plywood_goods_receipt"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT "plywood_goods_receipt_line_order_line_fkey"
    FOREIGN KEY ("tenant_id", "purchase_order_line_id") REFERENCES "plywood_purchase_order_line"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "plywood_goods_receipt_line_product_fkey"
    FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "plywood_goods_receipt_line_rack_fkey"
    FOREIGN KEY ("tenant_id", "rack_id") REFERENCES "godown_rack"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- A posted receipt is immutable, for the same reason an invoice is: it is the
-- document a supplier dispute turns on, and a receipt that can be edited after
-- the fact settles no dispute. A short receipt is corrected by receiving the
-- balance later, or by a reversal document — never by changing what arrived.
-- ---------------------------------------------------------------------------

CREATE TRIGGER plywood_goods_receipt_immutable
  BEFORE UPDATE ON "plywood_goods_receipt"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

CREATE TRIGGER plywood_goods_receipt_line_immutable
  BEFORE UPDATE ON "plywood_goods_receipt_line"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

-- ---------------------------------------------------------------------------
-- Source reference on every stock movement (P0-04)
--
-- Nullable: movements recorded before this migration genuinely have no source
-- document, and backfilling a plausible one would be inventing evidence in a
-- ledger whose whole value is that it was not invented.
-- ---------------------------------------------------------------------------

ALTER TABLE "stock_ledger_entry"
  ADD COLUMN "source_type"   TEXT,
  ADD COLUMN "source_id"     UUID,
  ADD COLUMN "source_number" TEXT;

CREATE INDEX "stock_ledger_entry_tenant_id_source_type_source_id_idx"
  ON "stock_ledger_entry"("tenant_id", "source_type", "source_id");

-- A source type without an id, or an id without a type, is a half-recorded
-- fact: the reader cannot follow it and cannot tell that it is broken.
ALTER TABLE "stock_ledger_entry"
  ADD CONSTRAINT "stock_ledger_entry_source_complete"
    CHECK (("source_type" IS NULL) = ("source_id" IS NULL));

-- ---------------------------------------------------------------------------
-- Row-level security, matching every other plywood table.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_goods_receipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_goods_receipt" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_goods_receipt_tenant_isolation ON "plywood_goods_receipt"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "plywood_goods_receipt_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_goods_receipt_line" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_goods_receipt_line_tenant_isolation ON "plywood_goods_receipt_line"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());
