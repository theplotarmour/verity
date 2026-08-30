-- ---------------------------------------------------------------------------
-- Effective-dated tax rules (slice 6)
--
-- Authority: taskplans/45_plywood_workflow_program.md §4.4;
-- PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-07.
--
-- Rates lived in three global configuration keys for the whole business. Two
-- things were wrong and both are the same shape: a plywood sheet and a hardware
-- fitting do not carry the same rate, and a rate changed by notification in
-- November must not restate an invoice raised in October.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_tax_rule" (
  "id"              UUID NOT NULL,
  "tenant_id"       UUID NOT NULL,
  "registration_id" UUID NOT NULL,
  "hsn_code"        TEXT NOT NULL,
  "cgst_rate_bp"    INTEGER NOT NULL DEFAULT 0,
  "sgst_rate_bp"    INTEGER NOT NULL DEFAULT 0,
  "igst_rate_bp"    INTEGER NOT NULL DEFAULT 0,
  "effective_from"  TIMESTAMP(3) NOT NULL,
  "effective_to"    TIMESTAMP(3),
  "authority"       TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"      UUID NOT NULL,

  CONSTRAINT "plywood_tax_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plywood_tax_rule_hsn_shape"
    CHECK ("hsn_code" ~ '^[0-9]{4}([0-9]{2}([0-9]{2})?)?$'),
  CONSTRAINT "plywood_tax_rule_rates_non_negative"
    CHECK ("cgst_rate_bp" >= 0 AND "sgst_rate_bp" >= 0 AND "igst_rate_bp" >= 0),
  -- Intrastate is CGST plus SGST, and they are equal halves of the rate.
  -- Interstate is IGST alone. A rule carrying both is not a rate that exists.
  CONSTRAINT "plywood_tax_rule_pairing"
    CHECK (("igst_rate_bp" = 0) OR ("cgst_rate_bp" = 0 AND "sgst_rate_bp" = 0)),
  CONSTRAINT "plywood_tax_rule_halves_match"
    CHECK ("cgst_rate_bp" = "sgst_rate_bp"),
  CONSTRAINT "plywood_tax_rule_window"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from")
);

CREATE UNIQUE INDEX "plywood_tax_rule_tenant_scoped_id"
  ON "plywood_tax_rule"("tenant_id", "id");
CREATE INDEX "plywood_tax_rule_lookup_idx"
  ON "plywood_tax_rule"("tenant_id", "registration_id", "hsn_code", "effective_from");

-- One rule in force per HSN per registration at any instant. Two overlapping
-- rules mean the tax on an invoice depends on which row the query happened to
-- read first, and the difference surfaces in a filed return.
CREATE UNIQUE INDEX "plywood_tax_rule_one_open_per_hsn"
  ON "plywood_tax_rule"("tenant_id", "registration_id", "hsn_code")
  WHERE "effective_to" IS NULL;

ALTER TABLE "plywood_tax_rule"
  ADD CONSTRAINT "plywood_tax_rule_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "plywood_tax_rule_registration_fkey"
    FOREIGN KEY ("tenant_id", "registration_id") REFERENCES "plywood_gst_registration"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_tax_rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_tax_rule" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_tax_rule_tenant_isolation ON "plywood_tax_rule"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());
