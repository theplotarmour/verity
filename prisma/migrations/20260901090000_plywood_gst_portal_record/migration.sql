-- ---------------------------------------------------------------------------
-- GST portal records — the other half of an ITC reconciliation (slice 18)
--
-- Authority: target user flow §59, §62; taskplans/64_plywood_itc_reconciliation.md.
--
-- §59 asks the accountant to compare the purchase register against the GST
-- portal and work only the differences. That comparison needs two datasets and
-- this system held one. Every bucket §59 names — matched, missing in GST,
-- missing in Verity, amount mismatch, GSTIN mismatch — is a statement about
-- rows that are not ours, so those rows have to exist somewhere.
--
-- THIS TABLE IS NOT A LEDGER. It records what the portal said, as imported,
-- and it is never posted from. No payable, no ledger entry and no credit is
-- derived from a row here: what the business owes is what its suppliers billed
-- it, and the portal is a second opinion used to find disagreements. Treating
-- portal data as a source of truth would let an outside file change this
-- business's books.
--
-- WHAT IS DELIBERATELY NOT STORED. No credentials, no session token and no
-- uploaded file. The import parses to rows and keeps only the fields the
-- comparison needs. A supplier GSTIN is commercially sensitive and is protected
-- the same way every other tenant row is — RLS, forced, on the runtime role.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_gst_portal_record" (
  "id"              UUID NOT NULL,
  "tenant_id"       UUID NOT NULL,
  -- The return period the portal reported this under, e.g. 2026-08.
  "period_key"      TEXT NOT NULL,
  "supplier_gstin"  VARCHAR(15) NOT NULL,
  "supplier_name"   TEXT,
  -- The SUPPLIER's invoice number, which is what the portal keys on. Ours is
  -- a different number and conflating them is how a reconciliation matches
  -- nothing.
  "invoice_number"  TEXT NOT NULL,
  "invoice_date"    TIMESTAMP(3) NOT NULL,
  "taxable_paise"   INTEGER NOT NULL,
  "cgst_paise"      INTEGER NOT NULL DEFAULT 0,
  "sgst_paise"      INTEGER NOT NULL DEFAULT 0,
  "igst_paise"      INTEGER NOT NULL DEFAULT 0,
  "total_paise"     INTEGER NOT NULL,
  "imported_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "imported_by"     UUID NOT NULL,
  -- Where the figures came from, for the person asked about them later.
  "source_ref"      TEXT,

  CONSTRAINT "plywood_gst_portal_record_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plywood_gst_portal_record_period_shape"
    CHECK ("period_key" ~ '^[0-9]{4}-[0-9]{2}$'),
  -- Same shape the application enforces. A malformed GSTIN in portal data is
  -- not a reconciliation finding, it is a bad import, and it must not reach
  -- the comparison and be reported as a supplier's error.
  CONSTRAINT "plywood_gst_portal_record_gstin_shape"
    CHECK ("supplier_gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),
  CONSTRAINT "plywood_gst_portal_record_amounts_nonneg"
    CHECK ("taxable_paise" >= 0 AND "cgst_paise" >= 0 AND "sgst_paise" >= 0
           AND "igst_paise" >= 0 AND "total_paise" >= 0),
  -- The parts must equal the whole, for the same reason a purchase invoice's
  -- must: a row whose components do not add up is a transcription error, and
  -- letting it through produces a mismatch against a supplier who did nothing
  -- wrong.
  CONSTRAINT "plywood_gst_portal_record_totals_agree"
    CHECK ("taxable_paise" + "cgst_paise" + "sgst_paise" + "igst_paise" = "total_paise"),
  -- Intra-state carries CGST+SGST, inter-state carries IGST, never both.
  CONSTRAINT "plywood_gst_portal_record_tax_kind"
    CHECK (NOT ("igst_paise" > 0 AND ("cgst_paise" > 0 OR "sgst_paise" > 0)))
);

-- One row per supplier invoice per period. Re-importing a period replaces its
-- rows rather than doubling them, which is what makes the import safe to repeat
-- when the portal is amended mid-month.
CREATE UNIQUE INDEX "plywood_gst_portal_record_natural_key"
  ON "plywood_gst_portal_record"("tenant_id", "period_key", "supplier_gstin", "invoice_number");
CREATE UNIQUE INDEX "plywood_gst_portal_record_tenant_scoped_id"
  ON "plywood_gst_portal_record"("tenant_id", "id");
CREATE INDEX "plywood_gst_portal_record_tenant_id_period_key_idx"
  ON "plywood_gst_portal_record"("tenant_id", "period_key");

ALTER TABLE "plywood_gst_portal_record"
  ADD CONSTRAINT "plywood_gst_portal_record_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plywood_gst_portal_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_gst_portal_record" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_gst_portal_record_tenant_isolation ON "plywood_gst_portal_record"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- The supplier invoice number on OUR purchase invoice is the join key for the
-- reconciliation, and it lives in custom_fields. Indexed so the comparison does
-- not scan the invoice table once per portal row.
CREATE INDEX "plywood_invoice_supplier_invoice_number_idx"
  ON "plywood_invoice"((("custom_fields" ->> 'supplierInvoiceNumber')))
  WHERE "supplier_id" IS NOT NULL;
